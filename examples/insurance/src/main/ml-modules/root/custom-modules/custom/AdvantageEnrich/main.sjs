/*
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
const mjsProxy = require("/data-hub/core/util/mjsProxy.sjs");
const DataHub = mjsProxy.requireMjsModule("/data-hub/5/datahub.mjs");
const datahub = new DataHub();
// Require module for mapping latitude and longitude from zip codes
const zipcodeData = require("/custom-modules/utils/zipcodeData.sjs");

const flowUtils = mjsProxy.requireMjsModule("/data-hub/5/impl/flow-utils.mjs");

function main(content, options) {

  let outputFormat = options.outputFormat ? options.outputFormat.toLowerCase() : datahub.flow.consts.DEFAULT_FORMAT;
  let doc = content.value;

  if (doc && (doc instanceof Document || doc instanceof XMLDocument)) {
    doc = fn.head(doc.root);
  }

  let instance = flowUtils.getInstance(doc).toObject() || {};
  let triples = flowUtils.getTriples(doc) || [];
  let headers = flowUtils.getHeaders(doc) || {};

  instance['$attachments'] = doc.toObject().envelope.instance;

  //adding code to enrich Customer data with geospatial properties

  if (instance["Postal"]) {
    let zipcode =  instance["Postal"].substring(0, 5);
    instance["latitude"] = zipcodeData.getLatitude(zipcode);
    instance["longitude"] = zipcodeData.getLongitude(zipcode);
  }

  //form our envelope here now, specifying our output format
  let envelope = flowUtils.makeEnvelope(instance, headers, triples, outputFormat);

  //assign our envelope value
  content.value = envelope;

  //assign the uri we want
  content.uri = '/enriched'+content.uri;

  //now let's return out our content to be written
  return content;
}

module.exports = {
  main: main
};
