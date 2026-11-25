// Browser audit of Sudoku: every size and look — the start screen, a game, a digit, notes, a hint, the menu
// with the widest settings (five tools, the time, the large mode), the daily puzzle; phones on their side; large
// system text; the keyboard; one puzzle played to the end.
import { join } from 'node:path';
import { LOOKS, SIZES, checkFocusVisible, inspectScreen, watch } from './common.mjs';

/**
 * Nine cells in a row cannot each be 44 px on a phone (a 360 px screen gives about 36): the cells are checked
 * against the WCAG 2.2 AA minimum instead (docs/sudoku/SPEC.md, "Екрани й керування"); every other button
 * against 44 px.
 */
const DENSE = { selector: '.cell', min: 24 };
const STORE = 'way1ong-sudoku:v1:';

/** Runs in the page: what must hold on the Sudoku screens besides the common checks. */
function inspectSudoku() {
  const out = [];
  const shown = (el) => el && getComputedStyle(el).display !== 'none' && el.getClientRects().length > 0 && !el.closest('[hidden]');
  for (const el of document.querySelectorAll('.board-note, .info, .hint__text, .hint__title, .level__info')) {
    if (shown(el) && !el.textContent.trim()) out.push(`empty ${el.className}`);
  }
  const board = document.querySelector('.board');
  if (shown(board)) {
    const b = board.getBoundingClientRect();
    if (Math.abs(b.width - b.height) > 1) out.push(`the board is not square: ${Math.round(b.width)}×${Math.round(b.height)}`);
    if (b.bottom > window.innerHeight + 1 && !document.querySelector('dialog[open]')) {
      // the page may scroll on a small screen, but the board itself must fit the screen's height
      if (b.height > window.innerHeight) out.push('the board is taller than the screen');
    }
    for (const cell of board.querySelectorAll('.cell')) {
      const digit = cell.querySelector('.cell__digit:not([hidden])');
      if (digit && digit.getBoundingClientRect().height > cell.getBoundingClientRect().height + 1) out.push('a digit is taller than its cell');
      if (!cell.getAttribute('aria-label')) out.push('a cell without a name');
    }
  }
  return out;
}

async function openLevel(page, n) {
  await page.locator('.level').nth(n).click();
  await page.waitForSelector('.cell.is-given', { timeout: 30000 });
}

export async function audit({ browser, origin, axe, fail, shots }) {
  const base = `${origin}/sudoku/`;
  const check = async (page, label) => {
    const problems = [
      ...(await page.evaluate(inspectScreen, { width: page.viewportSize().width, dense: DENSE })),
      ...(await page.evaluate(inspectSudoku)),
      ...(await axe(page)),
    ];
    for (const p of problems) fail(`sudoku ${label}: ${p}`);
  };
  const shot = async (page, name) => {
    if (shots) await page.screenshot({ path: join(shots, `sudoku-${name}.png`) });
  };

  for (const [width, height] of SIZES) {
    for (const [locale, colorScheme] of LOOKS) {
      const label = `${width}×${height} ${locale} ${colorScheme}`;
      const ctx = await browser.newContext({ viewport: { width, height }, locale, colorScheme, isMobile: width < 768, hasTouch: width < 1024 });
      const page = await ctx.newPage();
      watch(page, `sudoku ${label}`, origin, fail);
      await page.goto(base);
      await page.waitForSelector('.level');
      await check(page, `${label} start`);
      await openLevel(page, 0);
      await check(page, `${label} game`);
      // a digit in the first empty cell, notes in the next one
      const empties = await page.$$eval('.cell', (cells) => cells.flatMap((c, i) => (c.classList.contains('is-given') ? [] : [i])));
      await page.locator('.cell').nth(empties[0]).click();
      await page.keyboard.press('5');
      await page.locator('.cell').nth(empties[1]).click();
      await page.keyboard.press('n');
      for (const k of ['1', '2', '3', '7', '8', '9']) await page.keyboard.press(k);
      await page.keyboard.press('n');
      await check(page, `${label} digit and notes`);
      await page.keyboard.press('h');
      await check(page, `${label} hint`);
      await page.locator('.hint .btn--primary').click();
      await check(page, `${label} hint explained`);
      await page.keyboard.press('Escape');
      // the widest settings: the fifth tool, the time, the large mode
      await page.locator('.top .icon-btn').nth(1).click();
      await check(page, `${label} menu`);
      for (const n of [1, 5, 6]) await page.locator('dialog[open] input[type=checkbox]').nth(n).check();
      await page.locator('dialog[open] .dialog__actions .btn--primary').click();
      await check(page, `${label} large mode, five tools, time`);
      await shot(page, `${width}x${height}-${locale}-${colorScheme}`);
      // the daily puzzle from the start screen
      await page.locator('.top .icon-btn').first().click();
      await page.waitForSelector('.daily__btn');
      await check(page, `${label} start again`);
      await page.locator('.daily__btn').nth(1).click();
      await page.waitForSelector('.cell.is-given', { timeout: 30000 });
      await check(page, `${label} daily`);
      await ctx.close();
    }
  }

  // phones on their side (decision of 25.11): the board on the left as tall as the screen, the tools and digits on
  // the right — nothing to scroll in play, also with a hint open, five tools, the time and the large mode; 740 × 290
  // and 640 × 290 are phones in a browser whose own bar takes part of the height
  for (const [width, height, locale, colorScheme] of [
    [640, 360, 'uk-UA', 'light'],
    [740, 360, 'hu-HU', 'dark'],
    [915, 412, 'en-GB', 'light'],
    [740, 290, 'uk-UA', 'dark'],
    [640, 290, 'en-GB', 'light'],
  ]) {
    const label = `${width}×${height} side ${locale} ${colorScheme}`;
    const ctx = await browser.newContext({ viewport: { width, height }, locale, colorScheme, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    watch(page, `sudoku ${label}`, origin, fail);
    const side = async (what) => {
      await check(page, `${label} ${what}`);
      const m = await page.evaluate(() => {
        const board = document.querySelector('.board').getBoundingClientRect();
        const controls = document.querySelector('.controls').getBoundingClientRect();
        return { scroll: document.scrollingElement.scrollHeight - innerHeight, beside: board.right <= controls.left };
      });
      if (m.scroll > 1) fail(`sudoku ${label} ${what}: the page scrolls ${m.scroll} px in play`);
      if (!m.beside) fail(`sudoku ${label} ${what}: the board is not beside the digits`);
    };
    await page.goto(base);
    await page.waitForSelector('.level');
    await check(page, `${label} start`);
    await openLevel(page, 0);
    await side('game');
    const empties = await page.$$eval('.cell', (cells) => cells.flatMap((c, i) => (c.classList.contains('is-given') ? [] : [i])));
    await page.locator('.cell').nth(empties[0]).click();
    await page.keyboard.press('5');
    await page.keyboard.press('h');
    await side('hint');
    await page.locator('.hint .btn--primary').click();
    await side('hint explained');
    await page.keyboard.press('Escape');
    await page.locator('.top .icon-btn').nth(1).click();
    for (const n of [1, 5, 6]) await page.locator('dialog[open] input[type=checkbox]').nth(n).check();
    await page.locator('dialog[open] .dialog__actions .btn--primary').click();
    await side('large mode, five tools, time');
    await page.keyboard.press('h');
    await side('large mode, hint');
    await shot(page, `side-${width}x${height}`);
    await ctx.close();
  }

  // large system text
  for (const [width, height, size] of [
    [320, 640, 150],
    [390, 844, 200],
    [1366, 768, 200],
  ]) {
    const ctx = await browser.newContext({ viewport: { width, height }, locale: 'hu-HU', isMobile: width < 768, hasTouch: width < 1024 });
    const page = await ctx.newPage();
    await page.goto(base);
    await page.waitForSelector('.level');
    await page.addStyleTag({ content: `html { font-size: ${size}% !important; }` });
    await check(page, `${width}×${height} text ${size}% start`);
    await openLevel(page, 3);
    await check(page, `${width}×${height} text ${size}% game`);
    await ctx.close();
  }

  // the keyboard, and one puzzle to the end: the solution is in the saved game
  {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, locale: 'en-GB' });
    const page = await ctx.newPage();
    watch(page, 'sudoku keyboard', origin, fail);
    await page.goto(base);
    await page.waitForSelector('.level');
    await checkFocusVisible(page, 10, fail, 'sudoku keyboard start');
    await openLevel(page, 1);
    await checkFocusVisible(page, 12, fail, 'sudoku keyboard game');
    const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), `${STORE}game:medium`);
    const { givens, solution } = saved.game;
    await page.locator('.cell').first().click();
    for (let cell = 0; cell < 81; cell++) {
      if (givens[cell] === '0') await page.keyboard.press(solution[cell]);
      if (cell % 9 < 8) await page.keyboard.press('ArrowRight');
      else if (cell < 80) {
        for (let i = 0; i < 8; i++) await page.keyboard.press('ArrowLeft');
        await page.keyboard.press('ArrowDown');
      }
    }
    await page.waitForSelector('dialog[open]', { timeout: 5000 }).catch(() => fail('sudoku keyboard: no "solved" window after the last digit'));
    await check(page, 'solved');
    const stats = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), `${STORE}stats`);
    if (stats?.medium?.solved !== 1) fail(`sudoku keyboard: statistics did not count the solved puzzle (${JSON.stringify(stats)})`);
    await shot(page, 'solved');
    await ctx.close();
  }
  return `${SIZES.length} sizes × ${LOOKS.length} looks, phones on their side, large text, keyboard, a puzzle to the end`;
}
