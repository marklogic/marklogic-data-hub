import lib from "/test/suites/data-hub/5/mapping/mapping-errors/lib/lib.mjs";

const test = require("/test/test-helper.xqy");
let assertions = [];

const runMappingOutput = lib.runMappingStep("cannotComputeMapping", 3);
const testMappingOutput = lib.validateAndTestMapping("cannotComputeMapping");

assertions = assertions.concat([
  test.assertEqual("Cannot compute. Cause: The provided argument(s) for a mapping expression include invalid values."
    , testMappingOutput.properties.customerId.errorMessage),

  test.assertEqual("Cannot compute. Cause: The provided argument(s) for a mapping expression include invalid values."
    , runMappingOutput.errors[0].message),
  test.assertEqual("/content/customer.json", runMappingOutput.failedItems[0]),
]);

assertions;
