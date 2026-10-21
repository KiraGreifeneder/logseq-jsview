# Queries

[All docs](./README.md)

These helpers let you use Logseq's query APIs from your codeblock.
For now you still have to write the queries yourself, but I'd like to add helpers for
building them later.

If you're wondering what the returned objects look like, see
[Logseq data](./logseq-api.md).

## `jsv.datascriptQuery(query)`

Runs a Datalog query through `logseq.DB.datascriptQuery()`.

Pass the full query as a string. What you get back depends on `:find`;
JSView returns it unchanged, including `null` or `undefined`.

```js
const rows = await jsv.datascriptQuery(`
  [:find (pull ?p [*])
   :where [?p :block/name]]
`);

const pages = rows.map(([page]) => page);
return jsv.table()
  .headers(["Page"])
  .row([String(pages.length)]);
```

The query above gives you `[[page], [page], ...]`, so we unpack each row
with `.map(([page]) => page)`.

For TypeScript callers, the result defaults to `unknown`. You can describe
the result you expect with a type argument:

```ts
const rows = await jsv.datascriptQuery<[string][]>(`
  [:find ?name :where [?p :block/name ?name]]
`);
```

This tells TypeScript what you expect; it doesn't validate the result.
In JavaScript codeblocks, just use the result shape specified by your query.
For example, a scalar query can return a single value or `null` rather than
an array. Check for a missing value before using it.

## `jsv.simpleQuery(query)`

Runs a Logseq simple query through `logseq.DB.q()`. This is the syntax used
inside native simple-query blocks, without the surrounding `{{query ...}}`.

```js
const blocks = await jsv.simpleQuery("(property :deadline-name)");
const table = jsv.table().headers(["Content"]);

for (const block of blocks) {
  table.row([escapeHtml(block.content)]);
}

return table;

function escapeHtml(text) {
  return text.replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
```

You can query blocks or pages, so the available fields depend on your query.
For example, `content` is useful for blocks but isn't a page field.
JSView leaves the results as they are, with `null` or `undefined` replaced
by an empty array.

## `jsv.allPages()`

Queries pages with `(pull ?p [*])` and unpacks the rows for you.
You get a flat `PageEntity[]`, or an empty array if there are no pages.

```js
const pages = await jsv.allPages();
console.log(pages);
return `Found ${pages.length} pages`;
```

## `jsv.pageByName(name)`

Finds a page by name. The name is lowercased before querying.
Returns the first page found, or `undefined` for an empty result.

```js
const page = await jsv.pageByName("Projects");
if (!page) throw new Error("Couldn't find Projects");

return `Page UUID: ${page.uuid}`;
```

There's still a rough edge here: the name is inserted into the query without
escaping, so page names containing quotes may not work.
The helper also expects Logseq to return an array.

## `jsv.blocksInPage(pageUuid)`

Gets the page's block tree through `logseq.Editor.getPageBlocksTree()`.
You can look up the page first and pass its UUID:

```js
const page = await jsv.pageByName("Projects");
if (!page) throw new Error("Couldn't find Projects");

const blocks = await jsv.blocksInPage(page.uuid);
console.log(blocks);
return `Top-level blocks: ${blocks.length}`;
```

The result keeps your block hierarchy: nested blocks are in `children` rather
than in the top-level array. This helper passes the result through without
replacing a missing result with `[]`.
