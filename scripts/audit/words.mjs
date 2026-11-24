// Browser audit of Words: every size and look — the start screen, a level, a word made by sliding, the hint
// window, choosing a cell for a hint, the menu with the large letters, the daily puzzle; large system text;
// the keyboard; one level played to the end; a level kept when the language is switched there and back.
import { join } from 'node:path';
import { LOOKS, SIZES, checkFocusVisible, inspectScreen, watch } from './common.mjs';

/**
 * Crossword cells are buttons only while the player chooses a cell for a hint; a big crossword on a phone
 * cannot give each 44 px: they are checked against the WCAG 2.2 AA minimum (docs/words/SPEC.md).
 */
const DENSE = { selector: '.cw-cell', min: 24 };
const STORE = 'way1ong-words:v1:';

/** Runs in the page: what must hold on the Words screens besides the common checks. */
function inspectWords() {
  const out = [];
  const shown = (el) => el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden' && !el.closest('[hidden]');
  for (const el of document.querySelectorAll('.tip, .info__left, .home__note')) {
    if (shown(el) && !el.textContent.trim() && el.matches('.tip, .home__note')) out.push(`empty ${el.className}`);
  }
  const wheel = document.querySelector('.wheel');
  if (shown(wheel)) {
    const w = wheel.getBoundingClientRect();
    if (Math.abs(w.width - w.height) > 1) out.push('the wheel is not round');
    const letters = [...wheel.querySelectorAll('.wheel__letter')].map((b) => b.getBoundingClientRect());
    for (let i = 0; i < letters.length; i++) {
      for (let j = i + 1; j < letters.length; j++) {
        const a = letters[i];
        const b = letters[j];
        if (a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom) out.push('two letters of the wheel overlap');
      }
      const a = letters[i];
      if (a.left < w.left - 1 || a.right > w.right + 1 || a.top < w.top - 1 || a.bottom > w.bottom + 1) out.push('a letter sticks out of the wheel');
    }
  }
  const grid = document.querySelector('.crossword');
  if (shown(grid)) {
    const g = grid.getBoundingClientRect();
    const stage = grid.closest('.stage').getBoundingClientRect();
    if (g.right > stage.right + 1 || g.bottom > stage.bottom + 1) out.push('the crossword sticks out of its place');
  }
  return out;
}

async function openLevel(page) {
  await page.locator('.home__main').click();
  await page.waitForSelector('.wheel__letter', { timeout: 30000 });
}

/** The tiles of the level's words, from the saved game. */
async function levelWords(page, lang, daily = false) {
  const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), `${STORE}${daily ? 'daily' : 'play'}:${lang}:tiles`);
  return saved.play.level.words.map((p) => p.word.tiles);
}

/** Slides across the letters of a word on the wheel. */
async function slide(page, tiles) {
  const centres = await page.$$eval('.wheel__letter', (bs) =>
    bs.map((b) => {
      const r = b.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2, t: b.textContent.toLowerCase() };
    }),
  );
  const used = new Set();
  const points = tiles.map((t) => {
    const i = centres.findIndex((c, k) => c.t === t && !used.has(k));
    used.add(i);
    return centres[i];
  });
  await page.mouse.move(points[0].x, points[0].y);
  await page.mouse.down();
  for (const p of points.slice(1)) await page.mouse.move(p.x, p.y, { steps: 5 });
  await page.mouse.up();
}

export async function audit({ browser, origin, axe, fail, shots }) {
  const base = `${origin}/words/`;
  const check = async (page, label) => {
    const problems = [
      ...(await page.evaluate(inspectScreen, { width: page.viewportSize().width, dense: DENSE })),
      ...(await page.evaluate(inspectWords)),
      ...(await axe(page)),
    ];
    for (const p of problems) fail(`words ${label}: ${p}`);
  };

  for (const [width, height] of SIZES) {
    for (const [locale, colorScheme] of LOOKS) {
      const label = `${width}×${height} ${locale} ${colorScheme}`;
      const lang = locale.slice(0, 2);
      const ctx = await browser.newContext({ viewport: { width, height }, locale, colorScheme, isMobile: width < 768, hasTouch: width < 1024 });
      const page = await ctx.newPage();
      watch(page, `words ${label}`, origin, fail);
      await page.goto(base);
      await page.waitForSelector('.home__main');
      await check(page, `${label} start`);
      await openLevel(page);
      await check(page, `${label} level`);
      const words = await levelWords(page, lang);
      await slide(page, words[0]);
      await page.waitForTimeout(50);
      await check(page, `${label} word found`);
      await page.locator('.info__tools .tool').last().click();
      await check(page, `${label} hint window`);
      await page.locator('.hint-option').nth(1).click();
      await check(page, `${label} choosing a cell`);
      await page.locator('.cw-cell.is-choice').first().click();
      await check(page, `${label} cell opened`);
      await page.locator('.top .icon-btn').nth(1).click();
      await check(page, `${label} menu`);
      await page.locator('dialog[open] label', { hasText: /./ }).filter({ has: page.locator('input') }).nth(3).locator('input').check(); // show the time
      await page.locator('dialog[open] .dialog__actions .btn--primary').click();
      await check(page, `${label} after a setting`);
      await page.evaluate(() => document.documentElement.classList.add('big'));
      await check(page, `${label} large letters`);
      if (shots) await page.screenshot({ path: join(shots, `words-${width}x${height}-${locale}-${colorScheme}.png`) });
      await page.locator('.top .icon-btn').first().click();
      await page.waitForSelector('.home__daily');
      await page.locator('.home__daily').click();
      await page.waitForSelector('.wheel__letter', { timeout: 30000 });
      await check(page, `${label} daily`);
      await ctx.close();
    }
  }

  for (const [width, height, size] of [
    [320, 640, 150],
    [390, 844, 200],
    [1366, 768, 200],
  ]) {
    const ctx = await browser.newContext({ viewport: { width, height }, locale: 'hu-HU', isMobile: width < 768, hasTouch: width < 1024 });
    const page = await ctx.newPage();
    await page.goto(base);
    await page.waitForSelector('.home__main');
    await page.addStyleTag({ content: `html { font-size: ${size}% !important; }` });
    await check(page, `${width}×${height} text ${size}% start`);
    await openLevel(page);
    await check(page, `${width}×${height} text ${size}% level`);
    await ctx.close();
  }

  // The keyboard, and a level to the end with the keys (English: the test browser's own keys).
  {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, locale: 'en-GB' });
    const page = await ctx.newPage();
    watch(page, 'words keyboard', origin, fail);
    await page.goto(base);
    await page.waitForSelector('.home__main');
    await checkFocusVisible(page, 6, fail, 'words keyboard start');
    await openLevel(page);
    await checkFocusVisible(page, 12, fail, 'words keyboard level');
    for (const word of await levelWords(page, 'en')) {
      await page.keyboard.type(word.join(''));
      await page.keyboard.press('Enter');
    }
    await page.waitForSelector('dialog[open]', { timeout: 5000 }).catch(() => fail('words keyboard: no "level done" window'));
    await check(page, 'level done');
    const reached = await page.evaluate((key) => localStorage.getItem(key), `${STORE}reached:en:tiles`);
    if (reached !== '2') fail(`words keyboard: the next level is not 2 (${reached})`);
    if (shots) await page.screenshot({ path: join(shots, 'words-done.png') });

    // Each language keeps its own level: a word found, the language switched there and back.
    await page.locator('dialog[open] .btn--primary').click();
    await page.waitForFunction((key) => JSON.parse(localStorage.getItem(key))?.play.level.number === 2, `${STORE}play:en:tiles`, { timeout: 30000 });
    const [first] = await levelWords(page, 'en');
    await page.keyboard.type(first.join(''));
    await page.keyboard.press('Enter');
    for (const code of ['hu', 'en']) {
      await page.locator('.top .icon-btn').nth(1).click();
      await page.locator(`dialog[open] .choices__btn[lang="${code}"]`).click();
      await page.locator('dialog[open] .dialog__actions .btn--primary').click();
      await page.waitForSelector('.wheel__letter', { timeout: 30000 });
    }
    const kept = await page.evaluate((key) => JSON.parse(localStorage.getItem(key))?.play, `${STORE}play:en:tiles`);
    if (kept?.level.lang !== 'en' || !kept.found.includes(first.join(''))) fail(`words: after switching the language and back, the English level has ${JSON.stringify(kept?.found)}`);
    if (!(await page.locator('.cw-cell.is-found').count())) fail('words: after switching the language and back, no found cells');
    await ctx.close();
  }
  return `${SIZES.length} sizes × ${LOOKS.length} looks, large text, keyboard, a level to the end, a level kept across languages`;
}
