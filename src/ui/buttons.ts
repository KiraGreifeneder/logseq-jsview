import { registerButton, type Callback } from "../core/callbacks";
import { escapeHtml } from "./html";

type DataValue = string | number | boolean | object | null | undefined;

// blockUuid -> block-uuid, so it round-trips to dataset.blockUuid
const toKebab = (key: string): string =>
  key.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

const serialize = (value: object | string | number | boolean): string =>
  typeof value === "object" ? JSON.stringify(value) : String(value);

export function button(
  text: string,
  onclick: Callback,
  data: Record<string, DataValue> = {},
  scope?: string,
) {
  const attrs: string[] = [`class="jsv-button"`];

  for (const [key, value] of Object.entries(data)) {
    if (value == null) continue; // skip null and undefined

    const name = toKebab(key);
    if (!/^[a-z][a-z0-9-]*$/.test(name)) {
      throw new Error(`Invalid data attribute name: "${key}"`);
    }
    if (name === "on-click" || name === "jsv-handler") {
      throw new Error(`"${key}" is reserved for JSView's click handler`);
    }

    attrs.push(`data-${name}="${escapeHtml(serialize(value))}"`);
  }

  const id = registerButton(onclick, scope);
  attrs.push(`data-on-click="jsvDispatch"`, `data-jsv-handler="${id}"`);
  return `<button ${attrs.join(" ")}>${text}</button>`;
}

export function uniqueCodeToggleBtn() {
  const toggleId = crypto.randomUUID();

  return `<button
        data-on-click="toggleCode"
        data-toggle-id="${toggleId}"
        title="Show/hide code"
        class="jsv-code-toggle"
      >show/hide jsv block &lt;/&gt;</button>`;
}
