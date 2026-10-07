import '@logseq/libs';

const JSQ_BLOCK_REGEX = /^\x60{3}jsq[ \t]*\r?\n([\s\S]*?)\r?\n?^\x60{3}[ \t]*$/m;

async function main() {
  logseq.Editor.registerSlashCommand('New in-line JSQ', async () => {
    await logseq.Editor.insertAtEditingCursor(
      `{{renderer :jsq}} `,
    );
  });

  logseq.provideModel({
    async executeLocalJsq(e: any) {
      const { jsqId, slotId, blockUuid } = e.dataset;
      const block = await logseq.Editor.getBlock(blockUuid);
      const jsq_block_matches = block?.content?.match(JSQ_BLOCK_REGEX);
      if (!jsq_block_matches) {
        console.error("no valid jsq block found");
        return;
      }

      //parse jsq block
      const jsq_block_contents = jsq_block_matches[1];
      eval(jsq_block_contents);
    }
  });

  logseq.App.onMacroRendererSlotted(({ slot, payload }) => {
    const [type] = payload.arguments;
    if (!type?.startsWith(':jsq')) return;

    return logseq.provideUI({
      key: "jsq",
      slot, reset: true,
      template: `
          <button
          data-slot-id="${slot}" 
          data-block-uuid="${payload.uuid}"
          data-on-click="executeLocalJsq">
          Execute da block
          </button>
        `,
    });
  });

}



logseq.ready(main).catch(console.error);