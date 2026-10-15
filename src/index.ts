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
  logseq.provideStyle({
    key: "hide-jsq-code",
    style: `
    .block-content:has(.lsp-hook-ui-slot) .extensions__code {
      max-height: 8px;
      overflow: hidden;
      opacity: 0.35;
      transition: max-height .15s ease .3s, opacity .15s ease .3s;
    }
    .block-content:has(.lsp-hook-ui-slot) .extensions__code:hover {
      max-height: 100vh;
      opacity: 1;
      transition-delay: .25s, .25s;
    }
    .block-content:has(.lsp-hook-ui-slot) .extensions__code:focus-within {
      max-height: 100vh;
      opacity: 1;
      transition-delay: 0s;
    }
  `,
  });

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
