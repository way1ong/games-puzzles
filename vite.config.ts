import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { BLOCKS } from './games/blocks/config.ts';
import blocksEn from './games/blocks/i18n/en.json' with { type: 'json' };
import { DETECTIVE } from './games/detective/config.ts';
import detectiveEn from './games/detective/i18n/en.json' with { type: 'json' };
import { MINES } from './games/mines/config.ts';
import minesEn from './games/mines/i18n/en.json' with { type: 'json' };
import { POUR } from './games/pour/config.ts';
import pourEn from './games/pour/i18n/en.json' with { type: 'json' };
import { NONOGRAMS } from './games/nonograms/config.ts';
import nonogramsEn from './games/nonograms/i18n/en.json' with { type: 'json' };
import { PAIRS } from './games/pairs/config.ts';
import pairsEn from './games/pairs/i18n/en.json' with { type: 'json' };
import { SLIDE } from './games/slide/config.ts';
import slideEn from './games/slide/i18n/en.json' with { type: 'json' };
import { SOLITAIRE } from './games/solitaire/config.ts';
import solitaireEn from './games/solitaire/i18n/en.json' with { type: 'json' };
import { SUDOKU } from './games/sudoku/config.ts';
import sudokuEn from './games/sudoku/i18n/en.json' with { type: 'json' };
import { WORDS } from './games/words/config.ts';
import wordsEn from './games/words/i18n/en.json' with { type: 'json' };
import { gameApps, type GameApp } from './scripts/pwa.ts';

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url));

// Every game is its own page under games/<name>/ and is served at /<name>/; it installs and works offline.
const GAMES: GameApp[] = [
  { game: 'blocks', name: BLOCKS.name, shortName: blocksEn.app.name, description: blocksEn.meta.description, lang: 'en' },
  { game: 'detective', name: DETECTIVE.name, shortName: detectiveEn.app.name, description: detectiveEn.meta.description, lang: 'en' },
  { game: 'mines', name: MINES.name, shortName: minesEn.app.name, description: minesEn.meta.description, lang: 'en' },
  { game: 'pour', name: POUR.name, shortName: pourEn.app.name, description: pourEn.meta.description, lang: 'en' },
  { game: 'nonograms', name: NONOGRAMS.name, shortName: nonogramsEn.app.name, description: nonogramsEn.meta.description, lang: 'en' },
  { game: 'pairs', name: PAIRS.name, shortName: pairsEn.app.name, description: pairsEn.meta.description, lang: 'en' },
  { game: 'slide', name: SLIDE.name, shortName: slideEn.app.name, description: slideEn.meta.description, lang: 'en' },
  { game: 'solitaire', name: SOLITAIRE.name, shortName: solitaireEn.app.name, description: solitaireEn.meta.description, lang: 'en' },
  { game: 'sudoku', name: SUDOKU.name, shortName: sudokuEn.app.name, description: sudokuEn.meta.description, lang: 'en' },
  { game: 'words', name: WORDS.name, shortName: wordsEn.app.name, description: wordsEn.meta.description, lang: 'en' },
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
    // A test page is one file: files a game loads (Words' word lists) go inside it as data addresses. On the
    // site the lists and their notices stay files of their own, however small (their licences want them
    // separate and replaceable).
    assetsInlineLimit: only ? () => true : (file) => (file.endsWith('.txt') ? false : undefined),
    rollupOptions: {
      input: Object.fromEntries(games.map((app) => [app.game, here(`games/${app.game}/index.html`)])),
    },
  },
  test: {
    root: here('.'),
    include: ['games/**/*.test.ts', 'shared/**/*.test.ts', 'scripts/**/*.test.ts'],
    // Tests read style sheets as text (`?raw`) to check the colour tokens.
    css: { include: [/\.css(\?raw)?$/] },
  },
});
