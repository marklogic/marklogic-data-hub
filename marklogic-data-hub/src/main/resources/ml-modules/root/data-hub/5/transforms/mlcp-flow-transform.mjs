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

import DataHubSingleton from "/data-hub/5/datahub-singleton.mjs";
import consts from "/data-hub/5/impl/consts.mjs";
import flowApi from "/data-hub/public/flow/flow-api.mjs";
import httpUtils from "/data-hub/5/impl/http-utils.mjs";
import hubUtils from "/data-hub/5/impl/hub-utils.mjs";

const emptySequence = Sequence.from([]);
const datahub = DataHubSingleton.instance();

const urisInBatch = [];
for (let requestField of xdmp.getRequestFieldNames()) {
  let fieldValue = xdmp.getRequestField(requestField);
  if (fieldValue === "URI") {
    urisInBatch.push(xdmp.getRequestField(fn.replace(requestField, "^evl", "evv")));
  }
}
const visitedURIs = new Set();
const urisToContent = new Map();

export function transform(content, context = {}) {
  const contentUri = content.uri;
  urisToContent.set(contentUri, content);
  visitedURIs.add(contentUri);

  if (urisInBatch.every((uri) => visitedURIs.has(uri))) {
    let params = {};
    let optionsString = null;
    let parsedTransformParam;
    let transformString = context.transform_param ? context.transform_param : '';
    let pattern = '^.*(options={.*}).*$';
    let match = new RegExp(pattern).exec(transformString);
    if (match === null) {
      parsedTransformParam = transformString;
    } else {
      optionsString = match[1];
      parsedTransformParam = transformString.replace(optionsString, '');
    }

    let splits = parsedTransformParam.split(',');
    for (let i in splits) {
      let pair = splits[i];
      let parts = pair.split('=');
      params[parts[0]] = parts[1];
    }

    const flowName = params['flow-name'] ? xdmp.urlDecode(params['flow-name']) : "default-ingestion";
    if (flowName === 'default-ingestion') {
      context.collections = context.collections || [];
      if (!context.collections.includes('default-ingestion')) {
        context.collections.push('default-ingestion');
      }
    }

    const jobId = params["job-id"] || `mlcp-${xdmp.transaction()}`;

    const options = optionsString ? parseOptionsString(optionsString, contentUri) : {};
    options.sourceName = params["sourceName"];
    options.sourceType = params["sourceType"];

    const contentArray = buildContentArray(context);

    // Have to tokenize on ";" since the transform param value already tokenizes on ","
    const stepNumbers = params.steps ? params.steps.split(";") : null;

    if (stepNumbers) {
      options.throwStepError = true; // Let errors propagate to MLCP
      flowApi.runFlowOnContent(flowName, contentArray, jobId, options, stepNumbers);
      return emptySequence;
    } else {
      // It would be possible to always use the above approach, thus removing all the code below. The only issue
      // is that instead of getting a useless Job document that is 'started' with no step responses, we instead get a
      // finished Job document, but it only represents one batch. It's hard to say that's an improvement, so leaving the
      // below code in place for now.

      const step = params['step'] ? xdmp.urlDecode(params['step']) : null;
      options.writeStepOutput = false;
      options.fullOutput = true;
      // This maps to the ResponseHolder Java class; it's not a RunFlowResponse or RunStepResponse
      const responseHolder = datahub.flow.runFlow(flowName, jobId, contentArray, options, step);

      // If the flow response has an error, propagate it up to MLCP so MLCP can report it
      if (responseHolder.errors && responseHolder.errors.length) {
        httpUtils.throwBadRequestWithArray([`Flow failed with error: ${responseHolder.errors[0].stack}`, contentUri]);
      }

      const contentDocuments = responseHolder.documents;
      if (contentDocuments && contentDocuments.length) {
        Object.assign(context, contentDocuments[0].context);
        for (let doc of contentDocuments) {
          delete doc.context;
          if (!doc.value) {
            httpUtils.throwNotFoundWithArray([`No content.value defined for URI: ${doc.uri}`, doc.uri]);
          }
        }
        return Sequence.from(contentDocuments);
      }
    }
  }
  return emptySequence;
}

function buildContentArray(context) {
  const contentArray = [];
  const urisToContentEntries = urisToContent.entries();
  for (const entry of urisToContentEntries) {
    let content = entry[1];
    if (content.value) {
      content.context = context;
      contentArray.push(content);
    }
  }
  return contentArray;
}

function parseOptionsString(optionsString, contentUri) {
  let tokens = optionsString.split("=");
  if (tokens.length < 2) {
    // Using console.log so this always appears
    xdmp.log("Unable to parse JSON options; expecting options={json object}; found: " + optionsString);
    return {};
  }
  try {
    const options = JSON.parse(optionsString.split("=")[1]);
    hubUtils.hubTrace(consts.TRACE_FLOW, `Parsed options into JSON object: ${xdmp.toJsonString(options)}`);
    return options;
  } catch (e) {
    httpUtils.throwBadRequestWithArray([`Could not parse JSON options; cause: ${e.message}`, contentUri]);
  }
}

export default {transform};