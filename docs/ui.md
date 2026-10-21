# UI

[All docs](./README.md)

## Tables

### `jsv.table(props?)`

You can create a table with `jsv.table()`, add some rows, and return it from
your codeblock. If you want to add HTML attributes to the table, pass them
in as `props` with string values.

In this example we're adding our own class alongside JSView's classes:

```js
return jsv.table({ class: "my-table" })
  .headers(["Task", "Status"])
  .row(["Write docs", "Done"]);
```

### `.headers(row)`

Adds the header row (rows are defined below). You can leave it out if you don't need one.
Calling it again replaces the previous header. These cells render as `<th>`.

### `.row(row)`

Adds another row to the table, with cells rendered as `<td>`.
Rows appear in the order you add them.

Both methods return the table, so you can chain them like in the example above.

A row is either:

```js
["Write docs", "Done"]
```

or an object with cells and optional row attributes:

```js
{
  cells: ["Write docs", "Done"],
  props: { title: "Documentation task" }
}
```

A cell is either a string or an object with `content` and optional attributes:

```js
{
  content: "<strong>Publish V1</strong>",
  props: { title: "Next step", style: "color: red" }
}
```

Putting those together:

```js
const table = jsv.table().headers(["Task", "Status"]);

table.row({
  cells: [
    { content: "<strong>Publish V1</strong>", props: { title: "Next step" } },
    "Pending",
  ],
  props: { class: "next-task" },
});

return table;
```

Please use strings for cell contents. For numbers, `String(value)` will do.
If a row or cell has the wrong shape, you'll get a `TypeError` pointing to
the row and cell rather than an incomplete table. The invalid row isn't added.
You can catch that error yourself, or let JSView show it in the error panel.

### `.withoutStyle()`

If you'd rather style the table yourself, you can turn off the defaults
with `.withoutStyle()`. By default you get:

- A 1px border below the header
- Bold header cells
- Left-aligned cells
- Collapsed table borders

```js
return jsv.table()
  .withoutStyle()
  .headers(["Task", "Status"])
  .row(["Publish V1", "Pending"]);
```

You can keep chaining calls after this too. It only turns off JSView's styles,
so your theme, Logseq, and your own attributes can still affect the table.

### `.toString()`

Gives you the table as an HTML string, if you need it.
Otherwise you can simply return the table from your codeblock.

## Buttons

### `jsv.button(text, onclick, data?)`

You can use this to create a button with a click handler, without registering
the handler yourself. It returns HTML, so you can return the button directly
or put it in a table cell:

```js
return jsv.button("Open page", (e) => {
  logseq.App.pushState("page", { name: e.dataset.pageName });
}, { pageName: "projects" });
```

- `text`: the button label, as raw HTML
- `onclick`: called by Logseq when clicked
- `data`: optional values stored in `data-*` attributes

Any data you pass in is available through `e.dataset` when the button is
clicked. Camel-case keys become kebab-case attributes, so `pageName` becomes
`data-page-name` in the HTML and comes back as `e.dataset.pageName`.

Data values can be strings, numbers, booleans, objects, `null`, or `undefined`:

- Numbers and booleans become strings.
- Objects are JSON-serialized. Use `JSON.parse()` to read them back.
- `null` and `undefined` are skipped.
- Attribute values are HTML-escaped.

Please leave `onClick` and `jsvHandler` out of the data object, as JSView uses those attributes
to wire up the button. Invalid attribute names will give you an error.
Objects also need to be JSON-serializable, so circular objects won't work.

See [function registration](./function-registration.md) if you're building
your own links or other clickable HTML.

## HTML and escaping

You can use HTML in returned strings, table cells, and button labels.
That's useful for links and formatting, but it also means plain text isn't
escaped automatically. There isn't a `jsv.escape()` helper yet.

If you want to display text from your graph as plain text, you can use this:

```js
function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
```

Table attributes aren't escaped yet either, so please only pass attributes
you trust. The helper above is for text, not quoted attribute values.

## Styling

Plugin styles live in [styles.css](../src/ui/styles.css). The build loads
that file as text, and the plugin registers it through `logseq.provideStyle()`
in Logseq's document.

JSView uses `jsv-`-prefixed classes. Host slot sizing and code-hiding rules
target JSView output rather than every plugin's slots.

Most colors use Logseq CSS variables or inherited colors. Error accents use
`--jsv-error-color`, which defaults to red. Themes can still apply their own
rules to your output.

You can still use your own HTML, classes, and inline styles.
JSView leaves those alone.
