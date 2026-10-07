import '@logseq/libs';
import { executeLocalJsq } from './jsq';



async function main() {
  logseq.Editor.registerSlashCommand('New in-line JSQ', async () => {
    await logseq.Editor.insertAtEditingCursor(
      `{{renderer :jsq}} `,
    );
  });

  logseq.provideModel({
    
  });

  logseq.App.onMacroRendererSlotted(({ slot, payload }) => {
    const [type] = payload.arguments;
    if (!type?.startsWith(':jsq')) return;
    executeLocalJsq(slot, payload.uuid);  // find local jsq block

    // TODO handle custom jsq scripts somewhere that are referenced via jsq_functionname
  });
}



logseq.ready(main).catch(console.error);