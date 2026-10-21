import type { BlockEntity, PageEntity } from "@logseq/libs/dist/LSPlugin.user";
import { button } from "./ui/buttons";
import { registerFunction } from "./core/callbacks";
import { type Props, Table } from "./ui/table";

async function datascriptQuery<T = unknown>(
  query: string,
): Promise<T> {
  return logseq.DB.datascriptQuery<T>(query);
}

async function simpleQuery(
  query: string,
): Promise<(PageEntity | BlockEntity)[]> {
  return (await logseq.DB.q<PageEntity | BlockEntity>(query)) ?? [];
}

async function allPages(): Promise<PageEntity[]> {
  const allPagesQuery = `
      [
        :find (pull ?p [*])
        :where
          [?p :block/name]
      ]`;

  const rows = await datascriptQuery<[PageEntity][]>(allPagesQuery);
  return rows.map(([page]) => page);
}

async function pageByName(name: string): Promise<PageEntity | undefined> {
  return (await logseq.Editor.getPage(name)) ?? undefined;
}

function blocksInPage(pageUuid: string): Promise<BlockEntity[]> {
  return logseq.Editor.getPageBlocksTree(pageUuid);
}

function table(props?: Props) {
  return new Table(props);
}

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
