import { jsq } from "./jsq";

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

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

export async function executeLocalJsq(slotId: string, blockUuid: string) {
  const jsqUserCode = await getLocalJsqBlockContents(blockUuid);

  let userFunction;
  let userFunctionResult;

  try {
    userFunction = new AsyncFunction("jsq", "logseq", jsqUserCode);
  } catch (e) {
    console.error("jsq block failed to compile:", e);
    renderBlock(
      slotId,
      blockUuid,
      `<code style="color:red"> jsq block failed to compile: ${e} </code>`,
    );
    return;
  }

  try {
    userFunctionResult = await userFunction(jsq, logseq);
  } catch (e) {
    console.error("jsq block threw:", e);
  }

  renderBlock(slotId, blockUuid, userFunctionResult);
}

function renderBlock(slotId: string, blockUuid: string, content: string) {
  const toggleId = crypto.randomUUID();

  const codeToggle = `<button
  data-on-click="toggleCode"
  data-toggle-id="${toggleId}"
  title="Show/hide code"
  class="absolute top-0 left-0 z-10 px-1.5 text-xs font-mono opacity-30 hover:opacity-100 transition-opacity cursor-pointer bg-transparent"
>show/hide jsq block &lt;/&gt;</button>`;

  logseq.provideUI({
    key: "jsq",
    slot: slotId,
    reset: true,
    template: `
    <div class="relative w-full">
      ${codeToggle}
      <div class="relative w-full">${content}</div>
    </div>
  `,
  });
}
