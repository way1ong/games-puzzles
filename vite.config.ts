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
    rollupOptions: {
      input: { blocks: here('games/blocks/index.html') },
    },
  },
  test: {
    root: here('.'),
    include: ['games/**/*.test.ts', 'shared/**/*.test.ts'],
  },
});
