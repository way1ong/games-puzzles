// Browser audit of Pour: every size and look — the start screen, a level (how to play), a bottle lifted, a hint and
// what it does, the menu with the widest settings (patterns off, help limited, the time, the large mode, the left
// hand), free play hard, the player's own size (its choice, a game, the biggest shelf), the level of the day, a level
// to the end by the hints; phones on their side; large system
// text; the keyboard: the bottles by the arrows, a pour by Enter, a level to the end by H.
import { join } from 'node:path';
import { LOOKS, SIZES, checkFocusVisible, inspectScreen, watch } from './common.mjs';

const STORE = 'way1ong-pour:v1:';

/** Runs in the page: what must hold on the Pour screens besides the common checks. */
function inspectPour() {
  const out = [];
  const shown = (el) => el && getComputedStyle(el).display !== 'none' && el.getClientRects().length > 0 && !el.closest('[hidden]');
  for (const el of document.querySelectorAll('.info__text, .pick__name')) {
    if (shown(el) && !el.textContent.trim()) out.push(`empty ${el.className}`);
  }
  const note = document.querySelector('.note');
  if (shown(note) && !note.classList.contains('is-empty') && !note.querySelector('.note__text').textContent.trim()) out.push('an empty note');
  const shelf = document.querySelector('.shelf');
  if (!shown(shelf)) return out;
  const s = shelf.getBoundingClientRect();
  const bottles = [...shelf.querySelectorAll('.bottle')];
  if (bottles.filter((b) => b.tabIndex === 0).length !== 1) out.push('the shelf is not one Tab stop');
  for (const [i, b] of bottles.entries()) {
    const r = b.getBoundingClientRect();
    // the whole column is what a finger touches (rule 6)
    if (r.width < 43.5 || r.height < 43.5) out.push(`bottle ${i + 1} is ${Math.round(r.width)}×${Math.round(r.height)} px to touch`);
    if (!b.getAttribute('aria-label')) out.push(`bottle ${i + 1} without a name`);
    if (r.left < -1 || r.right > innerWidth + 1) out.push(`bottle ${i + 1} beyond the screen`);
    const g = b.querySelector('.bottle__glass').getBoundingClientRect();
    if (g.top < s.top - 1 || g.bottom > s.bottom + 1) out.push(`bottle ${i + 1}'s glass beyond the shelf`);
  }
  // the shelf does not reach under the note or the buttons
  for (const sel of ['.note', '.tools:not([hidden])']) {
    const el = document.querySelector(sel);
    if (!shown(el)) continue;
    const r = el.getBoundingClientRect();
    const overlap = Math.min(s.right, r.right) - Math.max(s.left, r.left) > 1 && Math.min(s.bottom, r.bottom) - Math.max(s.top, r.top) > 1;
    if (overlap && getComputedStyle(el).visibility !== 'hidden') out.push(`the shelf lies under ${sel}`);
  }
  return out;
}

export async function audit({ browser, origin, axe, fail, shots }) {
  const base = `${origin}/pour/`;
  const check = async (page, label) => {
    await page.waitForTimeout(150);
    const problems = [...(await page.evaluate(inspectScreen, { width: page.viewportSize().width, skip: '.bottle' })), ...(await page.evaluate(inspectPour)), ...(await axe(page))];
    for (const p of problems) fail(`pour ${label}: ${p}`);
  };
  const shot = async (page, name) => {
    if (shots) await page.screenshot({ path: join(shots, `pour-${name}.png`) });
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
    await page.waitForSelector('.bottle');
    await page.waitForTimeout(250);
  };
  /** Presses H until the end window (a hint, then "Do it"). */
  const byHints = async (page, label) => {
    for (let guard = 0; guard < 400 && !(await page.$('dialog:has(#end-title)[open]')); guard++) await page.keyboard.press('h');
    await page.waitForSelector('dialog:has(#end-title)[open]', { timeout: 30000 }).catch(() => fail(`pour ${label}: no end window`));
  };

  for (const [width, height] of SIZES) {
    for (const [locale, colorScheme] of LOOKS) {
      const label = `${width}×${height} ${locale} ${colorScheme}`;
      const ctx = await browser.newContext({ viewport: { width, height }, locale, colorScheme, isMobile: width < 768, hasTouch: width < 1024 });
      const page = await ctx.newPage();
      watch(page, `pour ${label}`, origin, fail);
      await page.goto(base);
      await page.waitForSelector('.pick');
      await check(page, `${label} start`);
      await page.locator('.pick').first().click();
      await page.waitForSelector('.bottle');
      await check(page, `${label} level 1, how to play`);
      await page.locator('.bottle').first().click();
      if (!(await page.locator('.bottle.is-up').count())) fail(`pour ${label}: a tap did not lift a bottle`);
      await check(page, `${label} a bottle lifted`);
      await page.keyboard.press('h');
      await check(page, `${label} hint`);
      await page.keyboard.press('h');
      await check(page, `${label} hint done`);
      await byHints(page, label);
      await check(page, `${label} level 1 solved`);
      await shot(page, `${width}x${height}-${locale}-${colorScheme}-end`);
      await page.locator('dialog[open] .btn--primary').click();
      await page.waitForTimeout(200);
      // the widest settings: patterns off, help limited, every switch on
      await page.locator('.top .icon-btn').nth(1).click();
      await check(page, `${label} menu`);
      await page.locator('dialog[open] .choices').nth(1).locator('.choices__btn').nth(1).click();
      const toggles = page.locator('dialog[open] input[type=checkbox]');
      for (let n = 0; n < (await toggles.count()); n++) {
        const t = toggles.nth(n);
        // patterns (on by default) off; the rest on
        if (n === 0) await t.uncheck();
        else await t.check();
      }
      await page.locator('dialog[open] .dialog__actions .btn--primary').click();
      await check(page, `${label} level 2, settings changed`);
      await shot(page, `${width}x${height}-${locale}-${colorScheme}`);
      await openGame(page, 'hard');
      await check(page, `${label} free play hard`);
      // free play (decision of 28.11): the fewest pours beside the player's, once counted; "New game" mid-game — a
      // begun game asks once more (the button stands out), the second tap deals anew
      await page
        .waitForFunction(() => document.querySelector('.info__moves')?.textContent.includes('·'), null, { timeout: 30000 })
        .catch(() => fail(`pour ${label}: no fewest pours beside the player's`));
      await page.keyboard.press('h');
      await page.keyboard.press('h');
      const fresh = page.locator('.tools:not(.tools--stuck) .tool').last();
      await fresh.click();
      if (!(await fresh.evaluate((b) => b.classList.contains('is-ready')))) fail(`pour ${label}: "New game" did not ask once more`);
      await check(page, `${label} free play, new game asked`);
      await fresh.click();
      await page.waitForTimeout(300);
      if (!/^0\D/.test((await page.textContent('.info__moves')).trim())) fail(`pour ${label}: "New game" did not deal anew`);
      // the player's own size: its choice (− and +; with many colours the empty bottles follow), a game of it, then
      // the biggest shelf of it — the most colours and empty bottles
      await page.goto(`${base}#custom-size`);
      await page.waitForSelector('.stepper');
      await check(page, `${label} own size, the choice`);
      await shot(page, `${width}x${height}-${locale}-${colorScheme}-own-size`);
      const steppers = page.locator('.stepper__btn');
      // colours +: past the most one empty bottle may have
      await steppers.nth(1).click();
      if (!(await steppers.nth(2).isDisabled())) fail(`pour ${label}: one empty bottle allowed with ${await page.locator('.stepper__value').first().textContent()} colours`);
      await steppers.nth(0).click();
      await steppers.nth(0).click();
      await steppers.nth(2).click();
      const chosen = (await page.locator('.stepper__value').allTextContents()).map(Number);
      await page.locator('.custom__play').click();
      await page.waitForSelector('.bottle');
      const bottles = await page.locator('.bottle').count();
      if (chosen[1] !== 1 || bottles !== chosen[0] + chosen[1]) fail(`pour ${label}: ${bottles} bottles for ${chosen.join(' colours, ')} empty`);
      await check(page, `${label} own size, a game`);
      await page.evaluate((s) => localStorage.setItem(`${s}custom`, JSON.stringify({ colours: 99, empty: 99 })), STORE);
      await page.goto(`${base}#custom-size`);
      await page.waitForSelector('.stepper');
      await page.locator('.custom__play').click();
      await page.waitForSelector('.bottle');
      await check(page, `${label} own size, the biggest`);
      await shot(page, `${width}x${height}-${locale}-${colorScheme}-own-size-biggest`);
      await page.evaluate((s) => localStorage.removeItem(`${s}last`), STORE);
      await settled(page);
      await page.goto(base);
      await page.waitForSelector('.pick');
      await check(page, `${label} start after a level`);
      await page.locator('.pick').last().click();
      await page.waitForSelector('.bottle');
      await check(page, `${label} the level of the day`);
      await ctx.close();
    }
  }

  // phones on their side (decision of 25.11): the bottles on the left as tall as the screen, the rest on the right
  // (on the left for the left hand) — nothing to scroll; 740 × 290 and 640 × 290 are phones in a browser whose own
  // bar takes part of the height
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
    watch(page, `pour ${label}`, origin, fail);
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
        const shelf = document.querySelector('.shelf').getBoundingClientRect();
        const tools = document.querySelector('.tools:not([hidden])').getBoundingClientRect();
        return { scroll: document.scrollingElement.scrollHeight - innerHeight, right: shelf.right <= tools.left + 1, left: tools.right <= shelf.left + 1 };
      });
      if (m.scroll > 1) fail(`pour ${label} ${what}: the page scrolls ${m.scroll} px in play`);
      if (!(left ? m.left : m.right)) fail(`pour ${label} ${what}: the bottles are not ${left ? 'right of' : 'left of'} the buttons`);
    };
    await openGame(page, 'level');
    await side('level 1, how to play');
    await page.keyboard.press('h');
    await side('hint');
    await openGame(page, 'hard');
    await side('hard');
    await shot(page, `side-${width}x${height}`);
    // the player's own size: its choice, then the biggest shelf of it
    await page.evaluate((s) => localStorage.setItem(`${s}custom`, JSON.stringify({ colours: 99, empty: 99 })), STORE);
    await page.goto(`${base}#custom-size`);
    await page.waitForSelector('.stepper');
    await check(page, `${label} own size, the choice`);
    await page.locator('.custom__play').click();
    await page.waitForSelector('.bottle');
    await page.waitForTimeout(250);
    await side('own size, the biggest');
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
    watch(page, `pour text ${size}%`, origin, fail);
    const big = () => page.addStyleTag({ content: `html { font-size: ${size}% !important; }` });
    await page.goto(base);
    await page.waitForSelector('.pick');
    await big();
    await check(page, `${width}×${height} text ${size}% start`);
    await openGame(page, 'medium');
    await big();
    await page.waitForTimeout(150);
    await check(page, `${width}×${height} text ${size}% game`);
    await page.keyboard.press('h');
    await check(page, `${width}×${height} text ${size}% hint`);
    await page.goto(`${base}#custom-size`);
    await page.waitForSelector('.stepper');
    await big();
    await check(page, `${width}×${height} text ${size}% own size, the choice`);
    await ctx.close();
  }

  // the keyboard: the bottles by the arrows, a pour by Enter, then a level to the end by H
  {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, locale: 'en-GB' });
    const page = await ctx.newPage();
    watch(page, 'pour keyboard', origin, fail);
    await page.goto(base);
    await page.waitForSelector('.pick');
    await checkFocusVisible(page, 6, fail, 'pour keyboard start');
    // the player's own size by the keys: − and + reached by Tab, Enter and Space count one each
    await page.goto(`${base}#custom-size`);
    await page.waitForSelector('.stepper');
    await checkFocusVisible(page, 6, fail, 'pour keyboard own size');
    const colours = async () => Number(await page.locator('.stepper__value').first().textContent());
    const was = await colours();
    await page.locator('.stepper__btn').nth(0).focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Space');
    if ((await colours()) !== was - 2) fail(`pour keyboard: Enter and Space on "−" did not count two (${was} → ${await colours()})`);
    await openGame(page, 'medium');
    await checkFocusVisible(page, 8, fail, 'pour keyboard game');
    await page.locator('.bottle[tabindex="0"]').focus();
    await page.keyboard.press('ArrowRight');
    if (!(await page.evaluate(() => document.activeElement?.matches('.bottle') && document.activeElement.dataset.bottle === '1'))) fail('pour keyboard: an arrow did not move to the next bottle');
    // a pour by the keys: the first hint's bottles, lifted and poured with Enter
    await page.keyboard.press('h');
    const move = await page.evaluate(() => ({ from: document.querySelector('.bottle.is-from')?.dataset.bottle, to: document.querySelector('.bottle.is-to')?.dataset.bottle }));
    const before = await page.evaluate((k) => JSON.parse(localStorage.getItem(k))?.play.moves ?? 0, `${STORE}play:medium`);
    await page.locator(`.bottle[data-bottle="${move.from}"]`).focus();
    await page.keyboard.press('Enter');
    await page.locator(`.bottle[data-bottle="${move.to}"]`).focus();
    await page.keyboard.press('Enter');
    const after = await page.evaluate((k) => JSON.parse(localStorage.getItem(k))?.play.moves ?? 0, `${STORE}play:medium`);
    if (after !== before + 1) fail(`pour keyboard: Enter, Enter did not pour (${before} → ${after})`);
    await byHints(page, 'keyboard');
    await check(page, 'solved by the keys');
    const stats = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), `${STORE}stats`);
    if (stats?.free?.medium?.won !== 1) fail(`pour keyboard: statistics did not count the game (${JSON.stringify(stats)})`);
    await shot(page, 'solved');
    await page.keyboard.press('Escape');
    await check(page, 'solved, the window closed');
    await ctx.close();
  }
  return `${SIZES.length} sizes × ${LOOKS.length} looks, phones on their side, large text, keyboard, own size, a level to the end`;
}
