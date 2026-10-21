export async function checkTrust(): Promise<boolean> {
  const trustedPaths: unknown = logseq.settings?.["trustedPaths"] ?? [];

  if (
    !Array.isArray(trustedPaths) ||
    !trustedPaths.every(
      (path: unknown): path is string =>
        typeof path === "string" && path.trim().length > 0,
    )
  ) {
    console.error("[jsv] Invalid trustedPaths setting:", trustedPaths);
    await logseq.UI.showMsg(
      "JSView: trustedPaths must be an array of non-empty graph paths. Check plugin settings.",
      "error",
    );
    return false;
  }

  const graph = await logseq.App.getCurrentGraph();
  if (!graph || typeof graph.path !== "string" || !graph.path) {
    await logseq.UI.showMsg(
      "JSView: Cannot determine the current graph path. Code execution is blocked.",
      "error",
    );
    return false;
  }

  if (trustedPaths.includes(graph.path)) return true;

  await logseq.UI.showMsg(
    `JSView: Graph "${graph.path}" is not trusted. Add its exact path to trustedPaths in plugin settings only if you trust its code.`,
    "error",
  );
  return false;
}
