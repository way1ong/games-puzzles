// Browser audit of Nonograms: every size and look — the start screen, a chapter of the album, a picture (zoomed in or
// whole, as it opens), a cell filled and one crossed, a hint, the whole picture, the menu with the widest settings
// (mistakes at once, the time, the name from the start, the large mode, the left hand), a big grid, the picture of the
// day; phones on their side; large system text; the keyboard; a picture to the end by the hints.
import { join } from 'node:path';
import { LOOKS, SIZES, checkFocusVisible, inspectScreen, watch } from './common.mjs';

/**
 * The cells: at least 24 px (the WCAG 2.2 AA minimum) in any view the game opens by itself (zoomed in on a phone);
 * smaller only in the whole picture the player asks for, where a tap paints too — the same cells come back at a
 * comfortable size with one tap of "Whole picture" (docs/nonograms/SPEC.md, "Великі поля на телефоні — наближення";
 * decision of 27.11). They are measured here, not by the common check: a zoomed grid lies partly beyond the screen by
 * design.
 */
const LEAST_CELL = 24;
const STORE = 'way1ong-nonograms:v1:';

/** Runs in the page: what must hold on the Nonograms screens besides the common checks. */
function inspectNonograms(least) {
  const out = [];
  const shown = (el) => el && getComputedStyle(el).display !== 'none' && el.getClientRects().length > 0 && !el.closest('[hidden]');
  for (const el of document.querySelectorAll('.info__text, .pick__name, .album__name')) {
    if (shown(el) && !el.textContent.trim()) out.push(`empty ${el.className}`);
  }
  const note = document.querySelector('.note');
  if (shown(note) && !note.classList.contains('is-empty') && !note.querySelector('.note__text').textContent.trim()) out.push('an empty note');
  const board = document.querySelector('.board');
  if (shown(board)) {
    const b = board.getBoundingClientRect();
    const cell = parseFloat(getComputedStyle(board).getPropertyValue('--cell'));
    // the game opens a grid zoomed in to cells of at least the least size; smaller cells only in a whole grid the
    // player asked for
    if (board.classList.contains('is-zoomed') && cell < least - 0.5) out.push(`cells of ${cell} px in a zoomed-in grid`);
    // what is seen of the grid and its numbers stays on the board, the board on the screen
    for (const part of board.querySelectorAll('.board__clip')) {
      const p = part.getBoundingClientRect();
      if (p.left < b.left - 1 || p.right > b.right + 1 || p.top < b.top - 1 || p.bottom > b.bottom + 1) out.push(`${part.className} beyond the board`);
    }
    if (b.left < -1 || b.right > innerWidth + 1) out.push('the board beyond the screen');
    // the numbers fit their strips
    for (const clue of board.querySelectorAll('.clue--row')) if (clue.scrollWidth > clue.clientWidth + 1) out.push(`row numbers "${clue.textContent}" do not fit`);
    for (const clue of board.querySelectorAll('.clue--col')) if (clue.scrollHeight > clue.clientHeight + 1) out.push(`column numbers "${clue.textContent}" do not fit`);
    const cells = [...board.querySelectorAll('.cell')];
    if (cells.filter((c) => c.tabIndex === 0).length !== 1) out.push('the grid is not one Tab stop');
    if (cells.some((c) => !c.getAttribute('aria-label'))) out.push('a cell without a name');
    // the board does not reach under the note or the tools
    for (const sel of ['.note', '.tools']) {
      const el = document.querySelector(sel);
      if (!shown(el)) continue;
      const r = el.getBoundingClientRect();
      const overlap = Math.min(b.right, r.right) - Math.max(b.left, r.left) > 1 && Math.min(b.bottom, r.bottom) - Math.max(b.top, r.top) > 1;
      if (overlap && getComputedStyle(el).visibility !== 'hidden') out.push(`the board lies under ${sel}`);
    }
  }
  return out;
}

export async function audit({ browser, origin, axe, fail, shots }) {
  const base = `${origin}/nonograms/`;
  const check = async (page, label) => {
    await page.waitForTimeout(150);
    const problems = [
      ...(await page.evaluate(inspectScreen, { width: page.viewportSize().width, skip: '.cell' })),
      ...(await page.evaluate(inspectNonograms, LEAST_CELL)),
      ...(await axe(page)),
    ];
    for (const p of problems) fail(`nonograms ${label}: ${p}`);
  };
  const shot = async (page, name) => {
    if (shots) await page.screenshot({ path: join(shots, `nonograms-${name}.png`) });
  };
  /** A cell of the grid that is in sight: its middle on the screen. */
  const cellInSight = (page, nth = 0) =>
    page.evaluate((k) => {
      const clip = document.querySelector('.board__clip--grid').getBoundingClientRect();
      const seen = [...document.querySelectorAll('.cell')].filter((c) => {
        const r = c.getBoundingClientRect();
        const x = r.left + r.width / 2;
        const y = r.top + r.height / 2;
        return x > clip.left && x < clip.right && y > clip.top && y < clip.bottom;
      });
      const c = seen[Math.min(k, seen.length - 1)];
      const r = c.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, cell: Number(c.dataset.cell) };
    }, nth);
  /**
   * Before a page is loaded anew: the game's service worker has taken the page over. On the first visit it does so
   * while the page is open, and a load caught halfway makes the browser warn that the script it fetched ahead went
   * unused — harmless for a player, noise here.
   */
  const settled = (page) =>
    page.evaluate(() =>
      navigator.serviceWorker.ready.then(
        () => new Promise((done) => (navigator.serviceWorker.controller ? done(true) : navigator.serviceWorker.addEventListener('controllerchange', () => done(true), { once: true }))),
      ),
    );
  const openPicture = async (page, route) => {
    await page.goto(`${base}#${route}`);
    await page.waitForSelector('.cell');
    await page.waitForTimeout(150);
  };

  for (const [width, height] of SIZES) {
    for (const [locale, colorScheme] of LOOKS) {
      const label = `${width}×${height} ${locale} ${colorScheme}`;
      const ctx = await browser.newContext({ viewport: { width, height }, locale, colorScheme, isMobile: width < 768, hasTouch: width < 1024 });
      const page = await ctx.newPage();
      watch(page, `nonograms ${label}`, origin, fail);
      await page.goto(base);
      await page.waitForSelector('.pick');
      await check(page, `${label} start`);
      await page.locator('.pick').nth(1).click();
      await page.waitForSelector('.album__item');
      await check(page, `${label} album 10 × 10`);
      await page.locator('.album__item').first().click();
      await page.waitForSelector('.cell');
      await check(page, `${label} picture, how to play`);
      // a cell filled with the mouse, one crossed by the key
      const a = await cellInSight(page, 0);
      await page.mouse.click(a.x, a.y);
      const b = await cellInSight(page, 1);
      await page.mouse.move(b.x, b.y);
      await page.locator(`.cell[data-cell="${b.cell}"]`).focus();
      await page.keyboard.press('x');
      if (!(await page.locator(`.cell[data-cell="${a.cell}"].is-fill`).count())) fail(`nonograms ${label}: a click did not fill a cell`);
      if (!(await page.locator(`.cell[data-cell="${b.cell}"].is-cross`).count())) fail(`nonograms ${label}: X did not cross a cell`);
      await check(page, `${label} a cell filled, one crossed`);
      await page.keyboard.press('h');
      await check(page, `${label} hint`);
      if (await page.locator('.tools .tool:last-child:not([hidden])').count()) {
        await page.keyboard.press('f');
        await check(page, `${label} whole picture`);
        await page.keyboard.press('f');
      }
      // the widest settings: mistakes at once, the time, the name from the start, the large mode, the left hand
      await page.locator('.top .icon-btn').nth(1).click();
      await check(page, `${label} menu`);
      const toggles = page.locator('dialog[open] input[type=checkbox]');
      for (let n = 0; n < (await toggles.count()); n++) await toggles.nth(n).check();
      await page.locator('dialog[open] .choices').nth(2).locator('.choices__btn').nth(1).click();
      await page.locator('dialog[open] .dialog__actions .btn--primary').click();
      await check(page, `${label} every setting on`);
      await shot(page, `${width}x${height}-${locale}-${colorScheme}`);
      await openPicture(page, 'p-owl-15');
      await check(page, `${label} 15 × 15`);
      // back to the start (else the game opens where the player stopped)
      await page.evaluate((s) => localStorage.removeItem(`${s}last`), STORE);
      await settled(page);
      await page.goto(base);
      await page.waitForSelector('.pick');
      await page.locator('.pick').last().click();
      await page.waitForSelector('.cell');
      await check(page, `${label} picture of the day`);
      await ctx.close();
    }
  }

  // phones on their side (decision of 25.11): the grid on the left as tall as the screen, the rest on the right (on
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
    watch(page, `nonograms ${label}`, origin, fail);
    await page.goto(base);
    if (left) {
      await page.evaluate((s) => localStorage.setItem(`${s}settings`, JSON.stringify({ leftHand: true })), STORE);
      await settled(page);
      await page.reload();
    }
    const side = async (what) => {
      await check(page, `${label} ${what}`);
      const m = await page.evaluate(() => {
        const board = document.querySelector('.board').getBoundingClientRect();
        const tools = document.querySelector('.tools').getBoundingClientRect();
        return { scroll: document.scrollingElement.scrollHeight - innerHeight, right: board.right <= tools.left + 1, left: tools.right <= board.left + 1 };
      });
      if (m.scroll > 1) fail(`nonograms ${label} ${what}: the page scrolls ${m.scroll} px in play`);
      if (!(left ? m.left : m.right)) fail(`nonograms ${label} ${what}: the grid is not ${left ? 'right of' : 'left of'} the tools`);
    };
    await openPicture(page, 'p-key-10');
    await side('picture, how to play');
    await page.keyboard.press('h');
    await side('hint');
    await openPicture(page, 'p-owl-15');
    await side('15 × 15');
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
    const big = () => page.addStyleTag({ content: `html { font-size: ${size}% !important; }` });
    await page.goto(base);
    await page.waitForSelector('.pick');
    await big();
    await check(page, `${width}×${height} text ${size}% start`);
    await openPicture(page, 'p-key-10');
    await big();
    await page.waitForTimeout(150);
    await check(page, `${width}×${height} text ${size}% picture`);
    await page.keyboard.press('h');
    await check(page, `${width}×${height} text ${size}% hint`);
    await ctx.close();
  }

  // the keyboard, and one picture to the end by the hints
  {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, locale: 'en-GB' });
    const page = await ctx.newPage();
    watch(page, 'nonograms keyboard', origin, fail);
    await page.goto(base);
    await page.waitForSelector('.pick');
    await checkFocusVisible(page, 6, fail, 'nonograms keyboard start');
    await openPicture(page, 'p-heart-10');
    await checkFocusVisible(page, 8, fail, 'nonograms keyboard picture');
    await page.keyboard.press('ArrowRight');
    if (!(await page.evaluate(() => !!document.activeElement?.closest('.grid')))) fail('nonograms keyboard: an arrow did not bring the focus onto the grid');
    for (let guard = 0; guard < 400 && !(await page.$('dialog[open]')); guard++) await page.keyboard.press('h');
    await page.waitForSelector('dialog[open]', { timeout: 30000 }).catch(() => fail('nonograms keyboard: no "solved" window at the end'));
    await check(page, 'solved');
    const stats = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), `${STORE}stats`);
    if (stats?.['10']?.solved !== 1) fail(`nonograms keyboard: statistics did not count the picture (${JSON.stringify(stats)})`);
    await shot(page, 'solved');
    await page.keyboard.press('Escape');
    await check(page, 'solved, the window closed');
    await ctx.close();
  }
  return `${SIZES.length} sizes × ${LOOKS.length} looks, phones on their side, large text, keyboard, a picture to the end`;
}
