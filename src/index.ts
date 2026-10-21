import "@logseq/libs";
import { JsvExecutor } from "./core/executor";
import { jsv } from "./jsv";
import { initSettings } from "./settings";
import styles from "./ui/styles.css?raw";
import { clearCallbacks, dispatchCallback, pruneCallbacks } from "./core/callbacks";

type CodeMirrorElement = Element & { CodeMirror?: { refresh(): void } };

function getNewJsvBlock() {
  const uuid = crypto.randomUUID();
  return `
  ${"```"}jsv

  ${"```"}
  {{renderer :jsv-${uuid}}}
`;
}

function registerJsvMode() {
  const CM = (window.parent as Window & {
    CodeMirror?: { defineMIME(name: string, mode: string): void };
  }).CodeMirror;
  if (!CM) {
    console.warn("host CodeMirror not found");
    return;
  }
  CM.defineMIME("jsv", "javascript");
}

async function main() {
  initSettings();

  logseq.provideStyle({
    key: "jsv-styles",
    style: styles,
  });

  logseq.provideModel({ jsvDispatch: dispatchCallback });
  const doc = top?.document;
  if (doc) {
    const observer = new MutationObserver(() => pruneCallbacks(doc));
    observer.observe(doc.body, { childList: true, subtree: true });
    logseq.beforeunload(async () => observer.disconnect());
  }
  logseq.App.onCurrentGraphChanged(() => {
    clearCallbacks();
    registerToggleCode();
  });

  function registerToggleCode() {
    jsv.registerFunction("toggleCode", (e) => {
      const btn = doc?.querySelector(`[data-toggle-id="${e.dataset.toggleId}"]`);
      const block = btn?.closest(".block-content");
      if (!block) return;

      block.classList.toggle("jsv-code-open");

      if (block.classList.contains("jsv-code-open")) {
        // wait one tick so the browser has laid out the now-visible element
        setTimeout(() => {
          block
            .querySelectorAll(".CodeMirror")
            .forEach((el: CodeMirrorElement) => el.CodeMirror?.refresh());
        }, 0);
      }
    });
  }
  registerToggleCode();

  registerJsvMode();

  logseq.Editor.registerSlashCommand("New in-line JSView", async () => {
    await logseq.Editor.insertAtEditingCursor(getNewJsvBlock());
  });

  logseq.App.onMacroRendererSlotted(({ slot, payload }) => {
    const [type] = payload.arguments;
    if (!type?.startsWith(":jsv")) return;

    const executor = new JsvExecutor(payload.uuid, slot, type.substring(1));
    executor.execute().catch((error: unknown) => {
      console.error("[jsv] Failed to report execution error", error);
    });
  });
}

logseq.ready(main).catch(console.error);
