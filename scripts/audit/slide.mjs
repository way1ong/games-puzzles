// Browser audit of Slide: every size and look — the start screen; the fifteen (how to play, a tile slid, a hint and
// what it does, the goal shown, 3x3 to the end by the hints; a tile in its place has its check mark); the menu with
// the widest settings (picture and numbers, the time, the large mode, the left hand) and the whole picture; "Clear the
// way" (level 1: how to play, a piece taken, a hint with its place, to the end by the hints), free play hard, the
// days; "The chest" (level 1: how to play, a piece taken, a hint with its place and its move, to the end by the hints;
// the tray keeps its shape), free play hard, its day; phones on their side; large system text; the keyboard: the
// tiles and the pieces by the arrows, a slide and a move by Enter, puzzles to the end by H.
import { join } from 'node:path';
import { LOOKS, SIZES, checkFocusVisible, inspectScreen, watch } from './common.mjs';

const STORE = 'way1ong-slide:v1:';

/** Runs in the page: what must hold on the Slide screens besides the common checks. */
function inspectSlide() {
  const out = [];
  const shown = (el) => el && getComputedStyle(el).display !== 'none' && el.getClientRects().length > 0 && !el.closest('[hidden]');
  for (const el of document.querySelectorAll('.info__text, .pick__name')) {
    if (shown(el) && !el.textContent.trim()) out.push(`empty ${el.className}`);
  }
  const note = document.querySelector('.note');
  if (shown(note) && !note.classList.contains('is-empty') && !note.querySelector('.note__text').textContent.trim()) out.push('an empty note');
  const board = document.querySelector('.tiles') ?? document.querySelector('.yard');
  if (!shown(board)) return out;
  const b = board.getBoundingClientRect();
  if (board.classList.contains('yard--box')) {
    // the tray of "The chest" is taller than wide: its cells and its frame keep their shape
    const v = (name) => parseFloat(board.style.getPropertyValue(name));
    const shape = (v('--cols') + 2 * v('--frame')) / (v('--rows') + 2 * v('--frame'));
    if (Math.abs(b.width / b.height - shape) > 0.01) out.push(`the tray is out of shape (${Math.round(b.width)}×${Math.round(b.height)})`);
  } else if (Math.abs(b.width - b.height) > 1) out.push(`the board is not square (${Math.round(b.width)}×${Math.round(b.height)})`);
  if (b.left < -1 || b.right > innerWidth + 1) out.push('the board goes beyond the screen');
  const parts = [...board.querySelectorAll('.tile[data-tile], .piece')];
  // a tile on its own cell shows its check mark, any other tile none
  for (const t of board.querySelectorAll('.tile[data-tile]')) {
    const ok = getComputedStyle(t.querySelector('.tile__ok')).display !== 'none';
    if (ok !== t.classList.contains('is-home')) out.push(`tile ${t.dataset.tile}: the check mark ${ok ? 'on a tile out of place' : 'missing'}`);
  }
  if (parts.filter((p) => p.tabIndex === 0).length !== 1) out.push('the board is not one Tab stop');
  // the narrow side of a tile or piece under a finger (rule 6): 44 px; on a phone on its side whose browser bar
  // leaves under 300 px of height, a cell of the 6x6 board may be 40 px (a piece is still 2 cells long; the cells of
  // the chest's tray are larger)
  const least = innerHeight < 300 ? 40 : 43.5;
  for (const p of parts) {
    const r = p.getBoundingClientRect();
    if (Math.min(r.width, r.height) < least) out.push(`${p.className.split(' ')[0]} ${p.dataset.tile ?? p.dataset.piece} is ${Math.round(r.width)}×${Math.round(r.height)} px to touch`);
    if (!p.getAttribute('aria-label')) out.push(`${p.className} without a name`);
  }
  // the board does not reach under the note or the buttons
  for (const sel of ['.note', '.tools:not([hidden])']) {
    const el = document.querySelector(sel);
    if (!shown(el)) continue;
    const r = el.getBoundingClientRect();
    const overlap = Math.min(b.right, r.right) - Math.max(b.left, r.left) > 1 && Math.min(b.bottom, r.bottom) - Math.max(b.top, r.top) > 1;
    if (overlap && getComputedStyle(el).visibility !== 'hidden') out.push(`the board lies under ${sel}`);
  }
  return out;
}

export async function audit({ browser, origin, axe, fail, shots }) {
  const base = `${origin}/slide/`;
  const check = async (page, label) => {
    await page.waitForTimeout(150);
    const problems = [...(await page.evaluate(inspectScreen, { width: page.viewportSize().width, skip: '.tile, .piece' })), ...(await page.evaluate(inspectSlide)), ...(await axe(page))];
    for (const p of problems) fail(`slide ${label}: ${p}`);
  };
  const shot = async (page, name) => {
    if (shots) await page.screenshot({ path: join(shots, `slide-${name}.png`) });
  };
  /** Before a page is loaded anew: the game's service worker has taken the page over. */
  const settled = (page) =>
    page.evaluate(() =>
      navigator.serviceWorker.ready.then(
        () => new Promise((done) => (navigator.serviceWorker.controller ? done(true) : navigator.serviceWorker.addEventListener('controllerchange', () => done(true), { once: true }))),
      ),
    );
  const openGame = async (page, route) => {
    await page.goto(`${base}#${route}`);
    await page.waitForSelector('.tile, .piece');
    await page.waitForTimeout(250);
  };
  /** The moves of the game saved in a slot (the screen saves after every move). */
  const movesIn = (page, slot) => page.evaluate((k) => JSON.parse(localStorage.getItem(k))?.play.history.length ?? 0, `${STORE}play:${slot}`);
  /** The arrow key that moves the hint's piece one cell toward the place the hint shows. */
  const hintKey = (page) =>
    page.evaluate(() => {
      const b = document.querySelector('.piece.is-hint');
      const g = document.querySelector('.ghost');
      const dx = +g.style.getPropertyValue('--x') - +b.style.getPropertyValue('--x');
      const dy = +g.style.getPropertyValue('--y') - +b.style.getPropertyValue('--y');
      return { piece: b.dataset.piece, key: dx ? (dx > 0 ? 'ArrowRight' : 'ArrowLeft') : dy > 0 ? 'ArrowDown' : 'ArrowUp' };
    });
  /** Presses H until the end window (a hint, then "Do it"). */
  const byHints = async (page, label) => {
    for (let guard = 0; guard < 600 && !(await page.$('dialog:has(#end-title)[open]')); guard++) await page.keyboard.press('h');
    await page.waitForSelector('dialog:has(#end-title)[open]', { timeout: 30000 }).catch(() => fail(`slide ${label}: no end window`));
  };

  for (const [width, height] of SIZES) {
    for (const [locale, colorScheme] of LOOKS) {
      const label = `${width}×${height} ${locale} ${colorScheme}`;
      const ctx = await browser.newContext({ viewport: { width, height }, locale, colorScheme, isMobile: width < 768, hasTouch: width < 1024 });
      const page = await ctx.newPage();
      watch(page, `slide ${label}`, origin, fail);
      await page.goto(base);
      await page.waitForSelector('.pick');
      await check(page, `${label} start`);
      // the fifteen 3x3
      await page.locator('.pick').first().click();
      await page.waitForSelector('.tile');
      await check(page, `${label} fifteen, how to play`);
      const near = await page.evaluate(() => {
        const tiles = [...document.querySelectorAll('.tile[data-tile]')].map((t) => ({ t: t.dataset.tile, r: +t.style.getPropertyValue('--r'), c: +t.style.getPropertyValue('--c') }));
        const used = new Set(tiles.map((x) => x.r * 3 + x.c));
        const gap = [...Array(9).keys()].find((i) => !used.has(i));
        return tiles.find((x) => Math.abs(x.r - Math.floor(gap / 3)) + Math.abs(x.c - (gap % 3)) === 1).t;
      });
      await page.locator(`.tile[data-tile="${near}"]`).click();
      if ((await page.locator('.info__moves').textContent()).match(/^0\D/)) fail(`slide ${label}: a tap did not slide a tile`);
      await check(page, `${label} fifteen, a tile slid`);
      await page.keyboard.press('h');
      await check(page, `${label} fifteen hint`);
      await page.keyboard.press('h');
      await check(page, `${label} fifteen hint done`);
      // the goal over the board (with numbers: the tiles in order), shown and hidden again
      await page.locator('.tools .tool').nth(3).click();
      if (!(await page.locator('.tiles__goal').isVisible())) fail(`slide ${label}: "Goal" did not show the tiles in order`);
      await check(page, `${label} fifteen goal`);
      await page.locator('.tools .tool').nth(3).click();
      await byHints(page, `${label} fifteen`);
      await check(page, `${label} fifteen solved`);
      await shot(page, `${width}x${height}-${locale}-${colorScheme}-fifteen-end`);
      await page.locator('dialog[open] .btn--primary').click();
      await page.waitForTimeout(200);
      // the widest settings: picture and numbers, every switch on
      await page.locator('.top .icon-btn').nth(1).click();
      await check(page, `${label} menu`);
      await page.locator('dialog[open] .choices').nth(1).locator('.choices__btn').nth(2).click();
      const toggles = page.locator('dialog[open] input[type=checkbox]');
      for (let n = 0; n < (await toggles.count()); n++) await toggles.nth(n).check();
      await page.locator('dialog[open] .dialog__actions .btn--primary').click();
      await check(page, `${label} fifteen with picture and numbers, settings changed`);
      await shot(page, `${width}x${height}-${locale}-${colorScheme}-picture`);
      await page.locator('.tools .tool').nth(3).click();
      if (!(await page.locator('.tiles__whole').isVisible())) fail(`slide ${label}: "Picture" did not show the picture`);
      await check(page, `${label} the whole picture`);
      await page.locator('.tools .tool').nth(3).click();
      // "Clear the way": level 1
      await openGame(page, 'levels');
      await check(page, `${label} level 1, how to play`);
      await page.locator('.piece').nth(1).click();
      await check(page, `${label} a piece taken or stuck`);
      await page.keyboard.press('h');
      if (!(await page.locator('.ghost:not([hidden])').count())) fail(`slide ${label}: the hint shows no place`);
      await check(page, `${label} level hint`);
      await shot(page, `${width}x${height}-${locale}-${colorScheme}-level-hint`);
      await byHints(page, `${label} level 1`);
      await check(page, `${label} level 1 solved`);
      await page.locator('dialog[open] .btn--primary').click();
      await page.waitForTimeout(200);
      await check(page, `${label} level 2`);
      await openGame(page, 'unblock-hard');
      await check(page, `${label} free play hard`);
      await shot(page, `${width}x${height}-${locale}-${colorScheme}-hard`);
      // "The chest": level 1 — how to play, a piece taken, a hint with its place and what it does, to the end by hints
      await openGame(page, 'box-levels');
      if (!(await page.locator('.yard--box').count())) fail(`slide ${label}: the chest's levels show no tray`);
      await check(page, `${label} chest level 1, how to play`);
      await page.locator('.piece').nth(1).click();
      await check(page, `${label} chest, a piece taken or stuck`);
      await page.keyboard.press('h');
      if (!(await page.locator('.ghost:not([hidden])').count())) fail(`slide ${label}: the chest's hint shows no place`);
      await check(page, `${label} chest hint`);
      await shot(page, `${width}x${height}-${locale}-${colorScheme}-chest-hint`);
      await page.keyboard.press('h');
      if ((await movesIn(page, 'box-levels')) !== 1) fail(`slide ${label}: the chest's hint did not make its move`);
      await check(page, `${label} chest hint done`);
      await byHints(page, `${label} chest level 1`);
      await check(page, `${label} chest level 1 solved`);
      await page.locator('dialog[open] .btn--primary').click();
      await page.waitForTimeout(200);
      await check(page, `${label} chest level 2`);
      await openGame(page, 'box-hard');
      await check(page, `${label} chest free play hard`);
      await shot(page, `${width}x${height}-${locale}-${colorScheme}-chest-hard`);
      await page.evaluate((s) => localStorage.removeItem(`${s}last`), STORE);
      await settled(page);
      await page.goto(base);
      await page.waitForSelector('.pick');
      await check(page, `${label} start after games`);
      // the day of each mode with a set: the last choice of its part of the start screen
      await page.locator('.home__part').nth(1).locator('.pick').last().click();
      await page.waitForSelector('.piece');
      await check(page, `${label} the level of the day`);
      // back to the start (else the game opens where the player stopped)
      await page.evaluate((s) => localStorage.removeItem(`${s}last`), STORE);
      await page.goto(base);
      await page.waitForSelector('.pick');
      await page.locator('.home__part').nth(2).locator('.pick').last().click();
      await page.waitForSelector('.yard--box .piece');
      await check(page, `${label} the chest of the day`);
      await openGame(page, 'fifteen-day');
      await check(page, `${label} the fifteen of the day`);
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
    watch(page, `slide ${label}`, origin, fail);
    await page.goto(base);
    if (left) {
      await page.evaluate((s) => localStorage.setItem(`${s}settings`, JSON.stringify({ leftHand: true, big: true, faces: 'both' })), STORE);
      await settled(page);
      await page.reload();
    }
    await page.waitForSelector('.pick');
    await check(page, `${label} start`);
    const side = async (what) => {
      await check(page, `${label} ${what}`);
      const m = await page.evaluate(() => {
        const board = document.querySelector('.board').getBoundingClientRect();
        const tools = document.querySelector('.tools:not([hidden])').getBoundingClientRect();
        return { scroll: document.scrollingElement.scrollHeight - innerHeight, right: board.right <= tools.left + 1, left: tools.right <= board.left + 1 };
      });
      if (m.scroll > 1) fail(`slide ${label} ${what}: the page scrolls ${m.scroll} px in play`);
      if (!(left ? m.left : m.right)) fail(`slide ${label} ${what}: the board is not ${left ? 'right of' : 'left of'} the buttons`);
    };
    await openGame(page, 'fifteen-medium');
    await side('fifteen, how to play');
    await page.keyboard.press('h');
    await side('fifteen hint');
    await openGame(page, 'levels');
    await side('level 1');
    await page.keyboard.press('h');
    await side('level hint');
    await openGame(page, 'unblock-hard');
    await side('hard');
    await shot(page, `side-${width}x${height}`);
    await openGame(page, 'box-levels');
    await side('chest level 1');
    await page.keyboard.press('h');
    await side('chest hint');
    await openGame(page, 'box-hard');
    await side('chest hard');
    await shot(page, `side-${width}x${height}-chest`);
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
    watch(page, `slide text ${size}%`, origin, fail);
    const big = () => page.addStyleTag({ content: `html { font-size: ${size}% !important; }` });
    await page.goto(base);
    await page.waitForSelector('.pick');
    await big();
    await check(page, `${width}×${height} text ${size}% start`);
    for (const route of ['fifteen-hard', 'unblock-medium', 'box-medium']) {
      await openGame(page, route);
      await big();
      await page.waitForTimeout(150);
      await check(page, `${width}×${height} text ${size}% ${route}`);
      await page.keyboard.press('h');
      await check(page, `${width}×${height} text ${size}% ${route} hint`);
    }
    await ctx.close();
  }

  // the keyboard: the tiles and the pieces by the arrows, a slide and a move by Enter, puzzles to the end by H
  {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, locale: 'en-GB' });
    const page = await ctx.newPage();
    watch(page, 'slide keyboard', origin, fail);
    await page.goto(base);
    await page.waitForSelector('.pick');
    await checkFocusVisible(page, 6, fail, 'slide keyboard start');
    await openGame(page, 'fifteen-medium');
    await checkFocusVisible(page, 8, fail, 'slide keyboard fifteen');
    await page.locator('.tile[tabindex="0"]').focus();
    // the keys start in the top left corner: right and down go to other tiles
    const first = await page.evaluate(() => document.activeElement?.dataset.tile);
    await page.keyboard.press('ArrowRight');
    const second = await page.evaluate(() => document.activeElement?.dataset.tile);
    await page.keyboard.press('ArrowDown');
    const third = await page.evaluate(() => document.activeElement?.dataset.tile);
    if (first === second || second === third) fail(`slide keyboard: the arrows did not move between tiles (${first}, ${second}, ${third})`);
    // a slide by Enter: the hint's tile, focused and pressed
    await page.keyboard.press('h');
    const tile = await page.evaluate(() => document.querySelector('.tile.is-hint')?.dataset.tile);
    const movesOf = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k))?.play.moves ?? 0, `${STORE}play:fifteen-medium`);
    const before = await movesOf();
    await page.locator(`.tile[data-tile="${tile}"]`).focus();
    await page.keyboard.press('Enter');
    if ((await movesOf()) !== before + 1) fail('slide keyboard: Enter did not slide the hint’s tile');
    await byHints(page, 'keyboard fifteen');
    await check(page, 'fifteen solved by the keys');
    const stats = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), `${STORE}stats`);
    if (stats?.fifteen?.medium?.won !== 1) fail(`slide keyboard: statistics did not count the fifteen (${JSON.stringify(stats)})`);
    await page.keyboard.press('Escape');
    // "Clear the way": Enter takes the hint's piece, an arrow moves it
    await openGame(page, 'unblock-medium');
    await page.keyboard.press('h');
    const hinted = await page.evaluate(() => {
      const b = document.querySelector('.piece.is-hint');
      const g = document.querySelector('.ghost');
      const across = +b.style.getPropertyValue('--w') > 1;
      const step = across ? Math.sign(+g.style.getPropertyValue('--x') - +b.style.getPropertyValue('--x')) : Math.sign(+g.style.getPropertyValue('--y') - +b.style.getPropertyValue('--y'));
      return { piece: b.dataset.piece, key: across ? (step > 0 ? 'ArrowRight' : 'ArrowLeft') : step > 0 ? 'ArrowDown' : 'ArrowUp' };
    });
    await page.locator(`.piece[data-piece="${hinted.piece}"]`).focus();
    await page.keyboard.press('Enter');
    if (!(await page.locator('.piece.is-taken').count())) fail('slide keyboard: Enter did not take the piece');
    await page.keyboard.press(hinted.key);
    const moved = await page.evaluate((k) => JSON.parse(localStorage.getItem(k))?.play.history.length ?? 0, `${STORE}play:unblock-medium`);
    if (moved !== 1) fail(`slide keyboard: an arrow did not move the taken piece (${moved})`);
    await page.keyboard.press('Escape');
    await byHints(page, 'keyboard unblock');
    await check(page, 'unblock solved by the keys');
    await shot(page, 'solved');
    await page.keyboard.press('Escape');
    await check(page, 'solved, the window closed');
    // "The chest": Enter takes the hint's piece, an arrow moves it a cell toward the hint's place; then to the end by H
    await openGame(page, 'box-medium');
    await checkFocusVisible(page, 8, fail, 'slide keyboard chest');
    await page.keyboard.press('h');
    const block = await hintKey(page);
    await page.locator(`.piece[data-piece="${block.piece}"]`).focus();
    await page.keyboard.press('Enter');
    if (!(await page.locator('.piece.is-taken').count())) fail('slide keyboard: Enter did not take the chest’s piece');
    await page.keyboard.press(block.key);
    if ((await movesIn(page, 'box-medium')) !== 1) fail('slide keyboard: an arrow did not move the chest’s taken piece');
    await page.keyboard.press('Escape');
    await byHints(page, 'keyboard chest');
    await check(page, 'chest solved by the keys');
    const boxStats = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), `${STORE}stats`);
    if (boxStats?.box?.free?.medium?.won !== 1) fail(`slide keyboard: statistics did not count the chest (${JSON.stringify(boxStats?.box)})`);
    await shot(page, 'chest-solved');
    await page.keyboard.press('Escape');
    await ctx.close();
  }
  return `${SIZES.length} sizes × ${LOOKS.length} looks (three modes), phones on their side, large text, keyboard, puzzles to the end`;
}
