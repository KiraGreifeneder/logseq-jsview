export type CallbackData = { dataset: Record<string, string> };
export type Callback = (event: CallbackData) => unknown;

const callbacks = new Map<string, { scope?: string; func: Callback }>();
const registeredNames = new Set<string>();

export function dispatchCallback(event: CallbackData): unknown {
  return callbacks.get(event.dataset.jsvHandler ?? "")?.func(event);
}

export function registerFunction(name: string, func: Callback, scope?: string): void {
  if (name === "jsvDispatch") throw new Error("jsvDispatch is reserved by JSView.");
  callbacks.set(name, { scope, func });
  if (!registeredNames.has(name)) {
    logseq.provideModel({
      [name]: (event: CallbackData) => callbacks.get(name)?.func(event),
    });
    registeredNames.add(name);
  }
}

export function registerButton(func: Callback, scope?: string): string {
  const id = crypto.randomUUID();
  callbacks.set(id, { scope, func });
  return id;
}

export function clearCallbacks(scope?: string): void {
  for (const [name, callback] of callbacks) {
    if (scope === undefined || callback.scope === scope) callbacks.delete(name);
  }
}

export function pruneCallbacks(document: Document): void {
  for (const [name, callback] of callbacks) {
    if (callback.scope && !document.getElementById(callback.scope)) {
      callbacks.delete(name);
    }
  }
}
