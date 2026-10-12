import assert from "node:assert/strict";
import test from "node:test";
import { Table } from "../src/ui.ts";

test("Table renders expected HTML from build sequence", () => {
  const table = new Table({ id: "tasks" })
    .headers(["Task", "Status"])
    .row(["Write tests", "Done"])
    .row(["Deploy", "Pending"]);

  const expected =
    '<table class=table-auto id="tasks"> <thead>' +
    "<th> <td> Task </td> <td> Status </td> </th >" +
    "<tr> <td> Write tests </td> <td> Done </td> </tr >" +
    "<tr> <td> Deploy </td> <td> Pending </td> </tr >" +
    "</table>";

  assert.strictEqual(table.toString(), expected);
});

test("Table supports cells and rows with custom props", () => {
  const table = new Table()
    .headers({
      cells: [
        { content: "Name", props: { class: "font-bold" } },
        { content: "Role", props: { class: "italic" } },
      ],
      props: { class: "header-row" },
    })
    .row([{ content: "Alice", props: { style: "color:green" } }, "Admin"]);

  const html = table.toString();

  assert.match(html, /<th class="header-row">/);
  assert.match(html, /<td class="font-bold"> Name <\/td>/);
  assert.match(html, /<td class="italic"> Role <\/td>/);
  assert.match(html, /<td style="color:green"> Alice <\/td>/);
  assert.match(html, /<td> Admin <\/td>/);
});

test("Table reports error when row added before header", () => {
  const table = new Table().row(["Item 1"]);
  const html = table.toString();

  assert.match(html, /Missing header; Add a header before adding rows\./);
});

test("Table reports error when row length does not match header length", () => {
  const table = new Table().headers(["A", "B"]).row(["only one column"]);

  const html = table.toString();

  assert.match(html, /Row doesn't match header length!/);
});

test("Table reports error when toString called with no header set", () => {
  const table = new Table();
  const html = table.toString();

  assert.match(
    html,
    /Table has no header; Add a header before calling toString\(\)/,
  );
});
