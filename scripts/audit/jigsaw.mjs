// Browser audit of Jigsaw: every size and look — the start screen; the puzzle of the day (how to play, a piece taken by
// a tap, a hint and what it does, the whole picture, zoom when the board can be zoomed, to the end by the hints); the
// choice of a picture; a piece carried by the mouse into its place and to a wrong one; the menu with every switch
// (no pale picture, the time, the large mode, the left hand); the largest puzzle; phones on their side; large system
// text; the keyboard: the tray by the arrows, a piece taken by Enter and put by Enter on its place, H to the end.
import { join } from 'node:path';
import { LOOKS, SIZES, checkFocusVisible, inspectScreen, watch } from './common.mjs';

const STORE = 'way1ong-jigsaw:v1:';

/** Runs in the page: what must hold on the Jigsaw screens besides the common checks. */
function inspectJigsaw() {
  const out = [];
  const shown = (el) => el && getComputedStyle(el).display !== 'none' && el.getClientRects().length > 0 && !el.closest('[hidden]');
  for (const el of document.querySelectorAll('.pick__name, .choice__name, .top__name')) {
    if (shown(el) && !el.textContent.trim()) out.push(`empty ${el.className}`);
  }
  const note = document.querySelector('.note');
  if (shown(note) && !note.classList.contains('is-empty') && !note.querySelector('.note__text').textContent.trim()) out.push('an empty note');
  const board = document.querySelector('.board');
  if (!shown(board)) return out;
  const clip = document.querySelector('.board__clip').getBoundingClientRect();
  if (clip.width < 1 || clip.height < 1) out.push('the board has no size');
  if (clip.left < -1 || clip.right > innerWidth + 1) out.push('the board goes beyond the screen');
  // the board's places: one Tab stop, each named
  const places = [...document.querySelectorAll('.place')];
  if (places.filter((p) => p.tabIndex === 0).length !== 1) out.push('the board is not one Tab stop');
  if (places.some((p) => !p.getAttribute('aria-label'))) out.push('a place without a name');
  // the tray: one Tab stop, every piece named and wholly in the tray, and enough of them on a page
  const tray = document.querySelector('.tray');
  if (shown(tray)) {
    const slots = [...tray.querySelectorAll('.slot')];
    const left = Number(document.querySelector('.top__count')?.textContent.match(/\d+/g)?.[1] ?? 0) - Number(document.querySelector('.top__count')?.textContent.match(/\d+/)?.[0] ?? 0);
    if (slots.length && slots.filter((s) => s.tabIndex === 0).length !== 1) out.push('the tray is not one Tab stop');
    if (slots.some((s) => !s.getAttribute('aria-label'))) out.push('a piece in the tray without a name');
    const grid = tray.querySelector('.tray__pieces').getBoundingClientRect();
    for (const s of slots) {
      const r = s.getBoundingClientRect();
      if (r.top < grid.top - 1 || r.bottom > grid.bottom + 1 || r.left < grid.left - 1 || r.right > grid.right + 1) out.push(`piece ${s.dataset.piece} is cut off by the tray`);
    }
    if (slots.length < Math.min(4, left)) out.push(`the tray holds only ${slots.length} piece(s) on a page`);
  }
  // the board does not reach under the note, the tray or the buttons
  for (const sel of ['.note', '.tray:not([hidden])', '.tools:not([hidden])']) {
    const el = document.querySelector(sel);
    if (!shown(el)) continue;
    const r = el.getBoundingClientRect();
    const overlap = Math.min(clip.right, r.right) - Math.max(clip.left, r.left) > 1 && Math.min(clip.bottom, r.bottom) - Math.max(clip.top, r.top) > 1;
    if (overlap && getComputedStyle(el).visibility !== 'hidden') out.push(`the board lies under ${sel}`);
  }
  return out;
}

export async function audit({ browser, origin, axe, fail, shots }) {
  const base = `${origin}/jigsaw/`;
  const check = async (page, label) => {
    await page.waitForTimeout(150);
    // the board's places are for the keys (a finger touches the board itself), so their size is the game's own check
    const problems = [...(await page.evaluate(inspectScreen, { width: page.viewportSize().width, skip: '.place' })), ...(await page.evaluate(inspectJigsaw)), ...(await axe(page))];
    for (const p of problems) fail(`jigsaw ${label}: ${p}`);
  };
  const shot = async (page, name) => {
    if (shots) await page.screenshot({ path: join(shots, `jigsaw-${name}.png`) });
  };
  /** Before a page is loaded anew: the game's service worker has taken the page over. */
  const settled = (page) =>
    page.evaluate(() =>
      navigator.serviceWorker.ready.then(
        () => new Promise((done) => (navigator.serviceWorker.controller ? done(true) : navigator.serviceWorker.addEventListener('controllerchange', () => done(true), { once: true }))),
      ),
    );
  const placedOf = (page) => page.evaluate(() => Number(document.querySelector('.top__count')?.textContent.match(/\d+/)?.[0] ?? -1));
  /** A new free puzzle of a size, the picture chosen (null — any). */
  const newFree = async (page, size, picture = null) => {
    await page.goto(`${base}#choose-${size}`);
    await page.waitForSelector('.choice');
    await page.locator('.choice').nth(picture ?? 6).click();
    await page.waitForSelector('.slot');
    await page.waitForTimeout(300);
  };
  /** Presses H until the end window (a hint, then "Put it"). */
  const byHints = async (page, label) => {
    for (let guard = 0; guard < 250 && !(await page.$('dialog:has(#end-title)[open]')); guard++) {
      await page.keyboard.press('h');
      if ((await placedOf(page)) < 0) break;
    }
    await page.waitForSelector('dialog:has(#end-title)[open]', { timeout: 30000 }).catch(() => fail(`jigsaw ${label}: no end window`));
  };
  /** The mouse carries the first piece of the tray: into its place, or `wrong` places across from it. */
  const carry = async (page, wrong) => {
    const g = await page.evaluate(() => {
      const slot = document.querySelector('.slot');
      const piece = Number(slot.dataset.piece);
      const board = document.querySelector('.board');
      const cols = Number(getComputedStyle(board).getPropertyValue('--cols'));
      const cell = parseFloat(getComputedStyle(board).getPropertyValue('--cell'));
      const clip = document.querySelector('.board__clip').getBoundingClientRect();
      const s = slot.getBoundingClientRect();
      return { piece, cols, from: { x: s.left + s.width / 2, y: s.top + s.height / 2 }, home: { x: clip.left + ((piece % cols) + 0.5) * cell, y: clip.top + (Math.floor(piece / cols) + 0.5) * cell }, cell };
    });
    const dx = wrong ? ((g.piece % g.cols) + 2 < g.cols ? 2 : -2) * g.cell : 0;
    await page.mouse.move(g.from.x, g.from.y);
    await page.mouse.down();
    for (let k = 1; k <= 8; k++) await page.mouse.move(g.from.x + ((g.home.x + dx - g.from.x) * k) / 8, g.from.y + ((g.home.y - g.from.y) * k) / 8);
    await page.mouse.up();
    await page.waitForTimeout(250);
  };

  for (const [width, height] of SIZES) {
    for (const [locale, colorScheme] of LOOKS) {
      const label = `${width}×${height} ${locale} ${colorScheme}`;
      const ctx = await browser.newContext({ viewport: { width, height }, locale, colorScheme, isMobile: width < 768, hasTouch: width < 1024 });
      const page = await ctx.newPage();
      watch(page, `jigsaw ${label}`, origin, fail);
      await page.goto(base);
      await page.waitForSelector('.pick');
      await check(page, `${label} start`);
      // the puzzle of the day
      await page.locator('.pick').first().click();
      await page.waitForSelector('.slot');
      await page.waitForTimeout(300);
      await check(page, `${label} day, how to play`);
      await page.locator('.slot').first().click();
      if (!(await page.locator('.slot.is-taken').count())) fail(`jigsaw ${label}: a tap did not take a piece`);
      await check(page, `${label} day, a piece taken`);
      await page.keyboard.press('h');
      if (!(await page.locator('.slot.is-hint').count()) || !(await page.locator('.sheet__hint-dark').getAttribute('d'))) fail(`jigsaw ${label}: the hint marks no piece or no place`);
      await check(page, `${label} day hint`);
      await shot(page, `${width}x${height}-${locale}-${colorScheme}-hint`);
      await page.keyboard.press('h');
      if ((await placedOf(page)) !== 1) fail(`jigsaw ${label}: "Put it" did not put the hint's piece`);
      await check(page, `${label} day hint put`);
      // the whole picture over the board, and away again
      await page.locator('.tools .tool').nth(1).click();
      if (!(await page.locator('.board__whole').isVisible())) fail(`jigsaw ${label}: "Picture" did not show the picture`);
      await check(page, `${label} the whole picture`);
      await page.locator('.tools .tool').nth(1).click();
      // zoom, when the board can be zoomed
      const zoom = page.locator('.tools .tool').nth(2);
      if (await zoom.isVisible()) {
        await zoom.click();
        if (!(await page.locator('.board.is-zoomed').count())) fail(`jigsaw ${label}: "Zoom in" did not zoom`);
        await check(page, `${label} zoomed in`);
        await shot(page, `${width}x${height}-${locale}-${colorScheme}-zoomed`);
        await zoom.click();
      }
      await byHints(page, `${label} day`);
      await check(page, `${label} day done`);
      await shot(page, `${width}x${height}-${locale}-${colorScheme}-day-end`);
      await page.locator('dialog[open] .btn--primary').click();
      await page.waitForTimeout(200);
      await check(page, `${label} start after the day`);
      // free play: the choice, any picture, a piece carried into its place and to a wrong one
      await page.goto(`${base}#choose-easy`);
      await page.waitForSelector('.choice');
      await check(page, `${label} choice of a picture`);
      await page.locator('.choice').nth(6).click();
      await page.waitForSelector('.slot');
      await page.waitForTimeout(300);
      await carry(page, false);
      if ((await placedOf(page)) !== 1) fail(`jigsaw ${label}: a piece carried into its place did not stay there`);
      await carry(page, true);
      if ((await placedOf(page)) !== 1) fail(`jigsaw ${label}: a piece let go in a wrong place stayed there`);
      await check(page, `${label} easy, not here`);
      // the widest settings: every switch turned
      await page.locator('.top .icon-btn').nth(1).click();
      await check(page, `${label} menu`);
      const toggles = page.locator('dialog[open] input[type=checkbox]');
      for (let n = 0; n < (await toggles.count()); n++) await toggles.nth(n).click();
      await page.locator('dialog[open] .dialog__actions .btn--primary').click();
      await check(page, `${label} easy, settings changed`);
      await shot(page, `${width}x${height}-${locale}-${colorScheme}-settings`);
      await newFree(page, 'hard', 3);
      await check(page, `${label} hard`);
      await shot(page, `${width}x${height}-${locale}-${colorScheme}-hard`);
      await page.evaluate((s) => localStorage.removeItem(`${s}last`), STORE);
      await settled(page);
      await page.goto(base);
      await page.waitForSelector('.pick');
      await check(page, `${label} start after games`);
      await ctx.close();
    }
  }

  // phones on their side (decision of 25.11): the board on the left as tall as the screen, the rest on the right (on
  // the left for the left hand) — nothing to scroll; 740 × 290 and 640 × 290 are phones in a browser whose own bar
  // takes part of the height
  for (const [width, height, locale, colorScheme, left] of [
    [640, 360, 'uk-UA', 'light', false],
    [740, 360, 'hu-HU', 'dark', true],
    [915, 412, 'en-GB', 'light', false],
    [740, 290, 'uk-UA', 'dark', false],
    [640, 290, 'hu-HU', 'light', true],
  ]) {
    const label = `${width}×${height} side ${locale} ${colorScheme}${left ? ' left hand' : ''}`;
    const ctx = await browser.newContext({ viewport: { width, height }, locale, colorScheme, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    watch(page, `jigsaw ${label}`, origin, fail);
    await page.goto(base);
    if (left) {
      await page.evaluate((s) => localStorage.setItem(`${s}settings`, JSON.stringify({ leftHand: true, big: true })), STORE);
      await settled(page);
      await page.reload();
    }
    await page.waitForSelector('.pick');
    await check(page, `${label} start`);
    const side = async (what) => {
      await check(page, `${label} ${what}`);
      const m = await page.evaluate(() => {
        const board = document.querySelector('.board__clip').getBoundingClientRect();
        const tray = document.querySelector('.tray').getBoundingClientRect();
        return { scroll: document.scrollingElement.scrollHeight - innerHeight, right: board.right <= tray.left + 1, left: tray.right <= board.left + 1 };
      });
      if (m.scroll > 1) fail(`jigsaw ${label} ${what}: the page scrolls ${m.scroll} px in play`);
      if (!(left ? m.left : m.right)) fail(`jigsaw ${label} ${what}: the board is not ${left ? 'right of' : 'left of'} the tray`);
    };
    await page.goto(`${base}#day`);
    await page.waitForSelector('.slot');
    await page.waitForTimeout(300);
    await side('day');
    await page.keyboard.press('h');
    await side('day hint');
    await newFree(page, 'hard');
    await side('hard');
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
    watch(page, `jigsaw text ${size}%`, origin, fail);
    const big = () => page.addStyleTag({ content: `html { font-size: ${size}% !important; }` });
    await page.goto(base);
    await page.waitForSelector('.pick');
    await big();
    await check(page, `${width}×${height} text ${size}% start`);
    await newFree(page, 'medium', 1);
    await big();
    await page.waitForTimeout(300);
    await check(page, `${width}×${height} text ${size}% medium`);
    await page.keyboard.press('h');
    await check(page, `${width}×${height} text ${size}% medium hint`);
    await ctx.close();
  }

  // the keyboard: the tray by the arrows, a piece taken by Enter and put by Enter on its place, H to the end
  {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, locale: 'en-GB' });
    const page = await ctx.newPage();
    watch(page, 'jigsaw keyboard', origin, fail);
    await page.goto(base);
    await page.waitForSelector('.pick');
    await checkFocusVisible(page, 5, fail, 'jigsaw keyboard start');
    await newFree(page, 'easy', 0);
    await checkFocusVisible(page, 8, fail, 'jigsaw keyboard puzzle');
    await page.locator('.slot[tabindex="0"]').focus();
    const first = await page.evaluate(() => document.activeElement?.dataset.piece);
    await page.keyboard.press('ArrowRight');
    const second = await page.evaluate(() => document.activeElement?.dataset.piece);
    if (first === second) fail('jigsaw keyboard: the arrows did not move in the tray');
    await page.keyboard.press('Enter');
    const taken = await page.evaluate(() => Number(document.querySelector('.slot.is-taken')?.dataset.piece ?? -1));
    if (taken < 0 || !(await page.evaluate(() => document.activeElement?.classList.contains('place')))) fail('jigsaw keyboard: Enter did not take the piece and go to the board');
    // the board's keys start at the top left place: walk to the piece's own place and put it
    for (let i = 0; i < Math.floor(taken / 6); i++) await page.keyboard.press('ArrowDown');
    for (let i = 0; i < taken % 6; i++) await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    if ((await placedOf(page)) !== 1) fail('jigsaw keyboard: Enter on its place did not put the piece');
    await byHints(page, 'keyboard easy');
    await check(page, 'easy done by the keys');
    const stats = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), `${STORE}stats`);
    if (stats?.easy?.won !== 1) fail(`jigsaw keyboard: statistics did not count the puzzle (${JSON.stringify(stats)})`);
    await shot(page, 'done');
    await page.keyboard.press('Escape');
    await check(page, 'done, the window closed');
    await ctx.close();
  }
  return `${SIZES.length} sizes × ${LOOKS.length} looks, phones on their side, large text, keyboard, puzzles to the end`;
}
