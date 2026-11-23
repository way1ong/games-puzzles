// Draws the icons of a game from its colour tokens (games/<game>/styles/tokens.css, light theme). The
// picture of each game is in scripts/icons/<game>.mjs. Needs Playwright (preinstalled in the cloud session).
// Run: node scripts/make-icons.mjs <game>
// Writes games/<game>/icons/: icon.svg (browser tab), icon-192.png, icon-512.png, icon-maskable-512.png,
// apple-touch-icon.png (180 × 180).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const game = process.argv[2];
if (!game) throw new Error('Which game? node scripts/make-icons.mjs <game>');
const { picture, SHARE, TOKENS } = await import(`./icons/${game}.mjs`);

const css = readFileSync(join(root, 'games', game, 'styles', 'tokens.css'), 'utf8');
const lightBlock = css.slice(css.indexOf(':root {'), css.indexOf('}', css.indexOf(':root {')));
const token = (name) => {
  const m = lightBlock.match(new RegExp(`${name}:\\s*([^;]+);`));
  if (!m) throw new Error(`No ${name} in tokens.css`);
  return m[1].trim();
};
const C = Object.fromEntries(Object.entries(TOKENS).map(([key, name]) => [key, token(name)]));

const out = join(root, 'games', game, 'icons');
mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'icon.svg'), picture(512, { full: false, share: SHARE.plain }, C) + '\n');

const { chromium } = createRequire(import.meta.url)('playwright');
const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
const shots = [
  ['icon-192.png', 192, { full: false, share: SHARE.plain }],
  ['icon-512.png', 512, { full: false, share: SHARE.plain }],
  // maskable: the launcher cuts its own shape, everything important stays in the middle 80 %
  ['icon-maskable-512.png', 512, { full: true, share: SHARE.maskable }],
  ['apple-touch-icon.png', 180, { full: true, share: SHARE.apple }],
];
for (const [file, size, opts] of shots) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:transparent">${picture(size, opts, C)}</body></html>`);
  await page.locator('svg').screenshot({ path: join(out, file), omitBackground: true });
  console.log(file);
}
await browser.close();
