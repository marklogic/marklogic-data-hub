xquery version "1.0-ml";

(:
 : Test the custom sjs action feature.
 :)

import module namespace const = "http://marklogic.com/smart-mastering/constants"
  at "/com.marklogic.smart-mastering/constants.xqy";
import module namespace merging = "http://marklogic.com/smart-mastering/merging"
  at "/com.marklogic.smart-mastering/merging.xqy";
import module namespace process = "http://marklogic.com/smart-mastering/process-records"
  at "/com.marklogic.smart-mastering/process-records.xqy";


import module namespace test = "http://marklogic.com/test" at "/test/test-helper.xqy";
import module namespace lib = "http://marklogic.com/smart-mastering/test" at "lib/lib.xqy";

declare namespace es = "http://marklogic.com/entity-services";
declare namespace sm = "http://marklogic.com/smart-mastering";

declare option xdmp:update "false";

declare option xdmp:mapping "false";

declare variable $options := merging:get-options($lib:OPTIONS-NAME-CUST-ACTION-SJS-MERGE, $const:FORMAT-XML);

declare variable $expected-options :=
  object-node {
    "options": object-node{
      "matchOptions": "custom-sjs-action-match-options",
      "propertyDefs": object-node {
        "properties": array-node {
          object-node {
          "namespace": "",
          "localname": "IdentificationID",
          "name": "ssn"
          },
          object-node {
            "namespace": "",
            "localname": "PersonName",
            "name": "name"
          },
          object-node {
            "namespace": "",
            "localname": "Address",
            "name": "address"
          }
        }
      },
      "merging": array-node {
        object-node {
          "propertyName": "ssn",
          "sourceRef": object-node {
            "documentUri": "docA"
          }
        },
        object-node {
          "propertyName": "name",
          "maxValues": "1",
          "doubleMetaphone": object-node {
            "distanceThreshold": "50"
          },
          "synonymsSupport": "true",
          "thesaurus": "/mdm/config/thesauri/first-name-synonyms.xml",
          "length": object-node {
            "weight": "8"
          }
        },
        object-node {
          "propertyName": "address",
          "maxValues": "1",
          "length": object-node {
            "weight":"8"
          },
          "doubleMetaphone": object-node {
            "distanceThreshold": "50"
          }
        }
      }
    }
  };

declare function local:run-case($uri, $expected)
{
  let $merged-doc :=
    xdmp:invoke-function(
      function() {
        process:process-match-and-merge($uri, $lib:OPTIONS-NAME-CUST-ACTION-SJS-MERGE)
      },
      $lib:INVOKE_OPTIONS
    )
  let $actual :=
    xdmp:invoke-function(function() {
      let $actual := fn:doc("/sjs-action-output.json")/object-node()
      return
        $actual
    }, $lib:INVOKE_OPTIONS)
  return
    test:assert-equal-json($expected, $actual)

};

(: Pre-condition: the output file that will be generated by the action should not already exist :)
test:assert-false(xdmp:invoke-function(function() {
  fn:doc-available("/sjs-action-output.json")
}, $lib:INVOKE_OPTIONS)),

local:run-case(
  "/source/1/doc1.xml",
    object-node {
      "uri": "/source/1/doc1.xml",
      "matches": array-node {
        object-node {
          "uri": "/source/2/doc2.xml",
          "score": 70,
          "threshold": "Kinda Match"
        }

      },
      "options": $expected-options
    }

),

local:run-case(
  "/source/2/doc2.xml",
    object-node {
      "uri": "/source/2/doc2.xml",
      "matches": array-node {
        object-node {
          "uri": "/source/1/doc1.xml",
          "score": 70,
          "threshold": "Kinda Match"
        }

      },
      "options": $expected-options
    }

)
