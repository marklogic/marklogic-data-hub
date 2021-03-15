/**
 Copyright (c) 2021 MarkLogic Corporation

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */
'use strict';
const Artifacts = require('/data-hub/5/artifacts/core.sjs');
const flowRunner = require("/data-hub/5/flow/flowRunner.sjs");
const httpUtils = require("/data-hub/5/impl/http-utils.sjs");
const hubUtils = require("/data-hub/5/impl/hub-utils.sjs");
const jobsMod = require("/data-hub/5/impl/jobs.sjs");
const StepDefinition = require("/data-hub/5/impl/stepDefinition.sjs");

// define constants for caching expensive operations
const cachedFlows = {};
const defaultGlobalContext = {
  flow : {},
  jobId: '',
  attemptStep: 1,
  lastCompletedStep: 0,
  lastAttemptedStep: 0,
  batchErrors: [],
  failedItems: [],
  completedItems: []
};

class Flow {

  constructor(config = null, globalContext = null, datahub = null) {
    if (!config) {
      config = require("/com.marklogic.hub/config.sjs");
    }
    this.config = config;

    if (!datahub) {
      let DataHub = require("/data-hub/5/datahub.sjs");
      datahub = new DataHub(config);
    }
    this.datahub = datahub;
    this.stepDefinition = new StepDefinition(config, datahub);

    // Starting in 5.5, this is needed for backwards compatibility so that scaffolded modules can still 
    // refer to datahub.flow.flowUtils . 
    this.flowUtils = require("/data-hub/5/impl/flow-utils.sjs");
    
    this.consts = datahub.consts;
    this.writeQueue = [];
    if (globalContext) {
      this.globalContext = globalContext;
    } else {
      this.resetGlobalContext();
    }
  }

  resetGlobalContext() {
    this.globalContext = Object.assign({
      targetDatabase: this.config.FINALDATABASE,
      sourceDatabase: this.config.STAGINGDATABASE
    }, defaultGlobalContext);
    for (let key of Object.getOwnPropertyNames(this.globalContext)) {
      if (Array.isArray(this.globalContext[key])) {
        this.globalContext[key] = [];
      } else if (this.globalContext[key] instanceof Object) {
        this.globalContext[key] = Object.create(this.globalContext[key]);
      }
    }
    this.writeQueue = [];
  }

  getFlowNames() {
    let names = [];
    let query = [cts.directoryQuery("/flows/"), cts.collectionQuery('http://marklogic.com/data-hub/flow')];
    let docs = cts.search(cts.andQuery(query));
    if(docs) {
      for(let doc of docs) {
        let name = doc.xpath('/name');
        if(name) {
          names.push(name);
        }
      }
    }

    return names;
  }

  getFlows(){
    let docs = [];
    let query = cts.directoryQuery("/flows/");
    let uris = cts.uris("", null ,query);
    for (let doc of uris) {
      docs.push(cts.doc(doc).toObject());
    }
    return docs;
  }

  getFlow(name) {
    if (cachedFlows[name] === undefined) {
      cachedFlows[name] = Artifacts.getFullFlow(name);
    }
    return cachedFlows[name];
  }

  setFlow(flowObj){
    this.globalContext.flow = flowObj;
  }

  /**
   * Find records that match a query based on the given inputs. Each matching record is wrapped in a
   * "content descriptor" object that is guaranteed to have at least a "uri" property.
   *
   * @param flowName
   * @param stepNumber
   * @param options
   * @return {*}
   */
  findMatchingContent(flowName, stepNumber, options) {
    // getFlow will throw an error if the flow cannot be found
    const flow = this.getFlow(flowName);

    const flowStep = flow.steps[stepNumber];
    if (!flowStep) {
      httpUtils.throwBadRequest(`Could not find step '${stepNumber}' in flow '${flowName}'`);
    }

    const stepDefinition = this.stepDefinition.getStepDefinitionByNameAndType(flowStep.stepDefinitionName, flowStep.stepDefinitionType);
    if (!stepDefinition) {
      httpUtils.throwBadRequest(`Could not find a step definition with name '${flowStep.stepDefinitionName}' and type '${flowStep.stepDefinitionType}' for step '${stepNumber}' in flow '${flowName}'`);
    }

    const combinedOptions = Object.assign({}, stepDefinition.options || {}, flow.options || {}, flowStep.options || {}, options);

    let query;
    let uris = null;
    if (options.uris) {
      uris = hubUtils.normalizeToArray(options.uris);

      if (options.excludeAlreadyProcessed === true || options.excludeAlreadyProcessed === "true") {
        const stepId = flowStep.stepId ? flowStep.stepId : flowStep.name + "-" + flowStep.stepDefinitionType;
        const filteredItems = this.filterItemsAlreadyProcessedByStep(uris, flowName, stepId);
        if (filteredItems.length != uris.length) {
          xdmp.trace(datahub.consts.TRACE_FLOW_RUNNER, 'excludeAlreadyProcessed filtered out some items; previous count: ' + uris.length + '; new count: ' + filteredItems.length);
        }
        uris = filteredItems;
      }

      if (options.sourceQueryIsScript) {
        // When the source query is a script, map each item to a content object with the "uri" property containing the item value
        return uris.map(uri => {return {uri}});
      }
      query = cts.documentQuery(uris);
    } else {
      let sourceQuery = combinedOptions.sourceQuery || flow.sourceQuery;
      query = sourceQuery ? xdmp.eval(sourceQuery) : null;
    }

    let sourceDatabase = combinedOptions.sourceDatabase || this.globalContext.sourceDatabase;
    return hubUtils.queryToContentDescriptorArray(query, combinedOptions, sourceDatabase);
  }

  /**
   * Filters out each item from the items array that was already processed by the given flowName and stepId.
   * The determination is based on Batch documents in the jobs database.
   *
   * @param items the array of items to process; this is referred to as "uris" outside the context of this function,
   * but since these values are not necessarily URIs starting in 5.3.0, the term "items" is used here instead
   * @param flowName
   * @param stepId
   * @returns an array of items that should still be processed
   */
  filterItemsAlreadyProcessedByStep(items, flowName, stepId) {
    // TODO This duplicates knowledge of hash construction with jobs.sjs. Will clean this up in 5.5 when we can create
    // a better "utils" library that is not a class with a bunch of public functions.
    const prefix = flowName + "|" + fn.lowerCase(stepId) + "|finished|";

    // A map is used in this script to avoid N calls to array.includes
    const script = "var items; var prefix; " +
      "const itemHashes = items.map(item => xdmp.hash64(prefix + item)); " +
      "const processedItemHashesMap = cts.values(cts.jsonPropertyReference('processedItemHashes'), null, ['map'], cts.andQuery([" +
      "  cts.collectionQuery('Batch'), " +
      "  cts.jsonPropertyRangeQuery('processedItemHashes', '=', itemHashes)" +
      "])); " +
      "items.filter(item => !processedItemHashesMap[xdmp.hash64(prefix + item)]);";

    // xdmp.invokeFunction returns nothing, so using xdmp.eval
    return fn.head(xdmp.eval(script,
      {items, prefix},
      {database: xdmp.database(this.config.JOBDATABASE)}
    ));
  }

  /**
   * It's unlikely that this actually runs a "flow", unless the flow consists of one step and only one transaction is
   * needed to run the step. More likely, this is really "process a batch of items for a step".
   *
   * @param flowName Required name of the flow to run
   * @param jobId Required ID of the job associated with the execution of the given step and flow
   * @param content Array of content "descriptors", where each descriptor is expected to at least have a "uri" property.
   * The value of the "uri" property is not necessarily a URI; if sourceQueryIsScript is true for the step, then
   * the value of the "uri" property can be any string.
   * @param options Optional map of options that are used to override the flow and step configuration
   * @param stepNumber The number of the step within the given flow to run
   */
  runFlow(flowName, jobId, content = [], options, stepNumber) {
    let items = content.map((contentItem) => contentItem.uri);

    let flow = this.getFlow(flowName);
    if(!flow) {
      this.datahub.debug.log({message: 'The flow with the name '+flowName+' could not be found.', type: 'error'});
      throw Error('The flow with the name '+flowName+' could not be found.')
    }
    this.globalContext.flow = flow;

    let jobDoc = this.datahub.jobs.getJobDocWithId(jobId);
    if(!(jobDoc || options.disableJobOutput)) {
      jobDoc = this.datahub.jobs.createJob(flowName, jobId);
    }
    if (jobDoc) {
      if (jobDoc.job) {
        jobDoc = jobDoc.job;
      }
      //set the jobid in the context based on the jobdoc response
      this.globalContext.jobId = jobDoc.jobId;
      this.globalContext.lastCompletedStep = jobDoc.lastCompletedStep;
      this.globalContext.lastAttemptedStep = jobDoc.lastAttemptedStep;
    }

    //grab the step, or the first if its null/not set
    if(!stepNumber) {
      stepNumber = 1;
    }

    //set the context for the attempted step
    this.globalContext.attemptStep = stepNumber;

    const flowStep = this.globalContext.flow.steps[stepNumber];
    if(!flowStep) {
      this.datahub.debug.log({message: 'Step '+stepNumber+' for the flow: '+flowName+' could not be found.', type: 'error'});
      throw Error('Step '+stepNumber+' for the flow: '+flowName+' could not be found.');
    }
    const stepDefinition = this.stepDefinition.getStepDefinitionByNameAndType(flowStep.stepDefinitionName, flowStep.stepDefinitionType);

    //here we consolidate options and override in order of priority: runtime flow options, step defined options, process defined options
    let combinedOptions = Object.assign({}, stepDefinition.options, flow.options, flowStep.options, options);
    // set provenance granularity based off of combined options
    this.datahub.prov.granularityLevel(combinedOptions.provenanceGranularityLevel);

    this.globalContext.targetDatabase = combinedOptions.targetDatabase || this.globalContext.targetDatabase;
    this.globalContext.sourceDatabase = combinedOptions.sourceDatabase || this.globalContext.sourceDatabase;

    if (!(combinedOptions.noBatchWrite || combinedOptions.disableJobOutput)) {
      const flowStepWithOptions = Object.assign(
        {},
        flowStep,
        {"options": Object.assign({}, flowStep.options, combinedOptions)}
      );
      let batchDoc = this.datahub.jobs.createBatch(jobDoc, flowStepWithOptions, stepNumber);
      this.globalContext.batchId = batchDoc.batch.batchId;
    }

    if (this.datahub.flow) {
      //clone and remove flow to avoid circular references
      this.datahub = this.cloneInstance(this.datahub);
      delete this.datahub.flow;
    }

    if (this.isContextDB(this.globalContext.sourceDatabase) && !combinedOptions.stepUpdate) {
      this.runStep(items, content, combinedOptions, flowName, stepNumber, flowStep);
    } else {
      const flowInstance = this;
      xdmp.invoke(
        '/data-hub/5/impl/invoke-step.sjs',
        {flowInstance, items, content, combinedOptions, flowName, flowStep, stepNumber},
        {
          database: this.globalContext.sourceDatabase ? xdmp.database(this.globalContext.sourceDatabase) : xdmp.database(),
          update: combinedOptions.stepUpdate ? 'true': 'false',
          commit: 'auto',
          ignoreAmps: true
        }
      );
    }

    let writeTransactionInfo = {};
    //let's update our jobdoc now
    if (!combinedOptions.noWrite) {
      try {
        // combine all collections
        const collections = [
          options.collections,
          ((flowStep.options || {}).collections || (stepDefinition.options || {}).collections),
          (flow.options || {}).collections
        ].reduce((previousValue, currentValue) => (previousValue || []).concat((currentValue || [])))
          // filter out any null/empty collections that may exist
          .filter((col) => !!col);

        writeTransactionInfo = hubUtils.writeDocuments(this.writeQueue, xdmp.defaultPermissions(), collections, this.globalContext.targetDatabase);
      } catch (e) {
        this.handleWriteError(this, e);
      }
    }

    this.writeProvenanceData(jobId, flowName, stepDefinition, flowStep);
    this.updateBatchDocument(flowName, flowStep, combinedOptions, items, writeTransactionInfo);

    let resp = {
      "jobId": this.globalContext.jobId,
      // using failed/completed items length instead of content length since a step can create more or less documents than were passed to the step
      "totalCount": this.globalContext.failedItems.length + this.globalContext.completedItems.length,
      "errorCount": this.globalContext.failedItems.length,
      "completedItems": this.globalContext.completedItems,
      "failedItems": this.globalContext.failedItems,
      "errors": this.globalContext.batchErrors
    };
    if (combinedOptions.fullOutput) {
      resp.documents = this.writeQueue;
    }
    if (this.datahub.performance.performanceMetricsOn()) {
      resp.performanceMetrics = this.datahub.performance.stepMetrics;
    }
    this.resetGlobalContext();
    return resp;
  }

  /**
   * @param items the batch of items being processed by the current transaction for the given flow and step. Will be a
   * set of URIs, unless sourceQueryIsScript is set to true for the step, in which case the items can be any set
   * of strings.
   * @param content
   * @param combinedOptions
   * @param flowName
   * @param stepNumber
   * @param flowStep
   */
  runStep(items, content, combinedOptions, flowName, stepNumber, flowStep) {
    let flowInstance = this;
    let processor = flowInstance.stepDefinition.getStepProcessor(flowInstance, flowStep.stepDefinitionName, flowStep.stepDefinitionType);
    if (!(processor && processor.run)) {
      let errorMsq = `Could not find main() function for process ${flowStep.stepDefinitionType}/${flowStep.stepDefinitionName} for step # ${stepNumber} for the flow: ${flowName} could not be found.`;
      flowInstance.datahub.debug.log({message: errorMsq, type: 'error'});
      throw Error(errorMsq);
    }

    let hookOperation = function () {};
    let hook = flowStep.customHook;
    if (!hook || !hook.module) {
      hook = processor.customHook;
    }
    if (hook && hook.module) {
      // Include all of the step context in the parameters for the custom hook to make use of
      let parameters = Object.assign({uris: items, content, options: combinedOptions, flowName, stepNumber, step: flowStep}, hook.parameters);
      hookOperation = function () {
        flowInstance.invokeCustomHook(
          hook.module,
          parameters,
          hook.user || xdmp.getCurrentUser(),
          hook.database || (hook.runBefore ? flowInstance.globalContext.sourceDatabase : flowInstance.globalContext.targetDatabase)
        );
      }
    }
    if (hook && hook.runBefore) {
      hookOperation();
    }

    let contentArray = [];

    if (combinedOptions.acceptsBatch) {
      try {
        const results = hubUtils.normalizeToSequence(flowInstance.runMain(hubUtils.normalizeToSequence(content), combinedOptions, processor.run));
        for (const result of results) {
          content.previousUri = this.globalContext.uri;
          flowRunner.addMetadataToContent(result, flowName, flowStep.name, this.globalContext.jobId);
          contentArray.push(result);
        }
        flowInstance.globalContext.completedItems = flowInstance.globalContext.completedItems.concat(items);
      } catch (e) {
        this.handleStepError(flowInstance, e, items);
      }
    } else {
      for (let contentItem of content) {
        flowInstance.globalContext.uri = contentItem.uri;
        try {
          const results = hubUtils.normalizeToSequence(flowInstance.runMain(contentItem, combinedOptions, processor.run));
          for (const result of results) {
            flowRunner.addMetadataToContent(result, flowName, flowStep.name, this.globalContext.jobId);
            contentArray.push(result);
          }
          flowInstance.globalContext.completedItems.push(flowInstance.globalContext.uri);
        } catch (e) {
          this.handleStepError(flowInstance, e);
        }
        flowInstance.globalContext.uri = null;
      }
    }
    flowInstance.globalContext.uri = null;

    let stepInterceptorFailed = false;
    try {
      this.applyInterceptorsBeforeContentPersisted(flowStep, contentArray, combinedOptions);
    } catch (e) {
      // If an interceptor throws an error, we don't know if it was specific to a particular item or not. So we assume that
      // all items failed; this is analogous to the behavior of acceptsBatch=true
      flowInstance.globalContext.completedItems = [];
      stepInterceptorFailed = true;
      this.handleStepError(flowInstance, e, items);
    }

    // Assumption is that if an interceptor failed, none of the content objects processed by the step module should be written
    if (!stepInterceptorFailed) {
      contentArray.forEach(contentObject => {
        if (contentObject.uri) {
          this.writeQueue.push(contentObject);
        } else {
          this.datahub.debug.log({ type: 'error', message: `Couldn't add '${xdmp.toJsonString(contentObject)}' to the write queue due to missing uri.`});
        }
      });
    }

    if (hook && !hook.runBefore) {
      hookOperation();
    }
  }

  invokeCustomHook(moduleUri, parameters, user = null, database) {
    let options = this.buildCustomHookInvokeOptions(user, database);
    xdmp.invoke(moduleUri, parameters, options)
  }

  buildCustomHookInvokeOptions(user = null, database) {
    let options = {
      ignoreAmps: true
    };
    if (user && user !== xdmp.getCurrentUser()) {
      options.userId = xdmp.user(user);
    }
    if (database) {
      options.database = xdmp.database(database);
    }
    return options;
  }

  cloneInstance(instance) {
    let prototype = Object.getPrototypeOf(instance);
    let keys = Object.getOwnPropertyNames(instance).concat(Object.getOwnPropertyNames(prototype));
    let newInstance = {};
    for (let key of keys) {
      newInstance[key] = instance[key];
    }
    return newInstance;
  }

  /**
   * Applies interceptors to the given content array. Interceptors can make any changes they wish to the items in the
   * content array, including adding and removing items, but the array itself cannot be changed - i.e. an interceptor may
   * not return a new instance of an array.
   *
   * @param flowStep
   * @param contentArray
   * @param combinedOptions
   */
  applyInterceptorsBeforeContentPersisted(flowStep, contentArray, combinedOptions) {
    if (flowStep.interceptors) {
      flowStep.interceptors.filter((interceptor => "beforeContentPersisted" == interceptor.when)).forEach(interceptor => {
        const vars = Object.assign({}, interceptor.vars);
        vars.contentArray = contentArray;
        vars.options = combinedOptions;
        xdmp.invoke(interceptor.path, vars);
      });
    }
  }

  handleStepError(flowInstance, error, items) {
    flowInstance.addBatchError(flowInstance, error, flowInstance.globalContext.uri);
    if (!flowInstance.globalContext.uri && items) {
      flowInstance.globalContext.failedItems = flowInstance.globalContext.failedItems.concat(items);
    } else if (flowInstance.globalContext.uri) {
      flowInstance.globalContext.failedItems.push(flowInstance.globalContext.uri);
    }
    flowInstance.datahub.debug.log({message: `Error running step: ${error.toString()}. ${error.stack}`, type: 'error'});
  }

  handleWriteError(flowInstance, error) {
    flowInstance.globalContext.completedItems = [];
    flowInstance.globalContext.failedItems = flowInstance.writeQueue.map((contentObj) => contentObj.uri);
    const operation = error.stackFrames && error.stackFrames[0] && error.stackFrames[0].operation;
    let uri;
    // see if we can determine a uri based off the operation in the stackFrames
    if (operation) {
      uri = flowInstance.globalContext.failedItems.find((uri) => operation.includes(`"${uri}"`));
    }
    flowInstance.addBatchError(flowInstance, error, uri);
  }

  addBatchError(flowInstance, error, uri = flowInstance.globalContext.uri) {
    flowInstance.globalContext.batchErrors.push({
      "stack": error.stack,
      "code": error.code,
      "data": error.data,
      "message": error.message,
      "name": error.name,
      "retryable": error.retryable,
      "stackFrames": error.stackFrames,
      "uri": uri
    });
  }

  /**
   * Updates the batch document based on what's in the globalContext. This doesn't care about interceptors at all,
   * as those don't have any impact on the "items" that were the input to this transaction.
   *
   * @param flowName
   * @param flowStep
   * @param combinedOptions
   * @param items
   * @param writeTransactionInfo
   */
  updateBatchDocument(flowName, flowStep, combinedOptions = {}, items, writeTransactionInfo) {
    if (!combinedOptions.noBatchWrite && !combinedOptions.disableJobOutput) {
      let batchStatus = "finished";
      if (this.globalContext.failedItems.length) {
        batchStatus = this.globalContext.completedItems.length ? "finished_with_errors" : "failed";
      }
      jobsMod.updateBatch(
        this.datahub, this.globalContext.jobId, this.globalContext.batchId, flowName, flowStep, batchStatus, items,
        writeTransactionInfo, this.globalContext.batchErrors[0], combinedOptions
      );
    }
  }

  /**
   * Writes provenance data based on what's in the writeQueue.
   *
   * @param jobId
   * @param flowName
   * @param stepDefinition
   * @param flowStep
   */
  writeProvenanceData(jobId, flowName, stepDefinition, flowStep) {
    const prov = this.datahub.prov;
    if (this.globalContext.completedItems.length && prov.granularityLevel() !== prov.OFF_LEVEL) {
      const stepDefTypeLowerCase = (stepDefinition.type) ? stepDefinition.type.toLowerCase(): stepDefinition.type;
      const stepName = flowStep.name || flowStep.stepDefinitionName;

      for (let content of this.writeQueue) {
        // We may want to hide some documents from provenance. e.g., we don't need provenance of mastering PROV documents
        if (content.provenance !== false) {
          const previousUris = hubUtils.normalizeToArray(content.previousUri || content.uri);
          const info = {
            derivedFrom: previousUris,
            influencedBy: stepName,
            status: (stepDefTypeLowerCase === 'ingestion') ? 'created' : 'updated',
            metadata: {}
          };

          const isFineGranularity = prov.granularityLevel() === prov.FINE_LEVEL;
          const isMappingStep = flowStep.stepDefinitionName === "entity-services-mapping";

          if (isFineGranularity && isMappingStep) {
            xdmp.trace(this.datahub.consts.TRACE_FLOW_RUNNER, `'provenanceGranularityLevel' for step '${flowStep.name}' is set to 'fine'. This is not supported for mapping steps. Coarse provenance data will be generated instead.`);
          }

          const provResult = isFineGranularity && !isMappingStep && content.provenance ?
            this.buildFineProvenanceData(jobId, flowName, stepName, flowStep.stepDefinitionName, stepDefTypeLowerCase, content, info) :
            prov.createStepRecord(jobId, flowName, stepName, flowStep.stepDefinitionName, stepDefTypeLowerCase, content.uri, info);

          if (provResult instanceof Error) {
            this.datahub.debug.log({message: provResult.message, type: 'error'});
          }
        }
      }
      this.datahub.prov.commit();
    }
  }

  buildFineProvenanceData(jobId, flowName, stepName, stepDefName, stepDefType, content, info) {
    let previousUris = fn.distinctValues(Sequence.from([Sequence.from(Object.keys(content.provenance)),Sequence.from(info.derivedFrom)]));
    let prov = this.datahub.prov;
    let newDocURI = content.uri;
    let docProvIDs = [];
    // setup variables to group prov info by properties
    let docProvPropertyIDsByProperty = {};
    let docProvPropertyMetadataByProperty = {};
    let docProvDocumentIDsByProperty = {};
    for (let prevUri of previousUris) {
      let docProvenance = content.provenance[prevUri];
      if (docProvenance) {
        let docProperties = Object.keys(docProvenance);
        let docPropRecords = prov.createStepPropertyRecords(jobId, flowName, stepName, stepDefName, stepDefType, prevUri, docProperties, info);
        let docProvID = docPropRecords[0];
        docProvIDs.push(docProvID);
        let docProvPropertyIDKeyVals = docPropRecords[1];
        // accumulating changes here, since merges can have multiple docs with input per property.
        for (let origProp of Object.keys(docProvPropertyIDKeyVals)) {
          let propDetails = docProvenance[origProp];
          let prop = propDetails.type || propDetails.destination;

          docProvPropertyMetadataByProperty[prop] = docProvPropertyMetadataByProperty[prop] || {};
          const propMetadata = docProvPropertyMetadataByProperty[prop];
          for (const propDetailsKey of Object.keys(propDetails)) {
            if (propDetails.hasOwnProperty(propDetailsKey) && propDetails[propDetailsKey]) {
              propMetadata[propDetailsKey] = propMetadata[propDetailsKey] || [];
              propMetadata[propDetailsKey] = propMetadata[propDetailsKey].concat(hubUtils.normalizeToArray(propDetails[propDetailsKey]));
            }
          }
          docProvPropertyIDsByProperty[prop] = docProvPropertyIDsByProperty[prop] || [];
          docProvPropertyIDsByProperty[prop].push(docProvPropertyIDKeyVals[origProp]);
          docProvDocumentIDsByProperty[prop] = docProvDocumentIDsByProperty[prop] || [];
          docProvDocumentIDsByProperty[prop].push(docProvID);
        }
      }
    }

    let newPropertyProvIDs = [];
    for (let prop of Object.keys(docProvPropertyIDsByProperty)) {
      let docProvDocumentIDs = docProvDocumentIDsByProperty[prop];
      let docProvPropertyIDs = docProvPropertyIDsByProperty[prop];
      let docProvPropertyMetadata = docProvPropertyMetadataByProperty[prop];
      for (const propDetailsKey of Object.keys(docProvPropertyMetadata)) {
        if (docProvPropertyMetadata.hasOwnProperty(propDetailsKey)) {
          let dedupedMeta = Sequence.from(docProvPropertyMetadata[propDetailsKey]);
          docProvPropertyMetadata[propDetailsKey] = fn.count(dedupedMeta) <= 1 ? fn.string(fn.head(dedupedMeta)) : dedupedMeta.toArray();
          if (!(typeof docProvPropertyMetadata[propDetailsKey] === 'string' || docProvPropertyMetadata[propDetailsKey] instanceof xs.string)) {
            docProvPropertyMetadata[propDetailsKey] = xdmp.toJsonString(docProvPropertyMetadata[propDetailsKey]);
          }
        }
      }
      let propInfo = Object.assign({}, info, { metadata: docProvPropertyMetadata });
      let newPropertyProvID = prov.createStepPropertyAlterationRecord(jobId, flowName, stepName, stepDefName, stepDefType, prop, docProvDocumentIDs, docProvPropertyIDs, propInfo);
      newPropertyProvIDs.push(newPropertyProvID);
    }
    // Now create the merged document record from both the original document records & the merged property records
    return prov.createStepDocumentAlterationRecord(jobId, flowName, stepName, stepDefName, stepDefType, newDocURI, docProvIDs, newPropertyProvIDs, info);
  }

  isContextDB(databaseName) {
    return !databaseName || fn.string(xdmp.database()) === fn.string(xdmp.database(databaseName));
  }

  runMain(content, options, func) {
    let resp;
    resp = func(content, options);
    return resp;
  };
}

module.exports = Flow;
