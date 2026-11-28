// Browser audit of Solitaire: every size and look — the start screen, a deal, the stock turned, a hint, a face-down
// card touched, the menu with the widest settings (the time, four colours, the large mode, the left hand), three cards
// a turn, the deal of the day, and the deal of the day where no way to the end is left; Spider: a deal ("Turn the
// phone" on a phone upright), the stock dealt, a hint, four suits, Spider of the day where no way is left; FreeCell: a
// deal, a card played, a hint, two free cells, the deal of the day where no way is left; phones on their side; large
// system text; the keyboard; a deal of each played to the end; "New deal" in the middle of a deal deals anew.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { LOOKS, SIZES, checkFocusVisible, inspectScreen, watch } from './common.mjs';

/**
 * Cards: on a phone held upright from 360 px across a card is at least 44 px wide (docs/solitaire/SPEC.md, "Екрани й
 * керування"); smaller screens and phones on their side may have smaller ones, never under the WCAG 2.2 AA minimum.
 * Every other button: 44 px.
 */
const DENSE = { selector: '.card, .slot', min: 24 };
const STORE = 'way1ong-solitaire:v1:';
/**
 * A made-up deal of the day, played at random into a dead end: no move leads anywhere, and the game says so — the
 * moves to undo in the note, "Start over" standing out among the tools (decision of 25.11).
 */
const DEAD_END = JSON.parse(readFileSync(new URL('./solitaire-dead-end.json', import.meta.url), 'utf8'));
/**
 * Spider, made up: four suits, six runs home, every card face up; the five of diamonds put into the empty column leaves
 * no move at all — the game says so, one move to undo in the note, "Start over" standing out (Spider of the day).
 */
const SPIDER_DEAD_END = JSON.parse(readFileSync(new URL('./spider-dead-end.json', import.meta.url), 'utf8'));
/**
 * FreeCell, made up: a deal that can be won, with four free cells, played at random until no move is left at all; five
 * moves back it can be won again — the game says so, "Start over" standing out (the deal of the day).
 */
const FREECELL_DEAD_END = JSON.parse(readFileSync(new URL('./freecell-dead-end.json', import.meta.url), 'utf8'));

/** Puts the dead end in place of today's deal of the day for a way of turning the stock (runs in the page). */
function plantDeadEnd([store, play, draw]) {
  const t = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const today = `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;
  localStorage.setItem(`${store}daily:${draw}`, JSON.stringify({ version: 1, play: { ...play, draw, daily: today } }));
}

/** Puts the Spider dead end in place of today's Spider of the day for a number of suits (runs in the page). */
function plantSpiderDeadEnd([store, play, suits]) {
  const t = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const today = `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;
  localStorage.setItem(`${store}spider-daily:${suits}`, JSON.stringify({ version: 1, play: { ...play, suits, daily: today } }));
}

/** Puts the FreeCell dead end in place of today's FreeCell of the day for a number of free cells (runs in the page). */
function plantFreeCellDeadEnd([store, play, cells]) {
  const t = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const today = `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;
  localStorage.setItem(`${store}freecell-daily:${cells}`, JSON.stringify({ version: 1, play: { ...play, daily: today } }));
}

/** From a deal to the start screen, the FreeCell dead end planted (four free cells), and into FreeCell of the day. */
async function openFreeCellDeadEnd(page) {
  await page.locator('.top .icon-btn').first().click();
  await page.waitForSelector('.pick');
  await page.evaluate(plantFreeCellDeadEnd, [STORE, FREECELL_DEAD_END, 4]);
  await openFreeCell(page, 5);
  await page.waitForFunction(() => document.querySelector('.play--freecell .note__actions button') && document.querySelector('.play--freecell .tools .is-suggested:not([hidden])'), null, { timeout: 60000 });
}

/** From Spider (with four suits chosen) to the start screen, the dead end planted, and into Spider of the day. */
async function openSpiderDeadEnd(page) {
  await page.locator('.top .icon-btn').first().click();
  await page.waitForSelector('.pick');
  await page.evaluate(plantSpiderDeadEnd, [STORE, SPIDER_DEAD_END, 4]);
  await openSpider(page, 3);
  await page.waitForFunction(() => document.querySelector('.play--spider .note__actions button') && document.querySelector('.play--spider .tools .is-suggested:not([hidden])'), null, { timeout: 60000 });
}

/** From a deal to the start screen, the dead end planted (leaving a deal saves it), and into the deal of the day. */
async function openDeadEnd(page, draw) {
  await page.locator('.top .icon-btn').first().click();
  await page.waitForSelector('.pick');
  await page.evaluate(plantDeadEnd, [STORE, DEAD_END, draw]);
  await openDeal(page, 1);
  // the note offers the moves to undo; "Start over" stands out among the tools
  await page.waitForFunction(() => document.querySelector('.note__actions button') && document.querySelector('.tools .is-suggested:not([hidden])'), null, { timeout: 60000 });
}

/** Runs in the page: what must hold on the Solitaire screens besides the common checks. */
function inspectSolitaire() {
  const out = [];
  const shown = (el) => el && getComputedStyle(el).display !== 'none' && el.getClientRects().length > 0 && !el.closest('[hidden]');
  for (const el of document.querySelectorAll('.note__text, .info__text, .pick__name, .pick__state')) {
    if (shown(el) && !el.textContent.trim()) out.push(`empty ${el.className}`);
  }
  // Klondike's table and Spider's: the one on the screen
  for (const table of document.querySelectorAll('.table')) {
    if (!shown(table)) continue;
    const t = table.getBoundingClientRect();
    for (const node of table.querySelectorAll('.card, .slot')) {
      if (!shown(node)) continue;
      const b = node.getBoundingClientRect();
      if (b.left < t.left - 1 || b.right > t.right + 1 || b.top < t.top - 1) out.push(`${node.className.split(' ')[0]} out of the table`);
      if (!node.hasAttribute('aria-hidden') && !node.getAttribute('aria-label')) out.push('a card or place without a name');
    }
    // the value in the corner of every face-up card fits the card
    for (const card of table.querySelectorAll('.card:not(.is-down)')) {
      const c = card.getBoundingClientRect();
      const i = card.querySelector('.card__index').getBoundingClientRect();
      if (i.right > c.right + 1 || i.bottom > c.bottom + 1) out.push('a card corner does not fit its card');
    }
    if ([...table.querySelectorAll('.card, .slot')].filter((n) => n.tabIndex === 0).length !== 1) out.push('the table is not one Tab stop');
    // the drawn look: a face-down card must not show the figure of a jack, queen or king
    for (const f of table.querySelectorAll('.card.is-down .card__figure')) {
      const st = getComputedStyle(f);
      if (st.display !== 'none' && st.visibility !== 'hidden') out.push('a face-down card shows its figure');
    }
  }
  return out;
}

/** The narrowest card, px (null — no table). */
const cardWidth = () => {
  const card = document.querySelector('.table .card');
  return card ? card.getBoundingClientRect().width : null;
};

async function openDeal(page, nth = 0) {
  await page.locator('.pick').nth(nth).click();
  await page.waitForSelector('.table .card:not(.is-down)', { timeout: 60000 });
  await page.waitForTimeout(250); // the cards slide to their places
}

/** Spider from the start screen: 2 — a deal, 3 — Spider of the day. */
async function openSpider(page, nth = 2) {
  await page.locator('.pick').nth(nth).click();
  await page.waitForSelector('.table--spider .card:not(.is-down)', { timeout: 60000 });
  await page.waitForTimeout(250);
}

/** FreeCell from the start screen: 4 — a deal, 5 — FreeCell of the day. */
async function openFreeCell(page, nth = 4) {
  await page.locator('.pick').nth(nth).click();
  await page.waitForSelector('.table--freecell .card', { timeout: 60000 });
  await page.waitForTimeout(250);
}

/** FreeCell's number of free cells in the menu (the fifth group of choices, after Spider's suits). */
async function freeCells(page, n) {
  await page.locator('.top .icon-btn').nth(1).click();
  await page.locator('dialog[open] .choices').nth(4).locator('.choices__btn').nth([4, 3, 2].indexOf(n)).click();
  await page.locator('dialog[open] .dialog__actions .btn--primary').click();
  await page.waitForSelector('.table--freecell .card', { timeout: 60000 });
  await page.waitForTimeout(250);
}

/** Spider's number of suits in the menu (the fourth group of choices: language, way of turning, deals, suits). */
async function spiderSuits(page, n) {
  await page.locator('.top .icon-btn').nth(1).click();
  await page.locator('dialog[open] .choices').nth(3).locator('.choices__btn').nth([1, 2, 4].indexOf(n)).click();
  await page.locator('dialog[open] .dialog__actions .btn--primary').click();
  await page.waitForSelector('.table--spider .card:not(.is-down)', { timeout: 60000 });
  await page.waitForTimeout(250);
}

/** Runs in the page: the hinted move as points to drag between (the lowest card by the strip of it that shows), or the stock. */
function hintedSpot() {
  const shownIn = (sel) => [...document.querySelectorAll(sel)].filter((e) => e.getClientRects().length > 0);
  if (shownIn('.slot--stock.is-hint').length) return 'stock';
  const cards = shownIn('.card.is-hint').map((c) => c.getBoundingClientRect()).sort((a, b) => a.top - b.top);
  const to = shownIn('.card.is-target')[0] ?? shownIn('.slot.is-target')[0];
  if (!cards.length || !to) return null;
  const a = cards[0];
  const strip = cards.length > 1 ? Math.min(cards[1].top - a.top, a.height) : a.height;
  const b = to.getBoundingClientRect();
  return { x0: a.left + a.width / 2, y0: a.top + strip / 2, x1: b.left + b.width / 2, y1: b.top + b.height / 2 };
}

/** Drags with the mouse from one point to another, in steps. */
async function dragMouse(page, s) {
  await page.mouse.move(s.x0, s.y0);
  await page.mouse.down();
  for (let k = 1; k <= 6; k++) await page.mouse.move(s.x0 + ((s.x1 - s.x0) * k) / 6, s.y0 + ((s.y1 - s.y0) * k) / 6);
  await page.mouse.up();
  await page.waitForTimeout(220);
}

export async function audit({ browser, origin, axe, fail, shots }) {
  const base = `${origin}/solitaire/`;
  const check = async (page, label) => {
    await page.waitForTimeout(220);
    const problems = [
      ...(await page.evaluate(inspectScreen, { width: page.viewportSize().width, dense: DENSE })),
      ...(await page.evaluate(inspectSolitaire)),
      ...(await axe(page)),
    ];
    for (const p of problems) fail(`solitaire ${label}: ${p}`);
  };
  const shot = async (page, name) => {
    if (shots) await page.screenshot({ path: join(shots, `solitaire-${name}.png`) });
  };
  const hint = async (page) => {
    await page.keyboard.press('h');
    await page.waitForFunction(() => !document.querySelector('.tool[aria-busy="true"]'), null, { timeout: 60000 });
  };

  for (const [width, height] of SIZES) {
    for (const [locale, colorScheme] of LOOKS) {
      const label = `${width}×${height} ${locale} ${colorScheme}`;
      const ctx = await browser.newContext({ viewport: { width, height }, locale, colorScheme, isMobile: width < 768, hasTouch: width < 1024 });
      const page = await ctx.newPage();
      watch(page, `solitaire ${label}`, origin, fail);
      await page.goto(base);
      await page.waitForSelector('.pick');
      await check(page, `${label} start`);
      await openDeal(page);
      await check(page, `${label} deal`);
      if (width >= 360 && width < height) {
        const w = await page.evaluate(cardWidth);
        if (w !== null && w < 44 - 0.5) fail(`solitaire ${label}: a card is ${w.toFixed(1)} px wide`);
      }
      for (let i = 0; i < 4; i++) await page.locator('.slot--stock').click();
      await check(page, `${label} stock turned`);
      await hint(page);
      await check(page, `${label} hint`);
      // the widest settings: the time, four colours, the large mode, the left hand; three cards a turn
      await page.locator('.top .icon-btn').nth(1).click();
      await check(page, `${label} menu`);
      // the boxes: FreeCell's cards home by themselves (on by default), the time, the left hand, four colours, large
      for (const n of [1, 2, 3, 4]) await page.locator('dialog[open] input[type=checkbox]').nth(n).check();
      await page.locator('dialog[open] .choices__btn').filter({ hasText: /3|три|Három|Three/i }).first().click();
      // the simple look (the drawn one is the default): in one of the looks of every size
      if (locale === 'hu-HU') await page.locator('dialog[open] .choices__btn', { hasText: 'Egyszerű' }).click();
      await page.locator('dialog[open] .dialog__actions .btn--primary').click();
      await page.waitForSelector('.table .card:not(.is-down)', { timeout: 60000 });
      await check(page, `${label} three a turn, time, four colours, large, left hand`);
      await shot(page, `${width}x${height}-${locale}-${colorScheme}`);
      // the deal of the day from the start screen
      await page.locator('.top .icon-btn').first().click();
      await page.waitForSelector('.pick');
      await check(page, `${label} start again`);
      await openDeal(page, 1);
      await check(page, `${label} deal of the day`);
      // the deal of the day in a dead end: the note and its two buttons
      await openDeadEnd(page, 3);
      await check(page, `${label} deal of the day, no way left`);
      await shot(page, `${width}x${height}-${locale}-${colorScheme}-dead-end`);
      // Spider (decision of 26.11): a deal, the stock dealt, a hint, four suits, Spider of the day where no way is left
      await page.locator('.top .icon-btn').first().click();
      await page.waitForSelector('.pick');
      await openSpider(page);
      await check(page, `${label} spider`);
      await page.locator('.table--spider .slot--stock').click();
      await check(page, `${label} spider dealt`);
      await hint(page);
      await check(page, `${label} spider hint`);
      await shot(page, `${width}x${height}-${locale}-${colorScheme}-spider`);
      await spiderSuits(page, 4);
      await check(page, `${label} spider four suits`);
      await openSpiderDeadEnd(page);
      await check(page, `${label} spider of the day, no way left`);
      // FreeCell (decision of 28.11): a deal, a card touched, a hint, two free cells, the deal of the day where no way is left
      await page.locator('.top .icon-btn').first().click();
      await page.waitForSelector('.pick');
      await openFreeCell(page);
      await check(page, `${label} freecell`);
      // the top card of the first column, chosen with the keys (an arrow brings the focus onto it) and played by Enter
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('Enter');
      await check(page, `${label} freecell card played`);
      await hint(page);
      await check(page, `${label} freecell hint`);
      await shot(page, `${width}x${height}-${locale}-${colorScheme}-freecell`);
      await freeCells(page, 2);
      await check(page, `${label} freecell two cells`);
      await freeCells(page, 4);
      await openFreeCellDeadEnd(page);
      await check(page, `${label} freecell of the day, no way left`);
      await ctx.close();
    }
  }

  // phones on their side (decision of 25.11): the table on the left as tall as the screen, the rest on the right —
  // nothing to scroll in play; 740 × 290 and 640 × 290 are phones in a browser whose own bar takes part of the height
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
    watch(page, `solitaire ${label}`, origin, fail);
    const side = async (what) => {
      await check(page, `${label} ${what}`);
      const m = await page.evaluate(() => {
        const shownOf = (sel) => [...document.querySelectorAll(sel)].find((e) => e.getClientRects().length > 0);
        const table = shownOf('.table').getBoundingClientRect();
        const tools = shownOf('.tools').getBoundingClientRect();
        return { scroll: document.scrollingElement.scrollHeight - innerHeight, beside: table.right <= tools.left + 1 };
      });
      if (m.scroll > 1) fail(`solitaire ${label} ${what}: the page scrolls ${m.scroll} px in play`);
      if (!m.beside) fail(`solitaire ${label} ${what}: the table is not beside the tools`);
    };
    await page.goto(base);
    await page.waitForSelector('.pick');
    await check(page, `${label} start`);
    await openDeal(page);
    await side('deal, how to play');
    for (let i = 0; i < 3; i++) await page.locator('.slot--stock').click();
    await side('stock turned');
    await hint(page);
    await side('hint');
    await page.locator('.top .icon-btn').nth(1).click();
    for (const n of [1, 2, 4]) await page.locator('dialog[open] input[type=checkbox]').nth(n).check();
    await page.locator('dialog[open] .dialog__actions .btn--primary').click();
    await side('time, large, left hand');
    await shot(page, `side-${width}x${height}`);
    await openDeadEnd(page, 1);
    await side('deal of the day, no way left');
    await page.locator('.top .icon-btn').first().click();
    await page.waitForSelector('.pick');
    await openSpider(page);
    await side('spider');
    await hint(page);
    await side('spider hint');
    await shot(page, `side-${width}x${height}-spider`);
    await spiderSuits(page, 4);
    await openSpiderDeadEnd(page);
    await side('spider of the day, no way left');
    await page.locator('.top .icon-btn').first().click();
    await page.waitForSelector('.pick');
    await openFreeCell(page);
    await side('freecell');
    await hint(page);
    await side('freecell hint');
    await shot(page, `side-${width}x${height}-freecell`);
    await openFreeCellDeadEnd(page);
    await side('freecell of the day, no way left');
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
    await openDeal(page);
    await check(page, `${width}×${height} text ${size}% deal`);
    await hint(page);
    await check(page, `${width}×${height} text ${size}% hint`);
    await openDeadEnd(page, 1);
    await check(page, `${width}×${height} text ${size}% deal of the day, no way left`);
    await page.locator('.top .icon-btn').first().click();
    await page.waitForSelector('.pick');
    await openSpider(page);
    await check(page, `${width}×${height} text ${size}% spider`);
    await hint(page);
    await check(page, `${width}×${height} text ${size}% spider hint`);
    await spiderSuits(page, 4);
    await openSpiderDeadEnd(page);
    await check(page, `${width}×${height} text ${size}% spider of the day, no way left`);
    await page.locator('.top .icon-btn').first().click();
    await page.waitForSelector('.pick');
    await openFreeCell(page);
    await check(page, `${width}×${height} text ${size}% freecell`);
    await hint(page);
    await check(page, `${width}×${height} text ${size}% freecell hint`);
    await openFreeCellDeadEnd(page);
    await check(page, `${width}×${height} text ${size}% freecell of the day, no way left`);
    await ctx.close();
  }

  // the keyboard, and one deal to the end by the hints (the stock by D, moves by dragging with the mouse)
  {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, locale: 'en-GB' });
    const page = await ctx.newPage();
    watch(page, 'solitaire keyboard', origin, fail);
    await page.goto(base);
    await page.waitForSelector('.pick');
    await checkFocusVisible(page, 6, fail, 'solitaire keyboard start');
    await openDeal(page);
    await checkFocusVisible(page, 8, fail, 'solitaire keyboard deal');
    await page.keyboard.press('ArrowRight');
    if (!(await page.evaluate(() => !!document.activeElement?.closest('.table')))) fail('solitaire keyboard: an arrow did not bring the focus onto the table');
    for (let guard = 0; guard < 400 && !(await page.$('dialog[open]')); guard++) {
      const finish = page.locator('.note__actions .btn');
      if (await finish.count()) {
        await finish.first().click();
        await page.waitForSelector('dialog[open]', { timeout: 30000 }).catch(() => undefined);
        break;
      }
      await hint(page);
      if (await page.$('.slot--stock.is-hint')) {
        await page.keyboard.press('d');
        await page.waitForTimeout(220);
        continue;
      }
      const spots = await page.evaluate(() => {
        const from = [...document.querySelectorAll('.card.is-hint')].sort((a, b) => Number(a.style.zIndex) - Number(b.style.zIndex))[0];
        const to = document.querySelector('.card.is-target') || document.querySelector('.slot.is-target');
        if (!from || !to) return null;
        const a = from.getBoundingClientRect();
        const b = to.getBoundingClientRect();
        return { x0: a.left + a.width / 2, y0: a.top + Math.min(10, a.height / 2), x1: b.left + b.width / 2, y1: b.top + b.height / 2 };
      });
      if (!spots) {
        fail(`solitaire keyboard: a hint without a move (${(await page.textContent('.note__text')).trim()})`);
        break;
      }
      await page.mouse.move(spots.x0, spots.y0);
      await page.mouse.down();
      for (let k = 1; k <= 6; k++) await page.mouse.move(spots.x0 + ((spots.x1 - spots.x0) * k) / 6, spots.y0 + ((spots.y1 - spots.y0) * k) / 6);
      await page.mouse.up();
      await page.waitForTimeout(220);
    }
    await page.waitForSelector('dialog[open]', { timeout: 30000 }).catch(() => fail('solitaire keyboard: no "solved" window at the end'));
    await check(page, 'solved');
    const stats = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), `${STORE}stats`);
    if (stats?.['1']?.won !== 1) fail(`solitaire keyboard: statistics did not count the deal (${JSON.stringify(stats)})`);
    await shot(page, 'solved');
    await ctx.close();
  }

  // Spider: the keyboard, and one deal to the end by the hints (the stock by D, runs dragged with the mouse)
  {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, locale: 'uk-UA' });
    const page = await ctx.newPage();
    watch(page, 'solitaire spider keyboard', origin, fail);
    await page.goto(base);
    await page.waitForSelector('.pick');
    await openSpider(page);
    await checkFocusVisible(page, 8, fail, 'solitaire spider keyboard');
    await page.keyboard.press('ArrowRight');
    if (!(await page.evaluate(() => !!document.activeElement?.closest('.table--spider')))) fail('solitaire spider keyboard: an arrow did not bring the focus onto the table');
    for (let guard = 0; guard < 400 && !(await page.$('dialog[open]')); guard++) {
      await hint(page);
      const spot = await page.evaluate(hintedSpot);
      if (spot === 'stock') {
        await page.keyboard.press('d');
        await page.waitForTimeout(220);
        continue;
      }
      if (!spot) {
        fail(`solitaire spider keyboard: a hint without a move (${(await page.textContent('.play--spider .note__text')).trim()})`);
        break;
      }
      await dragMouse(page, spot);
    }
    await page.waitForSelector('dialog[open]', { timeout: 30000 }).catch(() => fail('solitaire spider keyboard: no "solved" window at the end'));
    await check(page, 'spider solved');
    const stats = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), `${STORE}spider-stats`);
    if (stats?.['1']?.won !== 1) fail(`solitaire spider keyboard: statistics did not count the deal (${JSON.stringify(stats)})`);
    await shot(page, 'spider-solved');
    await ctx.close();
  }
  // FreeCell: the keyboard, and one deal to the end by the hints (cards dragged with the mouse; "Collect all" by F)
  {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, locale: 'hu-HU' });
    const page = await ctx.newPage();
    watch(page, 'solitaire freecell keyboard', origin, fail);
    await page.goto(base);
    await page.waitForSelector('.pick');
    await openFreeCell(page);
    await checkFocusVisible(page, 8, fail, 'solitaire freecell keyboard');
    await page.keyboard.press('ArrowRight');
    if (!(await page.evaluate(() => !!document.activeElement?.closest('.table--freecell')))) fail('solitaire freecell keyboard: an arrow did not bring the focus onto the table');
    for (let guard = 0; guard < 400 && !(await page.$('dialog[open]')); guard++) {
      if (await page.locator('.play--freecell .note__actions .btn').count()) {
        await page.keyboard.press('f');
        await page.waitForSelector('dialog[open]', { timeout: 30000 }).catch(() => undefined);
        break;
      }
      await hint(page);
      const spot = await page.evaluate(hintedSpot);
      if (!spot || spot === 'stock') {
        if (await page.locator('.play--freecell .note__actions .btn').count()) continue;
        fail(`solitaire freecell keyboard: a hint without a move (${(await page.textContent('.play--freecell .note__text')).trim()})`);
        break;
      }
      await dragMouse(page, spot);
    }
    await page.waitForSelector('dialog[open]', { timeout: 30000 }).catch(() => fail('solitaire freecell keyboard: no "solved" window at the end'));
    await check(page, 'freecell solved');
    const stats = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), `${STORE}freecell-stats`);
    if (stats?.['4']?.won !== 1) fail(`solitaire freecell keyboard: statistics did not count the deal (${JSON.stringify(stats)})`);
    await shot(page, 'freecell-solved');
    await ctx.close();
  }

  // "New deal" in the middle of a deal deals anew (found 28.11: Spider opened the same deal again, saved once more as it
  // was left) — Spider after the stock dealt, FreeCell after a card played; N twice (the second press deals)
  {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, locale: 'en-GB' });
    const page = await ctx.newPage();
    watch(page, 'solitaire new deal', origin, fail);
    const seedOf = (key) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? 'null')?.play?.seed ?? null, `${STORE}${key}`);
    await page.goto(base);
    await page.waitForSelector('.pick');
    await openSpider(page);
    const spiderBefore = await seedOf('spider:1');
    await page.locator('.table--spider .slot--stock').click();
    await page.keyboard.press('n');
    await page.keyboard.press('n');
    await page.waitForFunction((k) => JSON.parse(localStorage.getItem(k) ?? 'null')?.play?.history?.length === 0, `${STORE}spider:1`, { timeout: 60000 }).catch(() => undefined);
    if ((await seedOf('spider:1')) === spiderBefore) fail('solitaire new deal: Spider opened the same deal again');
    await page.locator('.top .icon-btn').first().click();
    await page.waitForSelector('.pick');
    await openFreeCell(page);
    const freeBefore = await seedOf('freecell:4');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    await page.keyboard.press('n');
    await page.keyboard.press('n');
    await page.waitForFunction((k) => JSON.parse(localStorage.getItem(k) ?? 'null')?.play?.history?.length === 0, `${STORE}freecell:4`, { timeout: 60000 }).catch(() => undefined);
    if ((await seedOf('freecell:4')) === freeBefore) fail('solitaire new deal: FreeCell opened the same deal again');
    await ctx.close();
  }
  return `${SIZES.length} sizes × ${LOOKS.length} looks, three a turn, Spider with one and four suits, FreeCell with four and two cells, phones on their side, large text, keyboard, a deal of each to the end, a new deal mid-game`;
}
