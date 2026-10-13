const deadlines = await jsq.simpleQuery(`(page-property :semester "WS26")`);

const table = jsq.table();

for (d of deadlines) {
  const props = d.properties;
  table.row([props.deadline]);
}

table.concat(table_end);

return table;
