# Logseq JSQ (Javascript Querying)

This Logseq plugin allows you to 

- [ ] Query and process pages in your graph through an intuitive Javascript API
- [ ] Process your pages as JSON objects
- [X] Render arbitrary output from a codeblock directly on your page
- [ ] Run javascript functions from your own scripts inside Logseq's context to automate whatever you want

## Why?

I came to Logseq after having used Obsidian for years.
I enjoy the graph-based approach but I've found it hard to re-create all the visualizations and interactive
elements that I'd built myself in Obsidian through the Templater and Dataview plugins in the past.

This plugin is meant to bring that customizability back.

The goal of this plugin is not:
- to be as efficient as possible
- to write Datalog queries for you

the JSQ plugin simply lets you use the logseq api (as well as helpers through the JSQ api) and do whatever you want with your graph/pages/blocks :)

## Styling

Plugin-owned styles live in [src/ui/styles.css](./src/ui/styles.css). The bundler
loads the CSS as text, and [src/ui/styles.ts](./src/ui/styles.ts) registers it
once through `logseq.provideStyle()` in Logseq's document. JSQ uses
`jsq-`-prefixed CSS classes rather than relying on Logseq's utility classes.
Host slot sizing and code visibility rules target only slots containing JSQ
output, leaving other plugins' slots alone.

Styles inherit theme colors and use Logseq CSS variables with fallbacks.
Returned HTML and user-supplied table attributes can still provide their own
classes and inline styles; these are not rewritten by JSQ.

### Tables

`jsq.table()` includes theme-aware borders, cell padding, and a subtle header
background by default:

```js
return jsq.table()
  .headers(["Task", "Status"])
  .row(["Publish V1", "Pending"]);
```

Chain `.withoutStyle()` to disable JSQ's default table appearance, including
its full-width sizing. This does not reset styles from Logseq or your theme:

```js
return jsq.table({ class: "my-table" })
  .withoutStyle()
  .headers(["Task", "Status"])
  .row(["Publish V1", "Pending"]);
```
