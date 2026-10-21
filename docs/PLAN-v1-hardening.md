# V1 hardening plan: logseq-jsq

## Goal and scope

Get the working demo ready to publish as a V1 that is reasonably safe:

1. **Security.** jsq blocks only run in graphs or pages the user has trusted.
2. **Errors.** Every failure shows up clearly in the rendered block and in the console.
3. **Typing.** Strict TypeScript, no `any`, and a typed public `jsq` API.
4. **Structure.** Clear `core/`, `api/`, and `ui/` responsibilities without circular imports or a file for every pipeline step.

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
  index.ts        bootstrap, slash command, event wiring, local CodeMirror integration
  settings.ts     settings schema and typed settings access
  core/
    runner.ts     load, trust, compile, execute, normalize, render
    trust.ts      graph/page identity, approval rules, trust updates
    errors.ts     error normalization and diagnostic context
    callbacks.ts  callback registration, dispatch, cleanup
  api/
    jsq.ts        assembles the public jsq object; exports JsqApi
    queries.ts    query and page/block retrieval helpers
  ui/
    render.ts     output wrapper, error panel, trust placeholder, styles
    html.ts       shared escaping and attribute helpers
    table.ts      table builder
    button.ts     button builder
```

Changes from the current layout:

- Keep `core/runner.ts`. Loading, compilation, execution, and result normalization remain together initially.
- Move `lib/jsq.ts` to `api/jsq.ts` and extract its query helpers into `api/queries.ts`. Remove `lib/` once empty.
- Both `api/jsq.ts` and `ui/button.ts` use `core/callbacks.ts`; the registry never imports the public API. This removes the existing circular import.
- No `host/`, `api/index.ts` barrel, central `types.ts`, or handwritten `jsq.d.ts`.
- Keep types beside their owner and export them when needed: `JsqApi` in `api/jsq.ts`, table types in `ui/table.ts`, callback types in `core/callbacks.ts`, settings types in `settings.ts`, execution context in `core/runner.ts`, and diagnostic types in `core/errors.ts`. Use `import type` for type-only dependencies.

## Design

### 1. Execution trust (`settings.ts`, `core/trust.ts`)

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

  Each button requests approval through plugin-owned confirmation UI identifying the graph/page and warning about unrestricted execution. Treat callback data as untrusted: resolve the target from plugin-owned slot state and re-check the current graph before persisting approval. In `disabled` mode, show instructions to change settings, not approval buttons. This is an execution gate, not a sandbox or a guarantee against deceptive graph content.
- **Re-rendering:** track active slots with their graph identity and run generation. On trust changes, invalidate pending runs, remove obsolete output and callbacks, and re-evaluate live slots. On graph change, discard old graph slot state rather than resolving its block UUIDs in the new graph. Before execution, callback dispatch, and rendering asynchronous results, re-check that the graph, trust decision, and run generation are still current. Revocation cannot undo side effects of code that has already started.

### 2. Pipeline and errors (`core/runner.ts`, `core/errors.ts`)

```ts
type Phase = "load" | "trust" | "compile" | "runtime" | "result" | "render";
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

### 3. API and typing (`api/`, `tsconfig.json`)

- Add `tsconfig.json`:
  - `strict`, `noUncheckedIndexedAccess`
  - `target`/`lib`: `ES2022` + `DOM`
  - `module`: `ESNext`, `moduleResolution`: `bundler`, `noEmit`
  - `verbatimModuleSyntax` to make type-only imports explicit

  Add the script `"typecheck": "tsc --noEmit"`.
- The user-code boundary is `unknown`. Narrow it only through the result normalizer.

```ts
export type JsqContext = { blockUuid: string; slotId: string; rendererKey: string; graphId: string };
export type CompiledJsq = (jsq: JsqApi, logseq: ILSPluginUser, ctx: JsqContext) => Promise<unknown>;
export type JsqApi = typeof jsq;
```

- Rename the third parameter from `debug` to `ctx`. There are no existing users, so no alias is needed.
- Queries:
  - Raw Datalog results default to `unknown`: their shape depends on `:find` (relations, collections, tuples, scalars). Do not promise `T[]` for every query. Validate the specific result shape in higher-level helpers; optional generic annotations are caller assertions, not runtime validation.
  - `simpleQuery(q: string): Promise<BlockEntity[]>`, returning `[]` instead of `null`
  - `pageByName(name: string): Promise<PageEntity | null>`, implemented with `logseq.Editor.getPage(name)` (no string injection, no crash)
  - `allPages(): Promise<PageEntity[]>`, flattening the `[[page]]` tuples
  - `blocksInPage(page: string): Promise<BlockEntity[]>`, returning `[]` instead of `null`
- Add a `jsq.escape(str)` helper, since cell contents and returned strings are raw HTML.
- **Model registry (`core/callbacks.ts`):** a single `logseq.provideModel({ jsqDispatch })`. Buttons get `data-on-click="jsqDispatch" data-jsq-handler="<id>"`. Scope handlers to graph, slot, and run generation, so embeds do not clear each other's handlers. Construct a per-run `jsq` API whose button/registration helpers close over this scope; do not use a mutable global "current block", since scripts can overlap across `await`. Remove handlers on rerun, trust revocation, graph change, and slot disposal. `toggleCode` is a built-in handler on the same dispatcher.

  Prefer scoped dispatch over globally named `provideModel` callbacks. Update the link example to use a registration result containing its dispatch attributes rather than a hard-coded global callback name. With no existing users, this API can change before release.
- Typed host access: in `index.ts`, declare a local type for `window.parent.CodeMirror` (`{ defineMIME(name: string, mode: string): void }`). Handlers receive `HTMLElement`.

### 4. HTML safety (`ui/html.ts`, `ui/render.ts`, `ui/table.ts`)

- Move `escapeAttr` out of `button.ts` into `html.ts` and add `escapeHtml`.
- Everything the plugin builds (error text, attribute values, JSON output, placeholder text) gets escaped.
- User-provided content (cells, button labels, returned strings) stays raw HTML on purpose. The README says so.
- `Table.propsToString` escapes values and rejects invalid attribute names. This protects HTML structure, not against arbitrary active HTML: raw HTML is supported only after execution approval.

### 5. TypeScript configuration and package scripts

Add this project-root `tsconfig.json` during implementation:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "noEmit": true,
    "skipLibCheck": true,
    "types": ["node"]
  },
  "include": ["src/**/*.ts", "tsdown.config.ts"],
  "exclude": ["node_modules", "dist"]
}
```

- Include the bundler config as well as plugin source. Node types are available for tooling; they do not make Node APIs available inside the plugin's browser runtime.
- `skipLibCheck` skips checking dependency declaration internals, not type-checking plugin code against their exported types. Revisit it if dependency typing issues need investigation.
- `strict` catches implicit `any`, but does not prohibit explicit `any`. Review those separately and avoid unnecessary assertions. Turning on strict checks is expected to expose existing code that must be fixed.
- The existing TypeScript package exposes `tsc`; no new dependencies or compiler-command substitutions are needed.

Change only the scripts section in `package.json`:

```json
{
  "scripts": {
    "typecheck": "tsc --noEmit",
    "build": "npm run typecheck && tsdown",
    "dev": "tsdown --watch",
    "test": "node --test"
  }
}
```

Keep the existing test script without adding tests for V1. The development bundler remains fast; optionally run `npm run typecheck -- --watch` in another terminal. Release builds fail if type-checking fails. No dependency or lockfile changes are required.

### 6. Optional generated declarations

TypeScript can generate `.d.ts` files directly from the implementation using `declaration` and `emitDeclarationOnly`. A declaration-emitting configuration must override this project's `noEmit: true` with `noEmit: false`.

Do not maintain handwritten duplicates of the public API types. Export `JsqApi` from `api/jsq.ts` (derived from the actual API object or per-run API factory), along with relevant public types.

Declaration distribution is optional and not a V1 prerequisite. If added later:

- Use a separate declaration build rooted at `src/`, emitting to a dedicated output directory, or use tsdown declaration generation.
- The current tsdown setting `dts: false` intentionally disables declarations. Enabling `dts: true` for the plugin startup entry alone does not establish a useful scripting API entry point; configure an API entry and include all referenced declarations.
- Check that the distributed types can be consumed without plugin startup side effects and without unavailable internal imports.
- Add a package `types`/export mapping only when actually distributing an importable API entry. Do not point it at a nonexistent declaration file.
- Generated declarations help external script editors; they do not automatically provide autocomplete in Logseq's code editor, validate user JavaScript at runtime, or replace project type-checking.

## Implementation steps

1. **Tooling:** add the configuration and scripts above. Fix the type errors rather than relaxing strictness or hiding them behind casts.
2. **Organize the layout:** keep `core/`, introduce `api/`, separate rendering and HTML helpers, and fix imports without changing behavior.
3. **Pipeline and errors:** add `JsqError` and phases, rewrite `runner.ts` as `runJsqSlot`, add result normalization, the error panel and console reporting, and remove the debug logs.
4. **API typing:** typed queries, `pageByName` via `getPage`, `JsqContext`/`ctx`, model registry plus `jsqDispatch`, and the `button`/`toggleCode` changes. Remove the remaining `any`s.
5. **Settings and trust:** schema, `isTrusted`, placeholder with trust buttons, the active-slot map and re-rendering on settings or graph change.
6. **Examples and docs:**
   - Update the examples: use `ctx`, scoped link callbacks, and `const d` in loops. Handle missing properties explicitly rather than hiding invalid input behind optional chaining.
   - Add README sections on the security model and settings, how errors appear, the API reference, and "returned strings are raw HTML".

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
- Trusting or revoking one page does not affect its namespace children. Test page-only approval without a graph-wide grant.
- Switch graphs or revoke trust while a script is awaiting a promise: its obsolete output must not render and its callbacks must not remain usable. Already-started code cannot be forcibly stopped.
- Error panels with a useful message show up for:
  - a syntax error (compile, with line information only when reliably available)
  - `throw new Error("x")` (runtime, with verified line mapping)
  - a missing `return` (hint)
  - a block with the renderer macro but no code fence (load)
  - `jsq.pageByName("doesnotexist")` (returns `null`, no crash)
- Re-rendering a block with buttons many times doesn't grow the handler map. Check by logging its size during development.
- All files in `examples/` still render correctly.
