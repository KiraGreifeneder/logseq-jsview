import { jsq } from "../api/jsq";
import { uniqueCodeToggleBtn } from "../ui/buttons";
import { JsqError } from "./errors";
import { checkTrust } from "./trust";

type DebugInfo = {
  slotId: string;
  blockUuid: string;
  key: string;
};

type CompiledJsq = (
  api: typeof jsq,
  host: typeof logseq,
  debug: DebugInfo,
) => Promise<unknown>;

type AsyncFunctionConstructor = new (...args: string[]) => CompiledJsq;

const AsyncFunction = Object.getPrototypeOf(async function () {})
  .constructor as AsyncFunctionConstructor;

function minify(html: string): string {
  return html.replace(/>\s+</g, "><").trim();
}

/**
 * One instance of JsqExecutor should be created for each JSQ Block/slot.
 * Holds the block and slot information and runs through the pipeline of loading, compiling and running the user's code.
 * Tries to collect errors on the way and display them.
 */
export class JsqExecutor {
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
      console.error("[jsq]", this.blockUuid, cause);

      const error =
        cause instanceof JsqError
          ? cause
          : new JsqError("runtime", this.blockUuid, cause);

      this.render(error.toHtmlElement());
    }
  }

  /**
   * Loads the JSQ code for a block by finding the code block and reading its contents.
   * @returns the code inside the block as a string.
   */
  private async load(): Promise<string> {
    const JSQ_BLOCK_REGEX =
      /^\x60{3}jsq[ \t]*\r?\n([\s\S]*?)\r?\n?^\x60{3}[ \t]*$/m;

    const block = await logseq.Editor.getBlock(this.blockUuid);
    const jsq_block_matches = block?.content?.match(JSQ_BLOCK_REGEX);

    if (!jsq_block_matches?.[1]) {
      throw new JsqError("load", this.blockUuid, "No valid JSQ Block found.");
    }

    return jsq_block_matches[1];
  }

  /**
   * Turns the code body into an async function object, reports "compilation" errors (e.g. syntax errs.)
   * @param code the (async) function body code as a string.
   */
  private compile(code: string): CompiledJsq {
    try {
      return new AsyncFunction("jsq", "logseq", "debug", code);
    } catch (cause) {
      throw new JsqError("compile", this.blockUuid, cause);
    }
  }

  /**
   * Takes the Jsq function, passes the jsq api object, logseq and some debug info to it, and runs it.
   * @param func an async function that returns something unknown, to be handled by the user...
   */
  private async run(func: CompiledJsq) {
    let result;
    try {
      result = await func(jsq, logseq, {
        slotId: this.slotId,
        blockUuid: this.blockUuid,
        key: this.key,
      });
    } catch (cause) {
      throw new JsqError("runtime", this.blockUuid, cause);
    }
    return result;
  }

  private render(content: unknown) {
    logseq.provideUI({
      key: this.key,
      slot: this.slotId,
      reset: true,
      template: minify(`
    <div class="relative w-full">
      ${uniqueCodeToggleBtn()}
      <div class="relative w-full mt-5">${content}</div>
    </div>
  `),
    });
  }
}
