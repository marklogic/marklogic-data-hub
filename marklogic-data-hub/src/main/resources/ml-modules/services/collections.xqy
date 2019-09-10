xquery version "1.0-ml";
module namespace ml-collections = "http://marklogic.com/rest-api/resource/ml:collections";

import module namespace extut = "http://marklogic.com/rest-api/lib/extensions-util"
at "/MarkLogic/rest-api/lib/extensions-util.xqy";

declare default function namespace "http://www.w3.org/2005/xpath-functions";
declare option xdmp:mapping "false";

declare private variable $extName := "ml:collections";
declare private variable $modPath := "/data-hub/5/services/collections.sjs";
declare private variable $caller  := xdmp:function(
  xs:QName("applyOnce"), "/MarkLogic/rest-api/lib/extensions-util.sjs"
);

declare function ml-collections:source-format() as xs:string {
  "javascript"
};
declare function ml-collections:get(
  $context as map:map, $params as map:map
) as document-node()? {
  map:get(xdmp:apply($caller,$extName,$modPath,"GET",$context,$params),"results")
};
declare function ml-collections:delete(
  $context as map:map, $params as map:map
) as document-node()? {
  map:get(xdmp:apply($caller,$extName,$modPath,"DELETE",$context,$params),"results")
};
declare function ml-collections:post(
  $context as map:map, $params as map:map, $input as document-node()*
) as document-node()? {
  map:get(xdmp:apply($caller,$extName,$modPath,"POST",$context,$params,$input), "results")
};
declare function ml-collections:put($context as map:map, $params as map:map, $input as document-node()*
) as document-node()? {
  map:get(xdmp:apply($caller,$extName,$modPath,"PUT",$context,$params,$input), "results")
};
declare function ml-collections:transform(
  $context as map:map, $params as map:map, $input as document-node()?
) as document-node()? {
  map:get(xdmp:apply($caller,$extName,$modPath,"transform",$context,$params,$input), "results")
};
