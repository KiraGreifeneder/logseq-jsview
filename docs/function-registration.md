# Function registration

[All docs](./README.md)

## `jsv.registerFunction(name, func)`

If you're making your own clickable HTML, you can register a function and
refer to it by name with `data-on-click`. All functions need to be registered (done through the logseq API in the background) before they can be used in an element.

```js
jsv.registerFunction("open-projects", () => {
  logseq.App.pushState("page", { name: "projects" });
});

return '<a data-on-click="open-projects">Projects</a>';
```

Pass the name you want to use and the function to run.
This just registers the function; you'll still return your own HTML.
There's no unregister function returned at the moment.

One thing to keep in mind: names are shared across blocks. If you reuse one,
it replaces the previous callback. I'd recommend giving your functions
distinct names, and leaving `toggleCode` alone as JSView uses that internally.
`jsvDispatch` is reserved for button callbacks and can't be registered manually.

## Passing data

You can pass data along with `data-*` attributes, then read it from
`e.dataset` in your function:

```js
const callbackName = `open-page-${debug.blockUuid}`;

jsv.registerFunction(callbackName, (e) => {
  logseq.App.pushState("page", { name: e.dataset.pageName });
});

return `<a data-on-click="${callbackName}" data-page-name="projects">Projects</a>`;
```

`data-page-name` becomes `e.dataset.pageName`. Values are strings.
The callback data comes from Logseq, so it isn't necessarily a normal browser
`MouseEvent`.

If you're putting dynamic values in attributes, please escape those first.

For buttons, [jsv.button()](./ui.md#buttons) does the registration and data
serialization for you.

## Current limits

Callbacks registered through your block's `jsv` API are released when that
slot reruns, disappears, or the graph changes. Failed runs release their
callbacks too. Button callbacks use one shared dispatcher rather than adding
a new Logseq model function for every button.

Named callbacks still share names across blocks. Their small Logseq forwarding
functions stay registered, but no longer hold your script's callback after
cleanup. You can reuse a name on later runs.
Registration doesn't isolate a function or restrict what it can do.

If a click handler fails, have a look in the console. These functions run after
the block has rendered, so their errors don't appear in the script error panel.
