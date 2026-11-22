// Builds one self-contained file of a game for a claude.ai test page: the built CSS and JS inline, plus
// games/<game>/styles/claude-page.css. claude.ai wraps the file in its own <html>/<head>/<body>, so the
// file starts with <title> and <style>. Run after `vite build`:
//   node scripts/claude-page.mjs [game]   →   dist/claude/<game>.html
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const game = process.argv[2] ?? 'blocks';
/** Page name in the claude.ai gallery: the game's working name (docs/DECISIONS.md). */
const TITLES = { blocks: 'way1ong Blocks' };

const dist = join(root, 'dist');
const html = readFileSync(join(dist, game, 'index.html'), 'utf8');
const asset = (re, kind) => {
  const match = html.match(re);
  if (!match) throw new Error(`No ${kind} in dist/${game}/index.html — run vite build first`);
  return readFileSync(join(dist, match[1]), 'utf8');
};
const js = asset(/<script type="module"[^>]*src="\/([^"]+\.js)"/, 'script');
const css = asset(/<link rel="stylesheet"[^>]*href="\/([^"]+\.css)"/, 'style sheet');
const pageCss = readFileSync(join(root, 'games', game, 'styles', 'claude-page.css'), 'utf8');

const title = TITLES[game];
if (!title) throw new Error(`No title for ${game} in scripts/claude-page.mjs`);

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

const out = join(dist, 'claude', `${game}.html`);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, page);
console.log(`${out} (${Math.round(page.length / 1024)} KB)`);
