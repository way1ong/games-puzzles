// Builds one self-contained file of a game for a claude.ai test page: the game's CSS and JS inline, plus
// games/<game>/styles/claude-page.css. claude.ai wraps the file in its own <html>/<head>/<body>, so the
// file starts with <title> and <style>. The game is built alone for this (ONLY_GAME in vite.config.ts), so
// its script holds everything it needs: in the usual build the games share some code as separate files.
//   node scripts/claude-page.mjs [game ...]   →   dist/claude/<game>.html   (no game — every game)
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
/** Page name in the claude.ai gallery: the game's working name (docs/DECISIONS.md). */
const TITLES = { blocks: 'way1ong Blocks', detective: 'way1ong Detective', pairs: 'way1ong Pairs', solitaire: 'way1ong Solitaire', sudoku: 'way1ong Sudoku', words: 'way1ong Words' };
const games = process.argv.length > 2 ? process.argv.slice(2) : Object.keys(TITLES);

for (const game of games) {
  const title = TITLES[game];
  if (!title) throw new Error(`No title for ${game} in scripts/claude-page.mjs`);

  const built = join(root, 'node_modules', '.cache', 'way1ong-claude', game);
  const run = spawnSync('npx', ['vite', 'build', '--logLevel', 'warn'], { cwd: root, stdio: 'inherit', env: { ...process.env, ONLY_GAME: game } });
  if (run.status !== 0) throw new Error(`The build of ${game} failed`);

  const html = readFileSync(join(built, game, 'index.html'), 'utf8');
  const only = (re, kind) => {
    const found = [...html.matchAll(re)];
    if (found.length !== 1) throw new Error(`${game}: expected one ${kind} in the page, found ${found.length}`);
    return readFileSync(join(built, found[0][1]), 'utf8');
  };
  const js = only(/<script type="module"[^>]*src="\/([^"]+\.js)"/g, 'script');
  const css = only(/<link rel="stylesheet"[^>]*href="\/([^"]+\.css)"/g, 'style sheet');
  if (/<link rel="modulepreload"/.test(html)) throw new Error(`${game}: the script is split into several files`);
  const pageCss = readFileSync(join(root, 'games', game, 'styles', 'claude-page.css'), 'utf8');

  const page = [
    `<title>${title}</title>`,
    '<meta name="claude:viewport-fit-sides" content="cover">',
    '<meta name="description" content="">',
    '<meta name="theme-color" content="">',
    `<style>${css.replace(/<\/style/gi, '<\\/style')}</style>`,
    `<style>${pageCss.replace(/<\/style/gi, '<\\/style')}</style>`,
    '<div id="app"></div>',
    `<script type="module">${js.replace(/<\/script/gi, '<\\/script')}</script>`,
    '',
  ].join('\n');

  const out = join(root, 'dist', 'claude', `${game}.html`);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, page);
  console.log(`${out} (${Math.round(page.length / 1024)} KB)`);
}
