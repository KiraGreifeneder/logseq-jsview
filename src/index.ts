import "@logseq/libs";
import { executeLocalJsq } from "./core/runner";
import { jsq } from "./lib/jsq";
import { initSettings } from "./settings";

function getNewJsqBlock() {
  const uuid = crypto.randomUUID();
  return `
  ${"```"}jsq

  ${"```"}
  {{renderer :jsq-${uuid}}}
`;
}

function registerJsqMode() {
  const CM = (window.parent as any).CodeMirror;
  if (!CM) {
    console.warn("host CodeMirror not found");
    return;
  }
  CM.defineMIME("jsq", "javascript");
}

function provideJsqBlockStyles() {
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
}

async function main() {
  initSettings();
  provideJsqBlockStyles();

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
    await logseq.Editor.insertAtEditingCursor(getNewJsqBlock());
  });

  logseq.App.onMacroRendererSlotted(({ slot, payload }) => {
    const [type] = payload.arguments;
    if (!type?.startsWith(":jsq")) return;

    console.log(
      "FOUND AND STARTING WORK FOR SLOT, UUID",
      slot,
      payload.uuid,
      type,
    );
    executeLocalJsq(slot, payload.uuid, type.substring(1));

    // TODO handle custom jsq scripts somewhere that are referenced via jsq-exported-functionname
  });
}

logseq.ready(main).catch(console.error);
