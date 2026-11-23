import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { BLOCKS } from './games/blocks/config.ts';
import blocksEn from './games/blocks/i18n/en.json' with { type: 'json' };
import { DETECTIVE } from './games/detective/config.ts';
import detectiveEn from './games/detective/i18n/en.json' with { type: 'json' };
import { gameApps, type GameApp } from './scripts/pwa.ts';

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url));

// Every game is its own page under games/<name>/ and is served at /<name>/; it installs and works offline.
const GAMES: GameApp[] = [
  { game: 'blocks', name: BLOCKS.name, shortName: blocksEn.app.name, description: blocksEn.meta.description, lang: 'en' },
  { game: 'detective', name: DETECTIVE.name, shortName: detectiveEn.app.name, description: detectiveEn.meta.description, lang: 'en' },
];

// A test page is one game in one file (scripts/claude-page.mjs sets ONLY_GAME): built alone, the game's
// script holds everything it needs — nothing shared with another game is split off into a file of its own.
const only = process.env.ONLY_GAME;
const games = only ? GAMES.filter((app) => app.game === only) : GAMES;
if (games.length === 0) throw new Error(`No game "${only}"`);

export default defineConfig({
  root: here('games'),
  base: '/',
  plugins: [gameApps(here('.'), games)],
  build: {
    outDir: only ? here(`node_modules/.cache/way1ong-claude/${only}`) : here('dist'),
    emptyOutDir: true,
    // One script per game, nothing loaded later: no preload helper (it would be the only fetch in the bundle).
    modulePreload: { polyfill: false },
    rollupOptions: {
      input: Object.fromEntries(games.map((app) => [app.game, here(`games/${app.game}/index.html`)])),
    },
  },
  test: {
    root: here('.'),
    include: ['games/**/*.test.ts', 'shared/**/*.test.ts'],
    // Tests read style sheets as text (`?raw`) to check the colour tokens.
    css: { include: [/\.css(\?raw)?$/] },
  },
});
