# V1 hardening plan: logseq-jsq

## Goal and scope

Get the working demo ready to publish as a V1 that is reasonably safe:

1. **Security.** jsq blocks only run in graphs or pages the user has trusted.
2. **Errors.** Every failure shows up clearly in the rendered block and in the console.
3. **Typing.** Strict TypeScript, no `any`, and a typed public `jsq` API.
4. **Structure.** A small, flat layout without circular imports.

Out of scope for V1:

- Automated tests
- A "Run once" button
- Per-block hash approval
- Custom/external jsq scripts (the TODO in `index.ts`)
- Real sandboxing (iframe or worker isolation)

## Current state

- `index.ts` picks up `{{renderer :jsq-…}}` slots and calls `executeLocalJsq` in `core/runner.ts`. That function reads the code block and runs `new AsyncFunction("jsq", "logseq", "debug", code)` with no trust check. Opening a stranger's graph runs their code.
- User code runs in the plugin iframe and can reach `top`. **Blocking execution is the only real protection**, so the trust check has to happen before the code is compiled.
- Error handling:
  - Runtime errors are only logged, and `undefined` gets rendered.
  - A missing code block leaves the slot empty.
  - `pageByName` crashes when no page matches (`matches[0][0]`).
  - Error text and table props are inserted into HTML without escaping.
- Typing:
  - There's no `tsconfig.json`, so strict mode is off.
  - `any` is used in the runner, `toggleCode`, CodeMirror access and `button`.
  - Query results are untyped.
- Structure:
  - `lib/jsq.ts` and `ui/button.ts` import each other.
  - `button()` calls `provideModel` with a new UUID on every render, so handlers pile up.
  - Debug `console.log`s are left in.

## Target structure

```
src/
  index.ts        bootstrap: settings, styles, slash command, slot listener, re-render hooks
  settings.ts     settings schema, typed getSettings(), isTrusted(), trustGraph()/trustPage()
  runner.ts       load → trust → compile → run → normalize → render; JsqError
  api.ts          the `jsq` object, JsqApi/JsqContext types, model (click handler) registry
  ui/
    html.ts       escapeHtml/escapeAttr, output wrapper, error panel, trust placeholder, styles
    table.ts      Table builder (escapes attribute values)
    button.ts     button() using the registry from api.ts
```

Changes from the current layout:

- `core/runner.ts` moves to `runner.ts`.
- `lib/jsq.ts` moves to `api.ts`.
- `core/` and `lib/` are deleted.
- `button.ts` imports the registry from `api.ts`. `api.ts` imports `button`/`Table` only to put them on the `jsq` object. If the cycle still causes trouble, move the registry into `ui/html.ts`.

## Design

### 1. Execution trust (`settings.ts`)

Settings are registered with `logseq.useSettingsSchema`. Logseq stores plugin settings outside the graph, so a graph can't mark itself as trusted. **Trust markers inside graph content (for example page properties) are never accepted.**

| key | type | default | meaning |
|---|---|---|---|
| `executionPolicy` | enum `disabled` / `trustedGraphs` / `trustedPages` | `trustedGraphs` | which trust rule applies |
| `trustedGraphs` | string, one graph id per line | `""` | allowlist of graphs |
| `trustedPages` | string, one `graphId::pagename` per line | `""` | allowlist of pages; namespace children are **not** included |
| `showStackTraces` | boolean | `true` | show the stack in the error panel |

Rules:

- **Graph id:** `(await logseq.App.getCurrentGraph())?.url`, treated as an opaque string. Cache it and clear the cache on `logseq.App.onCurrentGraphChanged`.
- **Page name:** the page name of the block's page, lowercased. The match must be exact, so trusting `projects` does not trust `projects/foo`.
- **`isTrusted(graphId, pageName)`:**
  - `disabled`: always false.
  - `trustedGraphs`: the graph is in `trustedGraphs`.
  - `trustedPages`: the graph is in `trustedGraphs`, **or** `graphId::pageName` is in `trustedPages`.
- **Untrusted block:** don't compile anything. Render the trust placeholder: "jsq code is not trusted in this graph/page". It has two buttons:
  - **[Trust this graph]**
  - **[Trust this page]** (shown only when the policy is `trustedPages`)

  Each button appends to the setting with `logseq.updateSettings` and then re-renders. A graph can't click these buttons for the user, so that's safe.
- **Re-rendering:** keep a `Map<slotId, {blockUuid, rendererKey}>` of active slots. On `logseq.onSettingsChanged` and on graph change, run the pipeline again for each slot (drop slots whose element no longer exists).

### 2. Pipeline and errors (`runner.ts`)

```ts
type Phase = "load" | "compile" | "runtime" | "result";
class JsqError extends Error { phase: Phase; blockUuid: string; line?: number; cause?: unknown }
```

`runJsqSlot(slotId, blockUuid, rendererKey)`:

1. **load:** `getBlock`, then the regex. If there's no block or no `` ```jsq `` fence, throw a `JsqError("load")` saying what was expected.
2. **trust:** call `isTrusted`. If it returns false, render the placeholder and stop. This is not an error.
3. **compile:** append `\n//# sourceURL=jsq-<blockUuid>.js` to the code, then build the `AsyncFunction`. A `SyntaxError` becomes `JsqError("compile")`.
4. **runtime:** `await fn(jsq, logseq, ctx)`. Anything thrown becomes `JsqError("runtime")`. Read the line number from the first `jsq-<uuid>.js:L:C` stack frame. If the number turns out to be offset by the generated function header, correct for it.
5. **result:** normalize an `unknown` result:
   - `string`: used as-is (raw HTML on purpose).
   - `Table` instance: `toString()`. Table errors are thrown as `JsqError("result")`.
   - `undefined` or `null`: a hint saying "Block returned nothing. Did you forget `return`?"
   - number or boolean: `String(x)`, escaped.
   - other objects: escaped `JSON.stringify(x, null, 2)` inside `<pre>`.
6. **render:** `provideUI` with key `jsq-${blockUuid}-${slotId}`, so an embed and the original block don't overwrite each other.

There is one `catch` for all phases:

- **Rendered:** `errorPanel(err)` shows the phase, the escaped message, `line N` when known, and a collapsible `<details>` stack when `showStackTraces` is on.
- **Console:** `console.error("[jsq]", phase, blockUuid, err)`, with the error object itself so DevTools keeps the clickable stack.

Remove all the debug `console.log`s.

### 3. API and typing (`api.ts`, `tsconfig.json`)

- Add `tsconfig.json`:
  - `strict`, `noUncheckedIndexedAccess`
  - `target`/`lib`: `ES2022` + `DOM`
  - `module`: `ESNext`, `moduleResolution`: `bundler`, `noEmit`

  Add the script `"typecheck": "tsc --noEmit"`.
- The user-code boundary is `unknown`. Narrow it only through the result normalizer.

```ts
export type JsqContext = { blockUuid: string; slotId: string; rendererKey: string; graphId: string };
export type CompiledJsq = (jsq: JsqApi, logseq: ILSPluginUser, ctx: JsqContext) => Promise<unknown>;
export type JsqApi = typeof jsq;
```

- Rename the third parameter from `debug` to `ctx`. There are no existing users, so no alias is needed.
- Queries:
  - `datascriptQuery<T = unknown>(q: string): Promise<T[]>`
  - `simpleQuery(q: string): Promise<BlockEntity[]>`, returning `[]` instead of `null`
  - `pageByName(name: string): Promise<PageEntity | null>`, implemented with `logseq.Editor.getPage(name)` (no string injection, no crash)
  - `allPages(): Promise<PageEntity[]>`, flattening the `[[page]]` tuples
  - `blocksInPage(page: string): Promise<BlockEntity[]>`, returning `[]` instead of `null`
- Add a `jsq.escape(str)` helper, since cell contents and returned strings are raw HTML.
- **Model registry:** a single `logseq.provideModel({ jsqDispatch })`. Buttons get `data-on-click="jsqDispatch" data-jsq-handler="<id>"`. Handlers live in `Map<blockUuid, Map<id, fn>>`, and a block's map is cleared before it re-runs, so handlers no longer pile up. `toggleCode` is a built-in handler on the same dispatcher.

  `jsq.registerFunction(name, fn)` stays for hand-written `data-on-click="name"` markup (the example uses it). Re-registering the same name just replaces it.
- Typed host access: in `index.ts`, declare a local type for `window.parent.CodeMirror` (`{ defineMIME(name: string, mode: string): void }`). Handlers receive `HTMLElement`.

### 4. HTML safety (`ui/html.ts`, `ui/table.ts`)

- Move `escapeAttr` out of `button.ts` into `html.ts` and add `escapeHtml`.
- Everything the plugin builds (error text, attribute values, JSON output, placeholder text) gets escaped.
- User-provided content (cells, button labels, returned strings) stays raw HTML on purpose. The README says so.
- `Table.propsToString` escapes values and rejects invalid attribute names.

## Implementation steps

1. **Tooling:** add `tsconfig.json` and the `typecheck` script. Fix the type errors this reveals only as far as the build needs.
2. **Flatten the layout:** move the files into the target structure, add `ui/html.ts`, and fix imports. Behavior stays the same.
3. **Pipeline and errors:** add `JsqError` and phases, rewrite `runner.ts` as `runJsqSlot`, add result normalization, the error panel and console reporting, and remove the debug logs.
4. **API typing:** typed queries, `pageByName` via `getPage`, `JsqContext`/`ctx`, model registry plus `jsqDispatch`, and the `button`/`toggleCode` changes. Remove the remaining `any`s.
5. **Settings and trust:** schema, `isTrusted`, placeholder with trust buttons, the active-slot map and re-rendering on settings or graph change.
6. **Examples and docs:**
   - Update the examples: use `ctx`, fix the implicit global `for (d of …)` with `const d`, and add `?.` around properties that may be missing.
   - Add README sections on the security model and settings, how errors appear, the API reference, and "returned strings are raw HTML".
   - Fix the plugin id mismatch (`jqs` repo vs `jsq` id) if you want to.

Order: 1 → 2 → 3, and 4 can be done alongside 3. Step 5 needs 3, because the placeholder uses the same render path. Step 6 comes last.

## Risks

- **No sandbox.** Trusted code can still do anything Logseq can do. The README must say plainly: "only trust graphs whose jsq code you've read or written."
- **Graph id.** The `url` format differs between file graphs and DB graphs, and between Logseq versions. Treating it as opaque handles that. If a graph is moved, it has to be trusted again.
- **Stack line mapping.** It depends on the Chromium/Electron stack format. If parsing fails, show no line number instead of a wrong one.
- **Infinite loops.** Synchronous user code can't be interrupted. Document this and don't add a timeout.

## Verification (manual, no automated tests for V1)

- `npm run typecheck` passes. `any` appears only in documented places, if anywhere.
- `npm run build` succeeds, and the plugin loads in Logseq.
- In a fresh, untrusted graph, every jsq block shows the placeholder and no user code runs. Check with a block that calls `console.log`.
- [Trust this graph] renders the blocks right away and is still trusted after restarting Logseq.
- `trustedPages` mode: a trusted page runs, an untrusted page and that page's namespace children show the placeholder, and [Trust this page] works.
- Switching to another graph re-evaluates trust. `disabled` blocks everything.
- Error panels with a useful message show up for:
  - a syntax error (compile, with line number)
  - `throw new Error("x")` (runtime, with line number)
  - a missing `return` (hint)
  - a block with the renderer macro but no code fence (load)
  - `jsq.pageByName("doesnotexist")` (returns `null`, no crash)
- Re-rendering a block with buttons many times doesn't grow the handler map. Check by logging its size during development.
- All files in `examples/` still render correctly.
