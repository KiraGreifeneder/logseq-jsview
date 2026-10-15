import "@logseq/libs";
import { executeLocalJsq } from "./runner";

function registerJsqMode() {
  const CM = (window.parent as any).CodeMirror;
  if (!CM) {
    console.warn("host CodeMirror not found");
    return;
  }
  CM.defineMIME("jsq", "javascript");
}

async function main() {
  registerJsqMode();
  logseq.Editor.registerSlashCommand("New in-line JSQ", async () => {
    await logseq.Editor.insertAtEditingCursor(`{{renderer :jsq}} `);
  });

  logseq.App.onMacroRendererSlotted(({ slot, payload }) => {
    const [type] = payload.arguments;
    if (!type?.startsWith(":jsq")) return;
    executeLocalJsq(slot, payload.uuid); // find local jsq block

    // TODO handle custom jsq scripts somewhere that are referenced via jsq_functionname
  });
}

logseq.ready(main).catch(console.error);
