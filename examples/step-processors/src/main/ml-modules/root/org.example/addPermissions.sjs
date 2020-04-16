var contentArray;
var options;

contentArray.forEach(content => {
  // Example of content-driven permissions
  // Because the addHeaders.sjs processor was run already, and that converted content.value into an object as opposed
  // to a node, we don't need to call toObject() here on content.value.
  if (content.value.envelope.instance.Order.ShipCity == "Reims") {
    content.context.permissions.push(xdmp.permission("qconsole-user", "read"));
  }

  // Also, note that in order to modify permissions via a step processor during ingestion, you must use MLCP to ingest
  // the data, as a REST transform does not allow you to modify everything about the data to be ingested, such as URI,
  // collections, and permissions.
});

contentArray;
