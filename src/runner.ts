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
    logseq.provideUI({
      key: "jsq",
      slot: slotId,
      reset: true,
      template: `
            <code style="color:red"> jsq block failed to compile: ${e} </code>
        `,
    });
    return;
  }

  try {
    userFunctionResult = await userFunction(jsq, logseq);
  } catch (e) {
    console.error("jsq block threw:", e);
  }

  logseq.provideUI({
    key: "jsq",
    slot: slotId,
    reset: true,
    template: `
            ${userFunctionResult}
        `,
  });
}
