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
      <div role="alert" class="jsq-error">
        <strong class="jsq-error__title">JSQ error · ${escapeHtml(this.phase)}</strong>
        <pre class="jsq-error__message">${escapeHtml(message)}</pre>
        <small class="jsq-error__context">Block: <code>${escapeHtml(this.blockUuid)}</code></small>
      </div>
    `;
  }
}
