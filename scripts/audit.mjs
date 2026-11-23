// Layout and accessibility check of the built games in a browser (Playwright — preinstalled in the cloud
// session): phone and computer sizes, three languages, light and dark, the large mode and large system text.
// Run after the build:  npm run audit [-- --axe <path to axe.min.js>] [--shots <folder>]
// With --axe the axe-core rules (WCAG 2.2 A/AA) run in every state too; axe-core is not a dependency of
// the project: download it (npm pack axe-core) into a scratch folder and pass the file.
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
};
const axeSource = opt('--axe') ? readFileSync(opt('--axe'), 'utf8') : null;
const shots = opt('--shots');
if (shots) mkdirSync(shots, { recursive: true });

const PORT = 4317;
const BASE = `http://localhost:${PORT}/blocks/`;
const SIZES = [
  [320, 640],
  [360, 640],
  [390, 844],
  [768, 1024],
  [1024, 768],
  [1366, 768],
];
const LOOKS = [
  ['en-GB', 'light'],
  ['hu-HU', 'dark'],
  ['uk-UA', 'light'],
];

const problems = [];
const fail = (m) => {
  problems.push(m);
  console.log('FAIL', m);
};

/** Everything a player could meet that is wrong on the screen right now. */
function inspect() {
  const out = [];
  const doc = document.scrollingElement;
  if (doc.scrollWidth > window.innerWidth) out.push('sideways scroll');
  const visible = (el) => {
    const b = el.getBoundingClientRect();
    const dialog = el.closest('dialog');
    return b.width > 0 && getComputedStyle(el).visibility !== 'hidden' && (!dialog || dialog.open);
  };
  for (const el of document.querySelectorAll('button, .tray__grab, a, input')) {
    if (!visible(el)) continue;
    const box = (el.tagName === 'INPUT' ? el.closest('label') : el).getBoundingClientRect();
    if (box.width < 44 || box.height < 44) out.push(`small target "${(el.getAttribute('aria-label') || el.textContent).trim().slice(0, 20)}" ${Math.round(box.width)}×${Math.round(box.height)}`);
    const text = el.textContent.trim();
    if (el.tagName !== 'BUTTON' || !text) continue;
    if (el.scrollWidth > el.clientWidth + 1) out.push(`text sticks out of "${text}"`);
    const range = document.createRange();
    range.selectNodeContents(el);
    const lines = new Set([...range.getClientRects()].filter((r) => r.width > 0).map((r) => Math.round(r.top))).size;
    if (lines > text.split(/\s+/).length) out.push(`word broken on "${text}"`);
  }
  const modeNote = document.querySelector('.mode-note');
  if (!modeNote || !modeNote.textContent.trim()) out.push('no line about the mode');
  for (const note of document.querySelectorAll('.board-note')) {
    if (getComputedStyle(note).display !== 'none' && !note.textContent.trim()) out.push('empty note over the board');
  }
  return out;
}

async function axe(page) {
  if (!axeSource) return [];
  await page.addScriptTag({ content: axeSource });
  const result = await page.evaluate(() =>
    window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] } }),
  );
  return result.violations.map((v) => `axe ${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).slice(0, 2).join(' | ')})`);
}

async function check(page, label) {
  for (const p of [...(await page.evaluate(inspect)), ...(await axe(page))]) fail(`${label}: ${p}`);
}

async function main(chromium) {
  const browser = await chromium.launch();
  for (const [width, height] of SIZES) {
    for (const [locale, colorScheme] of LOOKS) {
      const label = `${width}×${height} ${locale} ${colorScheme}`;
      const ctx = await browser.newContext({ viewport: { width, height }, locale, colorScheme, isMobile: width < 768, hasTouch: width < 1024 });
      const page = await ctx.newPage();
      page.on('pageerror', (e) => fail(`${label}: page error ${e.message}`));
      page.on('console', (m) => {
        if (m.type() === 'error' || m.type() === 'warning') fail(`${label}: console ${m.type()} ${m.text()}`);
      });
      page.on('request', (r) => {
        if (!r.url().startsWith(`http://localhost:${PORT}/`)) fail(`${label}: request to ${r.url()}`);
      });
      await page.goto(BASE);
      await page.waitForSelector('.board .cell');
      await check(page, `${label} start`);
      await page.keyboard.press('1');
      await check(page, `${label} piece chosen`);
      await page.keyboard.press('Escape');
      for (const mode of [1, 2]) {
        await page.locator('.seg__btn').nth(mode).click();
        await check(page, `${label} mode ${mode + 1}`);
      }
      await page.locator('.icon-btn').click();
      await check(page, `${label} menu`);
      await page.locator('dialog[open] input[type=checkbox]').first().check();
      await page.locator('dialog[open] .btn--primary').click();
      await check(page, `${label} large mode`);
      if (shots) await page.screenshot({ path: join(shots, `${width}x${height}-${locale}-${colorScheme}.png`) });
      await ctx.close();
    }
  }

  // large system text and the keyboard
  for (const [width, height, size] of [
    [320, 640, 150],
    [390, 844, 200],
    [1366, 768, 200],
  ]) {
    const label = `${width}×${height} text ${size}%`;
    const ctx = await browser.newContext({ viewport: { width, height }, locale: 'uk-UA', isMobile: width < 768, hasTouch: width < 1024 });
    const page = await ctx.newPage();
    await page.goto(BASE);
    await page.waitForSelector('.board .cell');
    await page.addStyleTag({ content: `html { font-size: ${size}% !important; }` });
    await check(page, label);
    await ctx.close();
  }
  {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, locale: 'en-GB' });
    const page = await ctx.newPage();
    await page.goto(BASE);
    await page.waitForSelector('.board .cell');
    for (let i = 0; i < 14; i++) {
      await page.keyboard.press('Tab');
      const f = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        const st = getComputedStyle(el);
        return { name: (el.getAttribute('aria-label') || el.textContent).trim().slice(0, 20), shown: st.outlineStyle !== 'none' && parseFloat(st.outlineWidth) >= 2 };
      });
      if (f && !f.shown) fail(`keyboard: focus not visible on "${f.name}"`);
    }
    await ctx.close();
  }
  await browser.close();
}

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: root, stdio: 'ignore' });
try {
  for (let i = 0; ; i++) {
    try {
      if ((await fetch(BASE)).ok) break;
    } catch {
      // not up yet
    }
    if (i > 100) throw new Error('vite preview did not start — run npm run build first');
    await new Promise((r) => setTimeout(r, 100));
  }
  const { chromium } = createRequire(import.meta.url)('playwright');
  await main(chromium);
} finally {
  server.kill();
}
console.log(problems.length ? `\n${problems.length} problem(s)` : `\nOK: ${SIZES.length} sizes × ${LOOKS.length} looks, large text, keyboard${axeSource ? ', axe' : ''}`);
process.exit(problems.length ? 1 : 0);
