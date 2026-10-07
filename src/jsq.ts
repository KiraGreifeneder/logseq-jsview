const JSQ_BLOCK_REGEX = /^\x60{3}jsq[ \t]*\r?\n([\s\S]*?)\r?\n?^\x60{3}[ \t]*$/m;

export function findJsqBlock() { }

export async function executeLocalJsq(slotId: string, blockUuid: string) {
  const block = await logseq.Editor.getBlock(blockUuid);
  const jsq_block_matches = block?.content?.match(JSQ_BLOCK_REGEX);
  if (!jsq_block_matches) {
    console.error("no valid jsq block found");
    return;
  }

  //parse jsq block
  const jsq_block_contents = jsq_block_matches[1];
  console.log(jsq_block_contents);
  const out = new Function(jsq_block_contents);

  logseq.provideUI({
    key: "jsq",
    slot: slotId,
    reset: true,
    // TODO insert whatever we wanted to render here
    template: `
            ${out()}
        `,
  });
}