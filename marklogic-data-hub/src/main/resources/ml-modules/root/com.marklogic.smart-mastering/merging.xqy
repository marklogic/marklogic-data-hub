xquery version "1.0-ml";

(:~
 : API to merge documents. Merging is driven by a merge configuration. The
 : merging process works by pulling values from the identified source documents
 : and combining or selecting among them based on the configuration. These
 : values are used to build the new merged document.
 :
 : As part of the merge process, original source documents are archived. This
 : is done by moving them to a different collection.
 :
 : A merged document can be unmerged (rollback-merge). The merged document can
 : either be deleted or retained, based on a parameter to the function.
 :
 : Merge functions are expected to be run against either XML documents or JSON
 : documents, not a mix.
 :
 : This module has the following groups of functions:
 : - merging: merging and unmerging documents
 : - options: manage merge options
 :
 : Merge option configuration is documented here.
 : @see https://marklogic-community.github.io/smart-mastering-core/docs/merging-options/
 :)

module namespace merging = "http://marklogic.com/smart-mastering/merging";

import module namespace impl = "http://marklogic.com/smart-mastering/survivorship/merging"
  at "/com.marklogic.smart-mastering/survivorship/merging/base.xqy",
     "/com.marklogic.smart-mastering/survivorship/merging/options.xqy";
import module namespace const = "http://marklogic.com/smart-mastering/constants"
  at "/com.marklogic.smart-mastering/constants.xqy";

(:~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 : Functions related to merging and unmerging.
 :~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~:)

(:
 : Construct a merged document, but do not save it (preview).
 :
 : @param $uris  the URIs of the documents to be merged
 : @param $merge-options  XML or JSON merge options to control how properties are combined.
 : @return the merged document
 :)
declare function merging:build-merge-models-by-uri(
  $uris as xs:string*,
  $merge-options as item()?
)
{
  impl:build-merge-models-by-uri($uris, $merge-options)
};

(:
 : Construct and store a merged document.
 :
 : @param $uris  the URIs of the documents to be merged
 : @param $merge-options  XML or JSON merge options to control how properties are combined.
 : @return the merged document
 :)
declare function merging:save-merge-models-by-uri(
  $uris as xs:string*,
  $merge-options as item()?
)
{
  impl:save-merge-models-by-uri($uris, $merge-options)
};

(:
 : Unmerge a previously merged document, removing it from the searchable data set and restoring the original documents.
 :
 : @param $merged-doc-uri  the URI of the merged document that will be removed
 :)
declare function merging:rollback-merge(
  $merged-doc-uri as xs:string
) as xs:string*
{
  impl:rollback-merge($merged-doc-uri, fn:true(), fn:true(), ())
};

(:
 : Unmerge a previously merged document, removing it from the searchable data set and restoring the original documents.
 :
 : @param $merged-doc-uri  the URI of the merged document that will be removed
 : @param $retain-rollback-info  if fn:true(), the merged document will be archived and auditing records will be kept.
 :                               If fn:false(), the merged document and auditing records of the merge and unmerge will
 :                               be deleted.
 :)
declare function merging:rollback-merge(
  $merged-doc-uri as xs:string,
  $retain-rollback-info as xs:boolean
) as xs:string*
{
  impl:rollback-merge($merged-doc-uri, $retain-rollback-info, fn:true(), ())
};

(:
 : Unmerge a previously merged document, removing it from the searchable data set and restoring the original documents.
 :
 : @param $merged-doc-uri  the URI of the merged document that will be removed
 : @param $retain-rollback-info  if fn:true(), the merged document will be archived and auditing records will be kept.
 :                               If fn:false(), the merged document and auditing records of the merge and unmerge will
 :                               be deleted.
 : @param $block-future-merges   if fn:true(), future matches between the documents will be blocked.
 :                               If fn:false(), documents that matched prior, will match again on next search
 :)
declare function merging:rollback-merge(
  $merged-doc-uri as xs:string,
  $retain-rollback-info as xs:boolean,
  $block-future-merges as xs:boolean
) as xs:string*
{
  impl:rollback-merge($merged-doc-uri, $retain-rollback-info, $block-future-merges, ())
};

(:
 : Unmerge a previously merged document, removing it from the searchable data set and restoring the original documents.
 :
 : @param $merged-doc-uri  the URI of the merged document that will be removed
 : @param $retain-rollback-info  if fn:true(), the merged document will be archived and auditing records will be kept.
 :                               If fn:false(), the merged document and auditing records of the merge and unmerge will
 :                               be deleted.
 : @param $block-future-merges   if fn:true(), future matches between the documents will be blocked.
 :                               If fn:false(), documents that matched prior, will match again on next search
 : @param $remove-uris   xs:string* of URIs that should be targeted for removal. If an empty sequence, then the last merge transaction is rolled back
 :)
declare function merging:rollback-merge(
  $merged-doc-uri as xs:string,
  $retain-rollback-info as xs:boolean,
  $block-future-merges as xs:boolean,
  $remove-uris as xs:string*
) as xs:string*
{
  impl:rollback-merge($merged-doc-uri, $retain-rollback-info, $block-future-merges, $remove-uris)
};

(:~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 : Functions related to merge options
 :~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~:)

(:
 : Return a list of names under which merge options have been stored.
 :
 : @return a JSON array with the names as strings
 :)
declare function merging:get-option-names()
  as array-node()
{
  impl:get-option-names($const:FORMAT-JSON)
};

(:
 : Return all previously saved merge options.
 :
 : @return An array of JSON options objects.
 :)
declare function merging:get-JSON-options()
{
  impl:get-JSON-options()
};

(:
 : Retrieve a named set of merge options from the DB, stored as JSON, returned as JSON.
 :
 : @param $options-name  the name under which the options were saved
 : @return A JSON object
 :)
declare function merging:get-JSON-options($options-name as xs:string)
{
  impl:get-JSON-options($options-name)
};

(: call from JavaScript as getJsonOptions() :)
declare function merging:get-json-options($options-name as xs:string)
{
  impl:get-JSON-options($options-name)
};

(:
 : Save a set of merging options to the database as JSON.
 : @param $name  the name under which the options are to be stored
 : @param $options  the JSON options.
 : @return ()
 :)
declare function merging:save-JSON-options(
  $name as xs:string,
  $options as node()
) as empty-sequence()
{
  impl:save-JSON-options($name, $options)
};

(:
 : Save a set of merging options to the database.
 : @param $name  the name under which the options are to be stored
 : @param $options  the options, either XML or JSON.
 : @return ()
 :)
declare function merging:save-options(
  $name as xs:string,
  $options as node()
) as empty-sequence()
{
  impl:save-options($name, $options)
};
