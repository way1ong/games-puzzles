// Draws the icons of a game from its colour tokens (games/<game>/styles/tokens.css, light theme):
// three blocks and one empty place in a 2 × 2 grid — "fill the gap". Our own picture, not taken from any game.
// Needs Playwright (preinstalled in the cloud session). Run: node scripts/make-icons.mjs blocks
// Writes games/<game>/icons/: icon.svg (browser tab), icon-192.png, icon-512.png, icon-maskable-512.png,
// apple-touch-icon.png (180 × 180).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const game = process.argv[2] ?? 'blocks';
const css = readFileSync(join(root, 'games', game, 'styles', 'tokens.css'), 'utf8');
const lightBlock = css.slice(css.indexOf(':root {'), css.indexOf('}', css.indexOf(':root {')));
const token = (name) => {
  const m = lightBlock.match(new RegExp(`${name}:\\s*([^;]+);`));
  if (!m) throw new Error(`No ${name} in tokens.css`);
  return m[1].trim();
};
const C = { ground: token('--accent'), a: token('--c1'), b: token('--c2'), c: token('--c3'), ghost: token('--surface') };

/** The picture on a square of `size`; `full` — the ground fills the square (maskable, Apple), else rounded. */
function svg(size, { full, gridShare }) {
  const grid = size * gridShare;
  const gap = grid * 0.07;
  const cell = (grid - gap) / 2;
  const x0 = (size - grid) / 2;
  const y0 = (size - grid) / 2;
  const r = cell * 0.16;
  const bevel = cell * 0.09;
  const at = (col, row) => ({ x: x0 + col * (cell + gap), y: y0 + row * (cell + gap) });
  const block = (col, row, fill) => {
    const { x, y } = at(col, row);
    return [
      `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="${r}" fill="${fill}"/>`,
      `<rect x="${x}" y="${y + cell - bevel}" width="${cell}" height="${bevel}" rx="${r / 2}" fill="#000" fill-opacity="0.22"/>`,
      `<rect x="${x + r}" y="${y + bevel * 0.4}" width="${cell - 2 * r}" height="${bevel * 0.6}" rx="${bevel * 0.3}" fill="#fff" fill-opacity="0.35"/>`,
    ].join('');
  };
  const ghost = (() => {
    const { x, y } = at(1, 0);
    const w = cell * 0.055;
    return `<rect x="${x + w / 2}" y="${y + w / 2}" width="${cell - w}" height="${cell - w}" rx="${r}" fill="none" stroke="${C.ghost}" stroke-width="${w}" stroke-dasharray="${cell * 0.16} ${cell * 0.1}" stroke-opacity="0.9"/>`;
  })();
  const ground = full
    ? `<rect width="${size}" height="${size}" fill="${C.ground}"/>`
    : `<rect width="${size}" height="${size}" rx="${size * 0.22}" fill="${C.ground}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${ground}${block(0, 0, C.a)}${block(0, 1, C.b)}${block(1, 1, C.c)}${ghost}</svg>`;
}

const out = join(root, 'games', game, 'icons');
mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'icon.svg'), svg(512, { full: false, gridShare: 0.6 }) + '\n');

const { chromium } = createRequire(import.meta.url)('playwright');
const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
const shots = [
  ['icon-192.png', 192, { full: false, gridShare: 0.6 }],
  ['icon-512.png', 512, { full: false, gridShare: 0.6 }],
  // maskable: the launcher cuts its own shape, everything important stays in the middle 80 %
  ['icon-maskable-512.png', 512, { full: true, gridShare: 0.5 }],
  ['apple-touch-icon.png', 180, { full: true, gridShare: 0.56 }],
];
for (const [file, size, opts] of shots) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg(size, opts)}</body></html>`);
  await page.locator('svg').screenshot({ path: join(out, file), omitBackground: true });
  console.log(file);
}
await browser.close();
