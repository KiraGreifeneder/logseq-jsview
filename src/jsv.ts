/**
 * Represents the public API for JSView.
 * All functions here are exported and provided through the `jsv` in their codeblocks.
 */

import type { BlockEntity, PageEntity } from "@logseq/libs/dist/LSPlugin.user";
import { button } from "./ui/buttons";
import { type Props, Table } from "./ui/table";

async function datascriptQuery(query: string) {
  return await logseq.DB.datascriptQuery(query);
}

async function simpleQuery(query: string) {
  return await logseq.DB.q(query);
}

async function allPages(): Promise<PageEntity[]> {
  const allPagesQuery = `
      [
        :find (pull ?p [*])
        :where
          [?p :block/name]
      ]`;

  return await datascriptQuery(allPagesQuery);
}

async function pageByName(name: string): Promise<PageEntity | undefined> {
  const pageByNameQuery = `
      [
        :find (pull ?p [*])
        :where
          [?p :block/name "${name.toLowerCase()}"]
      ]`;

  const matches: PageEntity[][] =
    await logseq.DB.datascriptQuery(pageByNameQuery);

  if (!matches || !matches[0]) return undefined;

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
