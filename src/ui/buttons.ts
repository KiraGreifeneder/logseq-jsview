import { jsq } from "../api/jsq";

const buttonStyleClasses = [
  "ui__button",
  "font-medium",
  "text-xs",
  "rounded",
  "px-3",
].join(" ");

type DataValue = string | number | boolean | object | null | undefined;

const escapeAttr = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

// blockUuid -> block-uuid, so it round-trips to dataset.blockUuid
const toKebab = (key: string): string =>
  key.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

const serialize = (value: object | string | number | boolean): string =>
  typeof value === "object" ? JSON.stringify(value) : String(value);

/**
 * Returns a general-purpose button with an onclick function, as well as any data you pass to it.
 * @param text
 * @param onclickFnName
 * @param data
 * @returns
 */
export function button(
  text: string,
  onclick: (...args: any[]) => void,
  data: Record<string, DataValue> = {},
) {
  const attrs: string[] = [`class="${buttonStyleClasses}"`];

  // add onclick function
  const uuid = crypto.randomUUID();
  const fnName = `custom-btn-fn-${uuid}`;
  jsq.registerFunction(fnName, onclick);

  attrs.push(`data-on-click="${fnName}"`);

  for (const [key, value] of Object.entries(data)) {
    if (value == null) continue; // skip null and undefined

    const name = toKebab(key);
    if (!/^[a-z][a-z0-9-]*$/.test(name)) {
      throw new Error(`Invalid data attribute name: "${key}"`);
    }
    if (name === "on-click") {
      throw new Error(`"onClick" is reserved; use the onclickFnName parameter`);
    }

    attrs.push(`data-${name}="${escapeAttr(serialize(value))}"`);
  }

  return `<button ${attrs.join(" ")}>${text}</button>`;
}

export function uniqueCodeToggleBtn() {
  const toggleId = crypto.randomUUID();

  return `<button
        data-on-click="toggleCode"
        data-toggle-id="${toggleId}"
        title="Show/hide code"
        class="absolute top-0 left-0 z-10 px-1.5 text-xs font-mono opacity-30 hover:opacity-100 transition-opacity cursor-pointer bg-transparent"
      >show/hide jsq block &lt;/&gt;</button>`;
}
