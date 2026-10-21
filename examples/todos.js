const deadlines = await jsv.simpleQuery(`(property :deadline-name)`);

const table = jsv.table();
table.headers(["Name", "Date", "Time", "Status", "Page"]);

for (d of deadlines) {
  const props = d.properties;
  console.log(props);
  table.row([
    props.deadlineName,
    props.deadlineDate[0],
    props.deadlineTime,
    props.deadlineStatus,
    props.deadlinePage ?? "/",
  ]);
}

return table.toString();
