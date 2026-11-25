// Browser audit of Blocks: every size and look, the modes, the menu, the large mode, phones on their side, large
// system text, the keyboard.
import { join } from 'node:path';
import { LOOKS, SIZES, checkFocusVisible, inspectScreen, watch } from './common.mjs';

/** The drawn look's button in the menu, for the languages the audit turns it on in. */
const DRAWN = { 'en-GB': 'Drawn', 'hu-HU': 'Rajzolt' };

/** Runs in the page: what must hold on the Blocks screen besides the common checks. */
function inspectBlocks() {
  const out = [];
  const modeNote = document.querySelector('.mode-note');
  if (!modeNote || !modeNote.textContent.trim()) out.push('no line about the mode');
  for (const note of document.querySelectorAll('.board-note')) {
    if (getComputedStyle(note).display !== 'none' && !note.textContent.trim()) out.push('empty note over the board');
  }
  return out;
}

export async function audit({ browser, origin, axe, fail, shots }) {
  const base = `${origin}/blocks/`;
  const check = async (page, label) => {
    for (const p of [...(await page.evaluate(inspectScreen, page.viewportSize().width)), ...(await page.evaluate(inspectBlocks)), ...(await axe(page))]) fail(`blocks ${label}: ${p}`);
  };

  for (const [width, height] of SIZES) {
    for (const [locale, colorScheme] of LOOKS) {
      const label = `${width}×${height} ${locale} ${colorScheme}`;
      const ctx = await browser.newContext({ viewport: { width, height }, locale, colorScheme, isMobile: width < 768, hasTouch: width < 1024 });
      const page = await ctx.newPage();
      watch(page, `blocks ${label}`, origin, fail);
      await page.goto(base);
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
      // the drawn look (the simple one is the default), in both themes: English light, Hungarian dark
      const drawn = DRAWN[locale];
      if (drawn) await page.locator('dialog[open] .choices__btn', { hasText: drawn }).click();
      await page.locator('dialog[open] .btn--primary').click();
      await check(page, `${label} large mode${drawn ? ', drawn look' : ''}`);
      if (shots) await page.screenshot({ path: join(shots, `blocks-${width}x${height}-${locale}-${colorScheme}.png`) });
      await ctx.close();
    }
  }

  // phones on their side (decision of 25.11): the board on the left, the pieces and buttons on the right — nothing
  // to scroll, the pieces (and in the calm mode their turn buttons) inside the tray, in every mode and the large
  // mode; 740 × 290 and 640 × 290 are phones in a browser whose own bar takes part of the height
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
    watch(page, `blocks ${label}`, origin, fail);
    const side = async (what) => {
      await check(page, `${label} ${what}`);
      const m = await page.evaluate(() => {
        const tray = document.querySelector('.tray').getBoundingClientRect();
        const board = document.querySelector('.board').getBoundingClientRect();
        const outside = [...document.querySelectorAll('.tray__grab, .tray__turn')].filter((e) => e.getClientRects().length && !e.closest('[hidden]')).some((e) => {
          const b = e.getBoundingClientRect();
          return b.top < tray.top - 1 || b.bottom > tray.bottom + 1;
        });
        return { scroll: document.scrollingElement.scrollHeight - innerHeight, outside, beside: board.right <= tray.left };
      });
      if (m.scroll > 1) fail(`blocks ${label} ${what}: the page scrolls ${m.scroll} px`);
      if (m.outside) fail(`blocks ${label} ${what}: a piece or its turn button sticks out of the tray`);
      if (!m.beside) fail(`blocks ${label} ${what}: the board is not beside the pieces`);
    };
    await page.goto(base);
    await page.waitForSelector('.board .cell');
    await side('start');
    await page.keyboard.press('1');
    await side('piece chosen');
    await page.keyboard.press('Escape');
    for (const mode of [1, 2]) {
      await page.locator('.seg__btn').nth(mode).click();
      await side(`mode ${mode + 1}`);
    }
    await page.locator('.seg__btn').nth(1).click();
    await page.locator('.icon-btn').click();
    await check(page, `${label} menu`);
    await page.locator('dialog[open] input[type=checkbox]').first().check();
    await page.locator('dialog[open] .btn--primary').click();
    await side('large mode, calm');
    if (shots) await page.screenshot({ path: join(shots, `blocks-side-${width}x${height}.png`) });
    await ctx.close();
  }

  // large system text and the keyboard
  for (const [width, height, size] of [
    [320, 640, 150],
    [390, 844, 200],
    [1366, 768, 200],
  ]) {
    const ctx = await browser.newContext({ viewport: { width, height }, locale: 'uk-UA', isMobile: width < 768, hasTouch: width < 1024 });
    const page = await ctx.newPage();
    await page.goto(base);
    await page.waitForSelector('.board .cell');
    await page.addStyleTag({ content: `html { font-size: ${size}% !important; }` });
    await check(page, `${width}×${height} text ${size}%`);
    await ctx.close();
  }
  {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, locale: 'en-GB' });
    const page = await ctx.newPage();
    await page.goto(base);
    await page.waitForSelector('.board .cell');
    await checkFocusVisible(page, 14, fail, 'blocks keyboard');
    await ctx.close();
  }
  return `${SIZES.length} sizes × ${LOOKS.length} looks, phones on their side, large text, keyboard`;
}
