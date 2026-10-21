import { defineConfig } from 'tsdown'
import { readFile } from 'node:fs/promises'


export default defineConfig({
  dts: false,
  exports: false,
  platform: 'browser',
  plugins: [{
    name: 'jsv-css-text',
    async load(id) {
      if (!id.endsWith('.css?raw')) return null;
      const path = id.slice(0, -'?raw'.length);
      this.addWatchFile(path);
      return `export default ${JSON.stringify(await readFile(path, 'utf8'))};`;
    },
  }],
  deps: {
    alwaysBundle: ['@logseq/libs'],
  },
}) 