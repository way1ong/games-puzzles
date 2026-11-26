// Browser audit of Mines: every size and look — the start screen, an easy field (how to play), a cell opened and one
// flagged, a hint and what it does, a mine ("start over"), the menu with the widest settings (flowers, the player's
// first place, undoing the move onto a mine, wrong flags at once, the time, the large mode, the left hand), the hard
// field before and after its first place, a field of the day; phones on their side; large system text; the keyboard;
// a field to the end by the hints.
import { join } from 'node:path';
import { LOOKS, SIZES, checkFocusVisible, inspectScreen, watch } from './common.mjs';

/**
 * The cells: at least 24 px (the WCAG 2.2 AA minimum) wherever a tap opens; a field smaller than that (whole, on a
 * phone) is only looked at — a tap zooms in (docs/mines/SPEC.md, "Керування"). They are measured here, not by the
 * common check: a zoomed field lies partly beyond the screen by design.
 */
const LEAST_CELL = 24;
const STORE = 'way1ong-mines:v1:';

/** Runs in the page: what must hold on the Mines screens besides the common checks. */
function inspectMines(least) {
  const out = [];
  const shown = (el) => el && getComputedStyle(el).display !== 'none' && el.getClientRects().length > 0 && !el.closest('[hidden]');
  for (const el of document.querySelectorAll('.info__text, .info__left, .pick__name')) {
    if (shown(el) && !el.textContent.trim()) out.push(`empty ${el.className}`);
  }
  const note = document.querySelector('.note');
  if (shown(note) && !note.classList.contains('is-empty') && !note.querySelector('.note__text').textContent.trim()) out.push('an empty note');
  const board = document.querySelector('.board');
  if (shown(board)) {
    const b = board.getBoundingClientRect();
    const cell = parseFloat(getComputedStyle(board).getPropertyValue('--cell'));
    const tiny = board.classList.contains('is-tiny');
    if (!tiny && cell < least - 0.5) out.push(`cells of ${cell} px in a field that opens`);
    if (tiny !== cell < least) out.push(`a field of ${cell} px cells is ${tiny ? '' : 'not '}marked as one that zooms in on a tap`);
    const clip = board.querySelector('.board__clip').getBoundingClientRect();
    if (clip.left < b.left - 1 || clip.right > b.right + 1 || clip.top < b.top - 1 || clip.bottom > b.bottom + 1) out.push('the field beyond the board');
    if (b.left < -1 || b.right > innerWidth + 1) out.push('the board beyond the screen');
    const cells = [...board.querySelectorAll('.cell')];
    if (cells.filter((c) => c.tabIndex === 0).length !== 1) out.push('the field is not one Tab stop');
    if (cells.some((c) => !c.getAttribute('aria-label'))) out.push('a cell without a name');
    // a number fits its cell
    for (const c of cells) {
      if (!c.classList.contains('is-open') || !c.textContent) continue;
      if (c.scrollHeight > c.clientHeight + 1 || c.scrollWidth > c.clientWidth + 1) {
        out.push('a number does not fit its cell');
        break;
      }
    }
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
  const base = `${origin}/mines/`;
  const check = async (page, label) => {
    await page.waitForTimeout(150);
    const problems = [
      ...(await page.evaluate(inspectScreen, { width: page.viewportSize().width, skip: '.cell' })),
      ...(await page.evaluate(inspectMines, LEAST_CELL)),
      ...(await axe(page)),
    ];
    for (const p of problems) fail(`mines ${label}: ${p}`);
  };
  const shot = async (page, name) => {
    if (shots) await page.screenshot({ path: join(shots, `mines-${name}.png`) });
  };
  const saved = (page, key) => page.evaluate((k) => JSON.parse(localStorage.getItem(k))?.play, STORE + key);
  /** A cell in sight that is closed (or, with `mine`, a closed mine; else a closed safe one): its middle. */
  const cellInSight = (page, mines, mine) =>
    page.evaluate(
      ([list, wantMine]) => {
        const clip = document.querySelector('.board__clip').getBoundingClientRect();
        const minesSet = new Set(list);
        const c = [...document.querySelectorAll('.cell.is-closed:not(.is-flag)')].find((el) => {
          const r = el.getBoundingClientRect();
          const x = r.left + r.width / 2;
          const y = r.top + r.height / 2;
          return x > clip.left && x < clip.right && y > clip.top && y < clip.bottom && minesSet.has(Number(el.dataset.cell)) === wantMine;
        });
        if (!c) return null;
        const r = c.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2, cell: Number(c.dataset.cell) };
      },
      [mines, mine],
    );
  /**
   * Before a page is loaded anew: the game's service worker has taken the page over (a load caught halfway makes the
   * browser warn that the script it fetched ahead went unused — harmless for a player, noise here).
   */
  const settled = (page) =>
    page.evaluate(() =>
      navigator.serviceWorker.ready.then(
        () => new Promise((done) => (navigator.serviceWorker.controller ? done(true) : navigator.serviceWorker.addEventListener('controllerchange', () => done(true), { once: true }))),
      ),
    );
  const openField = async (page, route) => {
    await page.goto(`${base}#${route}`);
    await page.waitForSelector('.cell');
    await page.waitForTimeout(250);
  };

  for (const [width, height] of SIZES) {
    for (const [locale, colorScheme] of LOOKS) {
      const label = `${width}×${height} ${locale} ${colorScheme}`;
      const ctx = await browser.newContext({ viewport: { width, height }, locale, colorScheme, isMobile: width < 768, hasTouch: width < 1024 });
      const page = await ctx.newPage();
      watch(page, `mines ${label}`, origin, fail);
      await page.goto(base);
      await page.waitForSelector('.pick');
      await check(page, `${label} start`);
      await page.locator('.pick').first().click();
      await page.waitForSelector('.cell.is-open');
      await check(page, `${label} easy field, how to play`);
      // a cell opened with the mouse, one flagged by the key
      const field = (await saved(page, 'play:easy')).field;
      const safe = await cellInSight(page, field.mines, false);
      if (safe) await page.mouse.click(safe.x, safe.y);
      const mine = field.mines[0];
      await page.locator(`.cell[data-cell="${mine}"]`).focus();
      await page.keyboard.press('f');
      if (!(await page.locator(`.cell[data-cell="${mine}"].is-flag`).count())) fail(`mines ${label}: F did not flag a cell`);
      await check(page, `${label} a cell opened, one flagged`);
      await page.keyboard.press('h');
      await check(page, `${label} hint`);
      await page.keyboard.press('h');
      await check(page, `${label} hint done`);
      // a mine (by the keys: the focus brings it in sight on a zoomed field): start over
      const now = await saved(page, 'play:easy');
      const another = field.mines.find((m) => now.cells[m] === '.');
      await page.locator(`.cell[data-cell="${another}"]`).focus();
      await page.keyboard.press('Enter');
      await check(page, `${label} a mine`);
      await shot(page, `${width}x${height}-${locale}-${colorScheme}-mine`);
      await page.locator('.tools .tool--main:visible').click();
      // the widest settings: flowers, the player's first place, undoing the move, every switch on
      await page.locator('.top .icon-btn').nth(1).click();
      await check(page, `${label} menu`);
      for (const [group, option] of [
        [1, 1],
        [2, 1],
        [3, 1],
      ]) {
        await page.locator('dialog[open] .choices').nth(group).locator('.choices__btn').nth(option).click();
      }
      const toggles = page.locator('dialog[open] input[type=checkbox]');
      for (let n = 0; n < (await toggles.count()); n++) await toggles.nth(n).check();
      await page.locator('dialog[open] .dialog__actions .btn--primary').click();
      await check(page, `${label} every setting on`);
      await shot(page, `${width}x${height}-${locale}-${colorScheme}`);
      await openField(page, 'hard');
      await check(page, `${label} hard, the first place to choose`);
      const first = await page.evaluate(() => {
        const r = document.querySelector('.board__clip').getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      });
      await page.mouse.click(first.x, first.y);
      await page.waitForSelector('.cell.is-open', { timeout: 30000 });
      await check(page, `${label} hard, the first place chosen`);
      // back to the start (else the game opens where the player stopped)
      await page.evaluate((s) => localStorage.removeItem(`${s}last`), STORE);
      await settled(page);
      await page.goto(base);
      await page.waitForSelector('.pick');
      await page.locator('.pick').nth(4).click();
      await page.waitForSelector('.cell.is-open', { timeout: 30000 });
      await check(page, `${label} medium field of the day`);
      await ctx.close();
    }
  }

  // phones on their side (decision of 25.11): the field on the left as tall as the screen, the rest on the right (on
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
    watch(page, `mines ${label}`, origin, fail);
    await page.goto(base);
    if (left) {
      await page.evaluate((s) => localStorage.setItem(`${s}settings`, JSON.stringify({ leftHand: true, big: true })), STORE);
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
      if (m.scroll > 1) fail(`mines ${label} ${what}: the page scrolls ${m.scroll} px in play`);
      if (!(left ? m.left : m.right)) fail(`mines ${label} ${what}: the field is not ${left ? 'right of' : 'left of'} the tools`);
    };
    await openField(page, 'easy');
    await side('easy, how to play');
    await page.keyboard.press('h');
    await side('hint');
    await openField(page, 'hard');
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
    const big = () => page.addStyleTag({ content: `html { font-size: ${size}% !important; }` });
    await page.goto(base);
    await page.waitForSelector('.pick');
    await big();
    await check(page, `${width}×${height} text ${size}% start`);
    await openField(page, 'easy');
    await big();
    await page.waitForTimeout(150);
    await check(page, `${width}×${height} text ${size}% field`);
    await page.keyboard.press('h');
    await check(page, `${width}×${height} text ${size}% hint`);
    await ctx.close();
  }

  // the keyboard, and one field to the end by the hints
  {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, locale: 'en-GB' });
    const page = await ctx.newPage();
    watch(page, 'mines keyboard', origin, fail);
    await page.goto(base);
    await page.waitForSelector('.pick');
    await checkFocusVisible(page, 6, fail, 'mines keyboard start');
    await openField(page, 'medium');
    await checkFocusVisible(page, 8, fail, 'mines keyboard field');
    await page.keyboard.press('ArrowRight');
    if (!(await page.evaluate(() => !!document.activeElement?.closest('.grid')))) fail('mines keyboard: an arrow did not bring the focus onto the field');
    for (let guard = 0; guard < 600 && !(await page.$('dialog[open]')); guard++) await page.keyboard.press('h');
    await page.waitForSelector('dialog[open]', { timeout: 30000 }).catch(() => fail('mines keyboard: no "cleared" window at the end'));
    await check(page, 'cleared');
    const stats = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), `${STORE}stats`);
    if (stats?.medium?.won !== 1) fail(`mines keyboard: statistics did not count the field (${JSON.stringify(stats)})`);
    await shot(page, 'cleared');
    await page.keyboard.press('Escape');
    await check(page, 'cleared, the window closed');
    await ctx.close();
  }
  return `${SIZES.length} sizes × ${LOOKS.length} looks, phones on their side, large text, keyboard, a field to the end`;
}
