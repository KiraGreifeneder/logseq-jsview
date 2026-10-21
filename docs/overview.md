# Overview

[All docs](./README.md)

## Codeblocks

You can use the slash command **New in-line JSView** to create a codeblock
with its renderer macro. Please keep the macro in the same block as the code,
as that's how JSView knows what to run.

Your code runs as the body of an async function, so you can use `await` directly:

```js
const page = await jsv.pageByName("Projects");
return page ? "Found Projects" : "Couldn't find Projects";
```

The function receives:

| Name | What's in it |
| --- | --- |
| `jsv` | JSView's helpers |
| `logseq` | The Logseq plugin API |
| `debug` | `blockUuid`, `slotId`, and the renderer `key` for this run |

You'll need to trust your graph before any code runs. Please only do this for
code you trust: JSView isn't a sandbox, and scripts can change your graph
through the Logseq API.

## Returning output

Whatever you return is rendered below the codeblock. Usually that'll be an
HTML string or a table built with `jsv.table()`. Tables have a `toString()`
method, so you can simply return the table itself:

```js
return jsv.table()
  .headers(["Task", "Status"])
  .row(["Write docs", "Done"]);
```

JSView currently uses JavaScript's normal string conversion for the output.
If you want to display another object as JSON, you'll need to convert it
yourself. And remember to `return` something, otherwise you'll see `undefined` :)

You can put HTML in returned strings. This also means text from your graph
may need escaping if you want to display it as plain text. There's an example
in [UI](./ui.md#html-and-escaping).

If loading, compilation, or your script fails, you should see an error panel
and a message in the console. Unless you catch the error yourself, the rest
of the script won't run.

## Helpers

| Helper | What it does |
| --- | --- |
| `jsv.datascriptQuery(query)` | Runs a Datalog query |
| `jsv.simpleQuery(query)` | Runs a Logseq simple query |
| `jsv.allPages()` | Queries all pages |
| `jsv.pageByName(name)` | Finds one page |
| `jsv.blocksInPage(pageUuid)` | Gets a page's block tree |
| `jsv.table(props?)` | Creates a table builder |
| `jsv.button(text, onclick, data?)` | Returns button HTML |
| `jsv.registerFunction(name, func)` | Registers a callback for custom HTML |

Use `await` with the query helpers. You don't need it for tables, buttons, or
function registration.

These helpers are just here to make things a little easier. You can always
use `logseq` directly if you need something else.
