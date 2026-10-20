import { jsq } from "../lib/jsq";

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const minify = (html: string) => html.replace(/>\s+</g, "><").trim();

type DebugInfo = {
  slotId: string;
  blockUuid: string;
  key: string;
};

export async function getLocalJsqBlockContents(blockUuid: string) {
  const JSQ_BLOCK_REGEX =
    /^\x60{3}jsq[ \t]*\r?\n([\s\S]*?)\r?\n?^\x60{3}[ \t]*$/m;

  const block = await logseq.Editor.getBlock(blockUuid);
  const jsq_block_matches = block?.content?.match(JSQ_BLOCK_REGEX);
  if (!jsq_block_matches) {
    console.error("no valid jsq block found");
    return;
  }

  return jsq_block_matches[1];
}

export async function executeLocalJsq(
  slotId: string,
  blockUuid: string,
  key: string,
) {
  const jsqUserCode = await getLocalJsqBlockContents(blockUuid);
  console.log("GOT USER CODE FOR UUID", blockUuid, jsqUserCode);
  let userFunction;
  let userFunctionResult: any;

  try {
    userFunction = new AsyncFunction("jsq", "logseq", "debug", jsqUserCode);
  } catch (e) {
    console.error("jsq block failed to compile:", e);
    renderBlock(
      slotId,
      blockUuid,
      `<code style="color:red"> jsq block failed to compile: ${e} </code>`,
    );
    return;
  }

  const debug: DebugInfo = {
    slotId: slotId,
    blockUuid: blockUuid,
    key,
  };

  try {
    userFunctionResult = await userFunction(jsq, logseq, debug);
  } catch (e) {
    console.error("jsq block threw:", e);
  }

  console.log("RENDERING code", jsqUserCode, "INTO", slotId, blockUuid);
  renderBlock(slotId, blockUuid, userFunctionResult);
}

function renderBlock(slotId: string, key: string, content: any) {
  const toggleId = crypto.randomUUID();

  const codeToggle = `<button
  data-on-click="toggleCode"
  data-toggle-id="${toggleId}"
  title="Show/hide code"
  class="absolute top-0 left-0 z-10 px-1.5 text-xs font-mono opacity-30 hover:opacity-100 transition-opacity cursor-pointer bg-transparent"
>show/hide jsq block &lt;/&gt;</button>`;

  logseq.provideUI({
    key: key,
    slot: slotId,
    reset: true,
    template: minify(`
    <div class="relative w-full">
      ${codeToggle}
      <div class="relative w-full mt-3">${content}</div>
    </div>
  `),
  });
}
