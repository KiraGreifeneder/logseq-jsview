/**
 * Represents the public interface for jsq.
 * All functions here are exported and provided through the `jsq` in their codeblocks.
 */

import { BlockEntity, PageEntity } from "@logseq/libs/dist/LSPlugin.user";
import { button } from "./ui/button";
import { Props, Table } from "./ui/table";

async function datascriptQuery(query: string) {
  return await logseq.DB.datascriptQuery(query);
}

async function simpleQuery(query: string) {
  return await logseq.DB.q(query);
}

// TODO separa queryBuilder that lets you build a native query for efficiency
// that creates a string that we can pass to nativeQuery()
// would be cross-platform as we cans simply choose the correct backend

async function allPages(): Promise<PageEntity[]> {
  const allPagesQuery = `
      [
        :find (pull ?p [*])
        :where
          [?p :block/name]
      ]`;

  return await datascriptQuery(allPagesQuery);
}

async function pageByName(name: string): Promise<PageEntity> {
  const pageByNameQuery = `
      [
        :find (pull ?p [*])
        :where
          [?p :block/name "${name.toLowerCase()}"]
      ]`;

  const matches: PageEntity[][] =
    await logseq.DB.datascriptQuery(pageByNameQuery);

  return matches[0][0];
}

async function blocksInPage(pageUuid: string): Promise<BlockEntity[]> {
  return await logseq.Editor.getPageBlocksTree(pageUuid);
}

function table(props?: Props) {
  return new Table(props);
}

function registerFunction(name: string, func: Function) {
  logseq.provideModel({
    [name]: func,
  });
}

export const jsq = {
  blocksInPage,
  datascriptQuery,
  allPages,
  pageByName,
  simpleQuery,
  table,
  button,
  registerFunction,
};
