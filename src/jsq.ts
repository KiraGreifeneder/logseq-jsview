import { BlockEntity, PageEntity } from "@logseq/libs/dist/LSPlugin.user";

const JSQ_BLOCK_REGEX = /^\x60{3}jsq[ \t]*\r?\n([\s\S]*?)\r?\n?^\x60{3}[ \t]*$/m;
const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor;

export function findJsqBlock() { }

export async function executeLocalJsq(slotId: string, blockUuid: string) {
  const block = await logseq.Editor.getBlock(blockUuid);
  const jsq_block_matches = block?.content?.match(JSQ_BLOCK_REGEX);
  if (!jsq_block_matches) {
    console.error("no valid jsq block found");
    return;
  }

  //parse jsq block
  const jsq_block_contents = jsq_block_matches[1];

  const test = new Jsq();

  console.log(jsq_block_contents);

  let out;
  let result;
  try {
    out = new AsyncFunction("logseq", jsq_block_contents); // SyntaxError here
  } catch (e) {
    console.error("jsq block failed to compile:", e);
    return;
  }

  try {
    result = await out(logseq); // runtime errors and rejections here
  } catch (e) {
    console.error("jsq block threw:", e);
  }

  logseq.provideUI({
    key: "jsq",
    slot: slotId,
    reset: true,
    // TODO insert whatever we wanted to render here
    template: `
            ${result}
        `,
  });
}



export class Jsq {
  async nativeQuery(query: string) {
    return await logseq.DB.datascriptQuery(query);
  }

  async pages() : Promise<PageEntity[]> {
    const allPagesQuery = `
      [
        :find (pull ?p [*])
        :where
          [?p :block/name]
      ]`
    
    return await logseq.DB.datascriptQuery(allPagesQuery);
  }

  async pageByName(name: string) : Promise<PageEntity> {
    const pageByNameQuery = `
      [
        :find (pull ?p [*])
        :where
          [?p :block/name "${name.toLowerCase()}"]
      ]`
    
    const matches : PageEntity[][] = await logseq.DB.datascriptQuery(pageByNameQuery);

    return matches[0][0];
  }

  async blocks(pageUuid: string) : Promise<BlockEntity[]> {
    return await logseq.Editor.getPageBlocksTree(pageUuid);
  }

  async test() {
    return "hello!"
  }
}