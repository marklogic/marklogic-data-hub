import hubTest from "/test/data-hub-test-helper.mjs";

xdmp.invokeFunction(() => {
  const hubTestX = require("/test/data-hub-test-helper.xqy");
  const test = require("/test/test-helper.xqy");

  hubTestX.resetHub();
  hubTestX.loadNonEntities(test.__CALLER_FILE__);

  hubTest.createSimpleMappingProject([
    {
      "mappingParametersModulePath": "/test/suites/data-hub/5/mapping/user-parameters/test-data/user-params.mjs",
      "properties": {
        "customerId": {
          "sourcedFrom": "customerId"
        },
        "name": {
          "sourcedFrom": "lookup(nameKey, $NAMES)"
        },
        "status": {
          "sourcedFrom": "lookup(statusKey, $STATUSES)"
        }
      }
    },
    {
      "sourceDatabase": "data-hub-FINAL",
      "testNote": "sourceDatabase is set so that a 'clean' error is thrown instead of one via xdmp.invokeFunction",
      "mappingParametersModulePath": "/test/suites/data-hub/5/mapping/user-parameters/test-data/bad-get-parameter-values.mjs",
    }
  ]);
}, { update: "true" });
