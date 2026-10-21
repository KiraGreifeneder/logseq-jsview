/**
 * Helpers available through `jsv` in your codeblocks.
 * You can also use `logseq` directly if a helper doesn't cover what you need.
 */

import type { BlockEntity, PageEntity } from "@logseq/libs/dist/LSPlugin.user";
import { button } from "./ui/buttons";
import { type Props, Table } from "./ui/table";

/**
 * Runs a Datalog query through Logseq's DataScript API.
 * The result shape depends on your query. This doesn't flatten or convert it.
 * See the docs (link to be added) for the result shape.
 *
 * @param query - The full Datalog query as a string.
 * @example
 * const rows = await jsv.datascriptQuery(`
 *   [:find (pull ?p [*]) :where [?p :block/name]]
 * `);
 * const pages = rows.map(([page]) => page);
 */
async function datascriptQuery(
  query: string,
): Promise<(PageEntity | BlockEntity)[]> {
  return (await logseq.DB.datascriptQuery(query)) ?? [];
}

/**
 * Runs a Logseq simple query, the same syntax you'd use in a native query block.
 * Returns the result from `logseq.DB.q()` unchanged.
 *
 * @example
 * const blocks = await jsv.simpleQuery('(property :deadline-name)');
 */
async function simpleQuery(
  query: string,
): Promise<(PageEntity | BlockEntity)[]> {
  return (await logseq.DB.q(query)) ?? [];
}

/**
 * Queries all pages in the graph.
 *
 * Currently returns the raw DataScript rows: `[[page], [page], ...]`.
 * The `PageEntity[]` return annotation doesn't match that shape yet.
 *
 * @example
 * const rows = await jsv.allPages();
 * for (const [page] of rows) {
 *   console.log(page.name);
 * }
 */
async function allPages(): Promise<PageEntity[]> {
  const allPagesQuery = `
      [
        :find (pull ?p [*])
        :where
          [?p :block/name]
      ]`;

  return (await datascriptQuery(allPagesQuery)) as PageEntity[];
}

/**
 * Finds a page by name, ignoring case.
 * Returns `undefined` if no page matches.
 *
 * The name is currently inserted into a Datalog string without escaping.
 * Names containing quotes aren't supported reliably yet.
 *
 * @example
 * const page = await jsv.pageByName("Projects");
 * if (!page) throw new Error("Couldn't find Projects");
 */
async function pageByName(name: string): Promise<PageEntity | undefined> {
  const pageByNameQuery = `
      [
        :find (pull ?p [*])
        :where
          [?p :block/name "${name.toLowerCase()}"]
      ]`;

  const matches: PageEntity[][] =
    await logseq.DB.datascriptQuery(pageByNameQuery);

  return matches[0] && matches[0][0];
}

/**
 * Gets a page's block tree through `logseq.Editor.getPageBlocksTree()`.
 * Nested blocks stay in their parent's `children` array, not a flat list.
 *
 * @param pageUuid - The UUID of the page.
 * @example
 * const page = await jsv.pageByName("Projects");
 * if (!page) throw new Error("Couldn't find Projects");
 * const blocks = await jsv.blocksInPage(page.uuid);
 */
async function blocksInPage(pageUuid: string): Promise<BlockEntity[]> {
  return await logseq.Editor.getPageBlocksTree(pageUuid);
}

/**
 * Creates a table. Add headers and rows, then return it from your block.
 *
 * @param props - Optional HTML attributes for the table, e.g. `{ class: "my-table" }`.
 * @returns A {@link Table} that you can keep adding rows to.
 * @example
 * return jsv.table()
 *   .headers(["Task", "Status"])
 *   .row(["Write docs", "Done"]);
 */
function table(props?: Props) {
  return new Table(props);
}

/**
 * Registers a named callback for HTML with `data-on-click="name"`.
 * Logseq passes callback data with a `dataset` containing your `data-*` values.
 * Names are shared across blocks, so use a unique name to avoid replacing one.
 * `jsv.button()` registers its callback for you.
 *
 * @example
 * jsv.registerFunction("open-projects", () => {
 *   logseq.App.pushState("page", { name: "projects" });
 * });
 * return '<a data-on-click="open-projects">Projects</a>';
 */
function registerFunction(name: string, func: Function) {
  logseq.provideModel({
    [name]: func,
  });
}

/** The API passed into every `jsv` codeblock. */
export const jsv = {
  blocksInPage,
  datascriptQuery,
  allPages,
  pageByName,
  simpleQuery,
  table,
  button,
  registerFunction,
};
