import { defineConfig } from 'tsdown'


export default defineConfig({
  dts: false,
  exports: false,
  platform: 'browser',
  deps: {
    alwaysBundle: ['@logseq/libs'],
  },
}) 