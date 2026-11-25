// Browser audit of Pairs: every size and look — the start screen, a level, a pair taken, a blocked tile tapped,
// a hint, the menu with the widest settings (the time, the large mode), the biggest layout, the layout of the day;
// phones on their side, also with no pair left and the hint's "undo N moves"; large system text; the keyboard; a
// layout played to the end.
import { join } from 'node:path';
import { LOOKS, SIZES, checkFocusVisible, inspectScreen, watch } from './common.mjs';

/**
 * Tiles: on a phone held upright from 360 px across, and on one on its side from 360 px high, a free tile is at
 * least 44 px (docs/pairs/SPEC.md, "Розклади й рівні"); smaller screens may have smaller ones, never under the
 * WCAG 2.2 AA minimum. Every other button: 44 px.
 */
const DENSE = { selector: '.tile', min: 24 };
const STORE = 'way1ong-pairs:v1:';
/** The level of the biggest layout (four layers, 6 × 6 tiles). */
const BIG_LEVEL = 90;

/** Runs in the page: what must hold on the Pairs screens besides the common checks. */
function inspectPairs() {
  const out = [];
  const shown = (el) => el && getComputedStyle(el).display !== 'none' && el.getClientRects().length > 0 && !el.closest('[hidden]');
  for (const el of document.querySelectorAll('.note__text, .info__text, .pick__name, .pick__state, .pick__info')) {
    if (shown(el) && !el.textContent.trim()) out.push(`empty ${el.className}`);
  }
  const board = document.querySelector('.board');
  if (shown(board)) {
    const b = board.getBoundingClientRect();
    if (b.height > window.innerHeight + 1) out.push('the table is taller than the screen');
    for (const tile of board.querySelectorAll('.tile')) {
      if (!shown(tile)) continue;
      const t = tile.getBoundingClientRect();
      if (!tile.getAttribute('aria-label')) out.push('a tile without a name');
      if (t.left < b.left - 1 || t.top < b.top - 1 || t.right > b.right + 1 || t.bottom > b.bottom + 1) out.push('a tile sticks out of the table');
      const pic = tile.querySelector('.tile__pic').getBoundingClientRect();
      if (pic.width < t.width * 0.6 || pic.right > t.right + 1 || pic.bottom > t.bottom + 1) out.push('a picture does not fit its tile');
    }
    if ([...board.querySelectorAll('.tile')].filter((t) => t.tabIndex === 0).length > 1) out.push('the table has more than one Tab stop');
  }
  return out;
}

/** The size of the smallest free tile, px (null — no table). */
function smallestFree() {
  const free = [...document.querySelectorAll('.tile:not([hidden]):not([aria-disabled])')].map((t) => t.getBoundingClientRect());
  return free.length ? Math.min(...free.map((b) => Math.min(b.width, b.height))) : null;
}

/** Two free tiles with the same picture, by their numbers; null — none. */
function freePair() {
  const by = new Map();
  for (const t of document.querySelectorAll('.tile:not([hidden]):not([aria-disabled])')) {
    const k = t.querySelector('use').getAttribute('href');
    if (by.has(k)) return [by.get(k), t.dataset.i];
    by.set(k, t.dataset.i);
  }
  return null;
}

/** Always the last pair found: a poor way that often leaves no pair to take. */
function lastPair() {
  const by = new Map();
  let last = null;
  for (const t of document.querySelectorAll('.tile:not([hidden]):not([aria-disabled])')) {
    const k = t.querySelector('use').getAttribute('href');
    if (by.has(k)) last = [by.get(k), t.dataset.i];
    else by.set(k, t.dataset.i);
  }
  return last;
}

const tap = (page, i) => page.locator(`.tile[data-i="${i}"]`).click();

async function takePair(page, find = freePair) {
  const pair = await page.evaluate(find);
  if (!pair) return false;
  await tap(page, pair[0]);
  await tap(page, pair[1]);
  return true;
}

/**
 * Opens a level as if it were the one reached: the number is set on the device, its old layout dropped, and the
 * level opened from the start screen (the page is not loaded again).
 */
async function openLevel(page, n) {
  await page.evaluate(
    ([store, level]) => {
      localStorage.setItem(`${store}level`, String(level));
      localStorage.removeItem(`${store}play:level`);
    },
    [STORE, n],
  );
  if (await page.$('dialog[open]')) await page.keyboard.press('Escape');
  if (await page.locator('.top .icon-btn').first().isVisible()) await page.locator('.top .icon-btn').first().click();
  await page.waitForSelector('.pick');
  await page.locator('.pick').first().click();
  await page.waitForSelector('.tile:not([hidden])');
}

export async function audit({ browser, origin, axe, fail, shots }) {
  const base = `${origin}/pairs/`;
  const check = async (page, label) => {
    const problems = [
      ...(await page.evaluate(inspectScreen, { width: page.viewportSize().width, dense: DENSE })),
      ...(await page.evaluate(inspectPairs)),
      ...(await axe(page)),
    ];
    for (const p of problems) fail(`pairs ${label}: ${p}`);
  };
  const shot = async (page, name) => {
    if (shots) await page.screenshot({ path: join(shots, `pairs-${name}.png`) });
  };
  /** Free tiles of 44 px where the screen has room for them (see DENSE). */
  const roomy = async (page, label) => {
    const { width, height } = page.viewportSize();
    const room = width < height ? width >= 360 && height >= 640 : height >= 360;
    const min = await page.evaluate(smallestFree);
    if (room && min !== null && min < 44 - 0.5) fail(`pairs ${label}: a free tile is ${min.toFixed(1)} px`);
  };

  for (const [width, height] of SIZES) {
    for (const [locale, colorScheme] of LOOKS) {
      const label = `${width}×${height} ${locale} ${colorScheme}`;
      const ctx = await browser.newContext({ viewport: { width, height }, locale, colorScheme, isMobile: width < 768, hasTouch: width < 1024 });
      const page = await ctx.newPage();
      watch(page, `pairs ${label}`, origin, fail);
      await page.goto(base);
      await page.waitForSelector('.pick');
      await check(page, `${label} start`);
      await page.locator('.pick').first().click();
      await page.waitForSelector('.tile:not([hidden])');
      await check(page, `${label} level`);
      await page.locator('.tile:not([hidden]):not([aria-disabled])').first().click();
      await check(page, `${label} a tile chosen`);
      await takePair(page);
      await check(page, `${label} a pair taken`);
      const blocked = page.locator('.tile:not([hidden])[aria-disabled="true"]').first();
      if (await blocked.count()) {
        await blocked.click({ force: true });
        await check(page, `${label} a blocked tile tapped`);
      }
      await page.keyboard.press('h');
      await check(page, `${label} hint`);
      // the widest settings: the time and the large mode
      await page.locator('.top .icon-btn').nth(1).click();
      await check(page, `${label} menu`);
      for (const n of [2, 3]) await page.locator('dialog[open] input[type=checkbox]').nth(n).check();
      await page.locator('dialog[open] .dialog__actions .btn--primary').click();
      await check(page, `${label} large mode, time`);
      await shot(page, `${width}x${height}-${locale}-${colorScheme}`);
      // the biggest layout, with the large mode and without
      await openLevel(page, BIG_LEVEL);
      await check(page, `${label} biggest layout, large mode`);
      await roomy(page, `${label} biggest layout, large mode`);
      await page.locator('.top .icon-btn').nth(1).click();
      await page.locator('dialog[open] input[type=checkbox]').nth(3).uncheck();
      await page.locator('dialog[open] .dialog__actions .btn--primary').click();
      await check(page, `${label} biggest layout`);
      await roomy(page, `${label} biggest layout`);
      // the layout of the day from the start screen
      await page.locator('.top .icon-btn').first().click();
      await page.waitForSelector('.pick');
      await check(page, `${label} start again`);
      await page.locator('.pick').nth(1).click();
      await page.waitForSelector('.tile:not([hidden])');
      await check(page, `${label} layout of the day`);
      await ctx.close();
    }
  }

  // phones on their side (decision of 25.11): the table on the left as tall as the screen, the rest on the right —
  // nothing to scroll in play, also with a hint, no pair left, the hint's "undo N moves", the time and the large
  // mode; 740 × 290 and 640 × 290 are phones in a browser whose own bar takes part of the height
  for (const [width, height, locale, colorScheme] of [
    [640, 360, 'uk-UA', 'light'],
    [740, 360, 'hu-HU', 'dark'],
    [915, 412, 'en-GB', 'light'],
    [740, 290, 'uk-UA', 'dark'],
    [640, 290, 'hu-HU', 'light'],
  ]) {
    const label = `${width}×${height} side ${locale} ${colorScheme}`;
    const ctx = await browser.newContext({ viewport: { width, height }, locale, colorScheme, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    watch(page, `pairs ${label}`, origin, fail);
    const side = async (what) => {
      await check(page, `${label} ${what}`);
      await roomy(page, `${label} ${what}`);
      const m = await page.evaluate(() => {
        const board = document.querySelector('.board').getBoundingClientRect();
        const tools = document.querySelector('.tools').getBoundingClientRect();
        return { scroll: document.scrollingElement.scrollHeight - innerHeight, beside: board.right <= tools.left };
      });
      if (m.scroll > 1) fail(`pairs ${label} ${what}: the page scrolls ${m.scroll} px in play`);
      if (!m.beside) fail(`pairs ${label} ${what}: the table is not beside the tools`);
    };
    await page.goto(base);
    await page.waitForSelector('.pick');
    await check(page, `${label} start`);
    await page.locator('.pick').first().click();
    await page.waitForSelector('.tile:not([hidden])');
    await side('level, how to play');
    await takePair(page);
    await side('a pair taken');
    await page.keyboard.press('h');
    await side('hint');
    await page.locator('.top .icon-btn').nth(1).click();
    for (const n of [2, 3]) await page.locator('dialog[open] input[type=checkbox]').nth(n).check();
    await page.locator('dialog[open] .dialog__actions .btn--primary').click();
    await openLevel(page, BIG_LEVEL);
    await side('biggest layout, large mode, time');
    // no pair left: the poorest pairs on the levels from 31 on, until one is left with none
    let stuck = false;
    for (let level = 31; level < 50 && !stuck; level++) {
      await openLevel(page, level);
      while (await takePair(page, lastPair));
      stuck = !(await page.$('dialog[open]')) && (await page.locator('.tile:not([hidden])').count()) > 0;
      if (!stuck) await page.keyboard.press('Escape');
    }
    if (!stuck) fail(`pairs ${label}: no level from 31 to 49 was left with no pair`);
    else {
      await side('no pair left, large mode');
      await page.keyboard.press('h');
      await side('the hint: undo moves, large mode');
      await shot(page, `side-${width}x${height}-stuck`);
    }
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
    await page.waitForSelector('.pick');
    await page.addStyleTag({ content: `html { font-size: ${size}% !important; }` });
    await check(page, `${width}×${height} text ${size}% start`);
    await page.locator('.pick').first().click();
    await page.waitForSelector('.tile:not([hidden])');
    await check(page, `${width}×${height} text ${size}% level`);
    await page.keyboard.press('h');
    await check(page, `${width}×${height} text ${size}% hint`);
    await ctx.close();
  }

  // the keyboard, and one layout to the end by the hints
  {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, locale: 'en-GB' });
    const page = await ctx.newPage();
    watch(page, 'pairs keyboard', origin, fail);
    await page.goto(base);
    await page.waitForSelector('.pick');
    await checkFocusVisible(page, 6, fail, 'pairs keyboard start');
    await page.locator('.pick').first().click();
    await page.waitForSelector('.tile:not([hidden])');
    await checkFocusVisible(page, 8, fail, 'pairs keyboard level');
    // arrows walk the free tiles, Enter chooses, Esc lets go
    await page.keyboard.press('ArrowRight');
    const onFree = await page.evaluate(() => document.activeElement?.matches('.tile:not([aria-disabled])'));
    if (!onFree) fail('pairs keyboard: an arrow did not bring the focus onto a free tile');
    await page.keyboard.press('Enter');
    if (!(await page.evaluate(() => document.activeElement?.getAttribute('aria-pressed') === 'true'))) fail('pairs keyboard: Enter did not choose the tile');
    await page.keyboard.press('Escape');
    for (let guard = 0; guard < 40 && !(await page.$('dialog[open]')); guard++) {
      await page.keyboard.press('h');
      const hint = await page.$$eval('.tile.is-hint:not([hidden])', (ts) => ts.map((t) => t.dataset.i));
      if (hint.length !== 2) {
        fail(`pairs keyboard: the hint showed ${hint.length} tiles`);
        break;
      }
      await tap(page, hint[0]);
      await tap(page, hint[1]);
    }
    await page.waitForSelector('dialog[open]', { timeout: 5000 }).catch(() => fail('pairs keyboard: no "cleared" window after the last pair'));
    await check(page, 'cleared');
    const stats = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), `${STORE}stats`);
    if (stats?.levels !== 1) fail(`pairs keyboard: statistics did not count the layout (${JSON.stringify(stats)})`);
    await page.locator('dialog[open] .btn--primary').click();
    await page.waitForSelector('.tile:not([hidden])');
    if (!(await page.textContent('.top__name')).includes('2')) fail('pairs keyboard: "Next level" did not open level 2');
    await shot(page, 'cleared');
    await ctx.close();
  }
  return `${SIZES.length} sizes × ${LOOKS.length} looks, the biggest layout, phones on their side (no pair left too), large text, keyboard, a layout to the end`;
}
