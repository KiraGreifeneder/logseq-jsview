import "@logseq/libs";
import { executeLocalJsq } from "./core/runner";
import { jsq } from "./lib/jsq";

const JSQ_BLOCK = `
  ${"```"}jsq

  ${"```"}
  {{renderer :jsq}}
`;

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
      display: none;
    }
    .block-content.jsq-code-open .extensions__code {
      display: block;
    }
  `,
  });

  logseq.provideStyle({
    key: "jsq-table-width",
    style: `
    .lsp-hook-ui-slot,
    .lsp-hook-ui-slot > * { width: 100% !important; max-width: 100% !important; margin: 0 !important; }
    .lsp-hook-ui-slot table { width: 100% !important; }
  `,
  });

  jsq.registerFunction("toggleCode", (e: any) => {
    const doc = top?.document;
    const btn = doc?.querySelector(`[data-toggle-id="${e.dataset.toggleId}"]`);
    const block = btn?.closest(".block-content");
    if (!block) return;

    block.classList.toggle("jsq-code-open");

    if (block.classList.contains("jsq-code-open")) {
      // wait one tick so the browser has laid out the now-visible element
      setTimeout(() => {
        block
          .querySelectorAll(".CodeMirror")
          .forEach((el: any) => el.CodeMirror?.refresh());
      }, 0);
    }
  });

  registerJsqMode();

  logseq.Editor.registerSlashCommand("New in-line JSQ", async () => {
    await logseq.Editor.insertAtEditingCursor(JSQ_BLOCK);
  });

  logseq.App.onMacroRendererSlotted(({ slot, payload }) => {
    const [type] = payload.arguments;
    if (!type?.startsWith(":jsq")) return;
    executeLocalJsq(slot, payload.uuid); // find local jsq block

    // TODO handle custom jsq scripts somewhere that are referenced via jsq_functionname
  });
}

logseq.ready(main).catch(console.error);
