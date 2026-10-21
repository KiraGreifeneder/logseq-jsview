import { jsv } from "../jsv";
import { uniqueCodeToggleBtn } from "../ui/buttons";
import { JsvError } from "./errors";
import { checkTrust } from "./trust";

type DebugInfo = {
  slotId: string;
  blockUuid: string;
  key: string;
};

type CompiledJsv = (
  api: typeof jsv,
  host: typeof logseq,
  debug: DebugInfo,
) => Promise<unknown>;

type AsyncFunctionConstructor = new (...args: string[]) => CompiledJsv;

const AsyncFunction = Object.getPrototypeOf(async function () {})
  .constructor as AsyncFunctionConstructor;

function minify(html: string): string {
  return html.replace(/>\s+</g, "><").trim();
}

/**
 * One instance of JsvExecutor should be created for each JSView Block/slot.
 * Holds the block and slot information and runs through the pipeline of loading, compiling and running the user's code.
 * Tries to collect errors on the way and display them.
 */
export class JsvExecutor {
  constructor(
    private blockUuid: string,
    private slotId: string,
    private key: string,
  ) {}

  /**
   * executes through the whole "load -> compile -> run -> render" pipeline.
   */
  public async execute() {
    try {
      const code = await this.load();
      if (!(await checkTrust())) return;
      const func = this.compile(code);
      const result = await this.run(func);
      this.render(result);
    } catch (cause) {
      console.error("[jsv]", this.blockUuid, cause);

      const error =
        cause instanceof JsvError
          ? cause
          : new JsvError("runtime", this.blockUuid, cause);

      this.render(error.toHtmlElement());
    }
  }

  /**
   * Loads the JSView code for a block by finding the code block and reading its contents.
   * @returns the code inside the block as a string.
   */
  private async load(): Promise<string> {
    const JSV_BLOCK_REGEX =
      /^\x60{3}jsv[ \t]*\r?\n([\s\S]*?)\r?\n?^\x60{3}[ \t]*$/m;

    const block = await logseq.Editor.getBlock(this.blockUuid);
    const jsv_block_matches = block?.content?.match(JSV_BLOCK_REGEX);

    if (!jsv_block_matches?.[1]) {
      throw new JsvError("load", this.blockUuid, "No valid JSView Block found.");
    }

    return jsv_block_matches[1];
  }

  /**
   * Turns the code body into an async function object, reports "compilation" errors (e.g. syntax errs.)
   * @param code the (async) function body code as a string.
   */
  private compile(code: string): CompiledJsv {
    try {
      return new AsyncFunction("jsv", "logseq", "debug", code);
    } catch (cause) {
      throw new JsvError("compile", this.blockUuid, cause);
    }
  }

  /**
   * Takes the Jsv function, passes the jsv api object, logseq and some debug info to it, and runs it.
   * @param func an async function that returns something unknown, to be handled by the user...
   */
  private async run(func: CompiledJsv) {
    let result;
    try {
      result = await func(jsv, logseq, {
        slotId: this.slotId,
        blockUuid: this.blockUuid,
        key: this.key,
      });
    } catch (cause) {
      throw new JsvError("runtime", this.blockUuid, cause);
    }
    return result;
  }

  private render(content: unknown) {
    logseq.provideUI({
      key: this.key,
      slot: this.slotId,
      reset: true,
      template: minify(`
    <div class="jsv-output">
      ${uniqueCodeToggleBtn()}
      <div class="jsv-output__content">${content}</div>
    </div>
  `),
    });
  }
}
