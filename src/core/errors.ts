type Phase = "load" | "trust" | "compile" | "runtime" | "result" | "render";
export class JsqError extends Error {
  constructor(
    public phase: Phase,
    public blockUuid: string,
    cause?: unknown,
  ) {
    super(`JSQ ${phase} error`, { cause });
    this.name = "JsqError";
  }

  public toHtmlElement(): string {
    const escapeHtml = (value: string): string =>
      value.replace(/[&<>"']/g, (character) => {
        switch (character) {
          case "&":
            return "&amp;";
          case "<":
            return "&lt;";
          case ">":
            return "&gt;";
          case '"':
            return "&quot;";
          default:
            return "&#39;";
        }
      });

    const message =
      this.cause instanceof Error
        ? this.cause.message
        : this.cause === undefined
          ? this.message
          : String(this.cause);

    return `
      <div role="alert" style="border:1px solid #cd5c5c;border-left-width:4px;border-radius:6px;padding:12px 16px">
        <strong style="color:#cd5c5c">JSQ error · ${escapeHtml(this.phase)}</strong>
        <pre style="margin:8px 0;white-space:pre-wrap;overflow-wrap:anywhere">${escapeHtml(message)}</pre>
        <small style="opacity:0.75">Block: <code>${escapeHtml(this.blockUuid)}</code></small>
      </div>
    `;
  }
}
