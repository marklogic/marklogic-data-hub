declareUpdate();

const hubTest = require("/test/data-hub-test-helper.sjs");
const hubTestX = require("/test/data-hub-test-helper.xqy");
const test = require("/test/test-helper.xqy");
hubTestX.resetHub();
hubTestX.loadNonEntities(test.__CALLER_FILE__);

hubTest.createSimpleMappingProject( [
  {
    "name":"undefinedFunctionMapping",
    "properties":
    {
      "customerId": {"sourcedFrom": "parseDate('xyz')"},
      "name": {"sourcedFrom": "unavailableFunction()"}
    }
  }
]
);
