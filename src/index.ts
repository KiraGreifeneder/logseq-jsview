import "@logseq/libs";
import { JsqExecutor } from "./core/executor";
import { jsq } from "./jsq";
import { initSettings } from "./settings";
import styles from "./ui/styles.css?raw";

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

async function main() {
  initSettings();

  logseq.provideStyle({
    key: "jsq-styles",
    style: styles,
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
    await logseq.Editor.insertAtEditingCursor(getNewJsqBlock());
  });

  logseq.App.onMacroRendererSlotted(({ slot, payload }) => {
    const [type] = payload.arguments;
    if (!type?.startsWith(":jsq")) return;

    const executor = new JsqExecutor(payload.uuid, slot, type.substring(1));
    executor.execute();
  });
}

logseq.ready(main).catch(console.error);
