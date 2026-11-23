// Browser audit of Blocks: every size and look, the modes, the menu, the large mode, large system text,
// the keyboard.
import { join } from 'node:path';
import { LOOKS, SIZES, checkFocusVisible, inspectScreen, watch } from './common.mjs';

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
      await page.locator('dialog[open] .btn--primary').click();
      await check(page, `${label} large mode`);
      if (shots) await page.screenshot({ path: join(shots, `blocks-${width}x${height}-${locale}-${colorScheme}.png`) });
      await ctx.close();
    }
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
  return `${SIZES.length} sizes × ${LOOKS.length} looks, large text, keyboard`;
}
