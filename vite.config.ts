import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url));

// Every game is its own page under games/<name>/ and is served at /<name>/.
export default defineConfig({
  root: here('games'),
  base: '/',
  build: {
    outDir: here('dist'),
    emptyOutDir: true,
    // One script per game, nothing loaded later: no preload helper (it would be the only fetch in the bundle).
    modulePreload: { polyfill: false },
    rollupOptions: {
      input: { blocks: here('games/blocks/index.html') },
    },
  },
  test: {
    root: here('.'),
    include: ['games/**/*.test.ts', 'shared/**/*.test.ts'],
    // Tests read style sheets as text (`?raw`) to check the colour tokens.
    css: { include: [/\.css(\?raw)?$/] },
  },
});
