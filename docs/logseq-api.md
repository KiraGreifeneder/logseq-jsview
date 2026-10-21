# Logseq data

[All docs](./README.md)

JSView passes the Logseq plugin API into scripts as `logseq`. You don't need
to import it.

- [Logseq plugin API reference](https://plugins-doc.logseq.com/)
- [Logseq SDK source types](https://github.com/logseq/logseq/blob/master/libs/src/LSPlugin.ts)

I've listed some useful fields below to get you started. This isn't the full
Logseq API, and the objects you get can vary depending on how you query them.
The TypeScript types are useful as a reference, but don't check the returned
data for you.

## PageEntity

Common fields on pages returned by editor APIs:

| Field | Meaning |
| --- | --- |
| `id` | Numeric database entity ID |
| `uuid` | UUID string, useful for editor/navigation APIs |
| `name` | Normalized page name |
| `originalName` | Original display name |
| `properties` | Optional property values |
| `journal?` | Whether this is a journal page |
| `journalDay` | Optional journal date value |

Access the journal flag as `page["journal?"]`.

```js
const page = await logseq.Editor.getPage("Projects");
if (!page) throw new Error("Couldn't find Projects");

console.log(page.uuid, page.originalName, page.properties);
return page.uuid;
```

It's worth noting that `id` and `uuid` are different things.
Check which one the API expects when passing them to another function.

## BlockEntity

Common fields:

| Field | Meaning |
| --- | --- |
| `id` | Numeric database entity ID |
| `uuid` | Block UUID string |
| `content` | The block's source text |
| `properties` | Optional property values |
| `page` | A page reference, typically `{ id: ... }`, not a full page |
| `parent` / `left` | References used for hierarchy and ordering |
| `children` | Optional child blocks or UUID tuples, depending on the call |
| `marker` | Optional task marker, such as `TODO` |

If you're looking for the page name, `block.page` may only contain its ID.
Some queries include more page data, but you can also look up the page yourself:

```js
const block = await logseq.Editor.getBlock(debug.blockUuid);
if (!block) throw new Error("Couldn't find this block");

const page = await logseq.Editor.getPage(block.page.id);
console.log(block.content, page?.originalName);
return block.uuid;
```

Properties can be a little less straightforward: values may be strings,
arrays, references, numbers, or other values. If you're unsure what you've
got, `console.log(block.properties)` is a good place to start before using
them in a table.

## Query results aren't always editor entities

### Simple queries

`logseq.DB.q()` returns an array or `null`, depending on the query/result.
JSView's `simpleQuery()` converts a nullish result to `[]`.
Page queries and block queries don't necessarily return the same fields.

### DataScript queries

The `:find` expression controls the shape. For example:

| `:find` expression | Typical result |
| --- | --- |
| `:find ?name` | `[["projects"], ["notes"]]` |
| `:find (pull ?p [*])` | `[[page], [page]]` |
| `:find [?name ...]` | `["projects", "notes"]` |
| `:find ?name .` | A single value |
| `:find [?id ?name]` | A single tuple |

Pull results come from the database directly, so their fields and references
can look different from objects returned by `logseq.Editor`.
You may not get every field listed under `PageEntity` or `BlockEntity`.

```js
const rows = await jsv.datascriptQuery(`
  [:find ?name :where [?p :block/name ?name]]
`);

for (const [name] of rows) {
  console.log(name);
}
return `Found ${rows.length} names`;
```

`jsv.datascriptQuery()` keeps the raw result, with an `unknown` default type
for TypeScript callers. `jsv.allPages()` unpacks its query rows into a flat
page array. See the [query docs](./queries.md) for examples and type arguments.

## Block trees

`logseq.Editor.getPageBlocksTree()` returns top-level blocks with their nested
children. A general `BlockEntity.children` is typed as blocks or UUID tuples;
not every API expands children into full objects.

`jsv.blocksInPage()` forwards the tree result without flattening it.
If you want to visit every nested block too, you'll need to go through the
expanded `children` arrays. The top-level array alone won't include them all.
