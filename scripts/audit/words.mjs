// Browser audit of Words: every size and look — the start screen, a level, a word made by sliding and what it
// means (a tap on it), the hint window, choosing a cell for a hint, the menu with the large letters, the daily puzzle; large system text;
// the keyboard; one level played to the end, its words' meanings opened by the keyboard; a level kept when the language is switched there and back; phones on
// their side — nothing to scroll in play, the wheel standing still. The Word Field (second mode): every size and
// look and phones on their side — a field, a word placed, a hint, the menu, the daily field; large text; the
// keyboard.
import { join } from 'node:path';
import { LOOKS, SIZES, checkFocusVisible, inspectScreen, watch } from './common.mjs';

/**
 * Crossword cells are buttons only while the player chooses a cell for a hint; a big crossword on a phone
 * cannot give each 44 px: they are checked against the WCAG 2.2 AA minimum (docs/words/SPEC.md).
 */
const DENSE = { selector: '.cw-cell', min: 24 };
const STORE = 'way1ong-words:v1:';

/** Runs in the page: what must hold on the Words screens besides the common checks. */
function inspectWords() {
  const out = [];
  const shown = (el) => el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden' && !el.closest('[hidden]');
  for (const el of document.querySelectorAll('.tip, .info__left, .home__note')) {
    if (shown(el) && !el.textContent.trim() && el.matches('.tip, .home__note')) out.push(`empty ${el.className}`);
  }
  const wheel = document.querySelector('.wheel');
  if (shown(wheel)) {
    const w = wheel.getBoundingClientRect();
    if (Math.abs(w.width - w.height) > 1) out.push('the wheel is not round');
    const letters = [...wheel.querySelectorAll('.wheel__letter')].map((b) => b.getBoundingClientRect());
    // The letters are round (and so is where a finger hits them): two overlap when their circles do.
    for (let i = 0; i < letters.length; i++) {
      for (let j = i + 1; j < letters.length; j++) {
        const a = letters[i];
        const b = letters[j];
        const apart = Math.hypot(a.left + a.width / 2 - (b.left + b.width / 2), a.top + a.height / 2 - (b.top + b.height / 2));
        if (apart < (a.width + b.width) / 2 - 1) out.push('two letters of the wheel overlap');
      }
      const a = letters[i];
      if (a.left < w.left - 1 || a.right > w.right + 1 || a.top < w.top - 1 || a.bottom > w.bottom + 1) out.push('a letter sticks out of the wheel');
    }
  }
  const grid = document.querySelector('.crossword');
  if (shown(grid)) {
    const g = grid.getBoundingClientRect();
    const stage = grid.closest('.stage').getBoundingClientRect();
    if (g.right > stage.right + 1 || g.bottom > stage.bottom + 1) out.push('the crossword sticks out of its place');
  }
  return out;
}

async function openLevel(page) {
  await page.locator('.home__main[data-mode=wheel]').click();
  await page.waitForSelector('.wheel__letter', { timeout: 30000 });
}

/** Runs in the page: Word Field cells keep 44 px and the field stays in its place. */
function inspectField() {
  const out = [];
  const field = document.querySelector('.field');
  if (!field || !field.getClientRects().length) return out;
  const stage = field.closest('.stage').getBoundingClientRect();
  const f = field.getBoundingClientRect();
  if (f.right > stage.right + 1 || f.bottom > stage.bottom + 1 || f.left < stage.left - 1 || f.top < stage.top - 1) out.push('the field sticks out of its place');
  const cell = document.querySelector('.fw-cell').getBoundingClientRect();
  if (cell.width < 44 || cell.height < 44) out.push(`small field cells ${Math.round(cell.width)}×${Math.round(cell.height)}`);
  return out;
}

async function openField(page, daily = false) {
  await page.locator(`.home__${daily ? 'daily' : 'main'}[data-mode=field]`).click();
  await page.waitForSelector('.fw-cell', { timeout: 30000 });
  await page.waitForFunction((k) => Object.keys(localStorage).some((x) => x.startsWith(k)), `${STORE}field`);
}

/** Types a word of the field's plan (the keys go to the field) and checks it. */
async function typeFieldWord(page, lang, daily = false) {
  const plan = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)).play.plan, `${STORE}${daily ? 'field-daily' : 'field'}:${lang}:tiles`);
  await page.evaluate((text) => {
    for (const ch of text) document.dispatchEvent(new KeyboardEvent('keydown', { key: ch, bubbles: true, cancelable: true }));
  }, plan[0].text);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(50);
}

/** The tiles of the level's words, from the saved game. */
async function levelWords(page, lang, daily = false) {
  const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), `${STORE}${daily ? 'daily' : 'play'}:${lang}:tiles`);
  return saved.play.level.words.map((p) => p.word.tiles);
}

/** Slides across the letters of a word on the wheel. */
async function slide(page, tiles) {
  const centres = await page.$$eval('.wheel__letter', (bs) =>
    bs.map((b) => {
      const r = b.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2, t: b.textContent.toLowerCase() };
    }),
  );
  const used = new Set();
  const points = tiles.map((t) => {
    const i = centres.findIndex((c, k) => c.t === t && !used.has(k));
    used.add(i);
    return centres[i];
  });
  await page.mouse.move(points[0].x, points[0].y);
  await page.mouse.down();
  for (const p of points.slice(1)) await page.mouse.move(p.x, p.y, { steps: 5 });
  await page.mouse.up();
}

export async function audit({ browser, origin, axe, fail, shots }) {
  const base = `${origin}/words/`;
  const check = async (page, label) => {
    const problems = [
      ...(await page.evaluate(inspectScreen, { width: page.viewportSize().width, dense: DENSE })),
      ...(await page.evaluate(inspectWords)),
      ...(await page.evaluate(inspectField)),
      ...(await axe(page)),
    ];
    for (const p of problems) fail(`words ${label}: ${p}`);
  };

  for (const [width, height] of SIZES) {
    for (const [locale, colorScheme] of LOOKS) {
      const label = `${width}×${height} ${locale} ${colorScheme}`;
      const lang = locale.slice(0, 2);
      const ctx = await browser.newContext({ viewport: { width, height }, locale, colorScheme, isMobile: width < 768, hasTouch: width < 1024 });
      const page = await ctx.newPage();
      watch(page, `words ${label}`, origin, fail);
      await page.goto(base);
      await page.waitForSelector('.home__main');
      await check(page, `${label} start`);
      await openLevel(page);
      await check(page, `${label} level`);
      const words = await levelWords(page, lang);
      await slide(page, words[0]);
      await page.waitForTimeout(50);
      await check(page, `${label} word found`);
      // what the found word means (docs/words/SPEC.md, "Значення слів"): a tap on one of its cells
      await page.locator('.cw-cell.is-found').first().click();
      await page.waitForSelector('dialog[open] .meanings', { timeout: 5000 }).catch(() => fail(`words ${label}: no meaning window after a tap on a found word`));
      await check(page, `${label} meaning`);
      await page.locator('dialog[open] .dialog__actions .btn--primary').click();
      await page.locator('.info__tools .tool').last().click();
      await check(page, `${label} hint window`);
      await page.locator('.hint-option').nth(1).click();
      await check(page, `${label} choosing a cell`);
      await page.locator('.cw-cell.is-choice').first().click();
      await check(page, `${label} cell opened`);
      await page.locator('.top .icon-btn').nth(1).click();
      await check(page, `${label} menu`);
      await page.locator('dialog[open] label', { hasText: /./ }).filter({ has: page.locator('input') }).nth(3).locator('input').check(); // show the time
      await page.locator('dialog[open] .dialog__actions .btn--primary').click();
      await check(page, `${label} after a setting`);
      await page.evaluate(() => document.documentElement.classList.add('big'));
      await check(page, `${label} large letters`);
      if (shots) await page.screenshot({ path: join(shots, `words-${width}x${height}-${locale}-${colorScheme}.png`) });
      await page.locator('.top .icon-btn').first().click();
      await page.waitForSelector('.home__daily');
      await page.locator('.home__daily[data-mode=wheel]').click();
      await page.waitForSelector('.wheel__letter', { timeout: 30000 });
      await check(page, `${label} daily`);
      // the Word Field
      await page.evaluate(() => document.documentElement.classList.remove('big'));
      await page.locator('.top .icon-btn').first().click();
      await page.waitForSelector('.home__main');
      await openField(page);
      await check(page, `${label} field`);
      await typeFieldWord(page, lang);
      await check(page, `${label} field, a word placed`);
      await page.locator('.field-tools .tool').first().click();
      await check(page, `${label} field hint window`);
      await page.locator('dialog[open] .hint-option').first().click();
      await check(page, `${label} field hint shown`);
      if (!(await page.locator('.fw-cell.is-hinted').count())) fail(`words ${label}: a field hint shows no cell`);
      if (shots) await page.screenshot({ path: join(shots, `words-field-${width}x${height}-${locale}-${colorScheme}.png`) });
      await page.locator('.top .icon-btn').first().click();
      await page.waitForSelector('.home__main');
      await openField(page, true);
      await check(page, `${label} daily field`);
      await ctx.close();
    }
  }

  for (const [width, height, size] of [
    [320, 640, 150],
    [390, 844, 200],
    [1366, 768, 200],
  ]) {
    const ctx = await browser.newContext({ viewport: { width, height }, locale: 'hu-HU', isMobile: width < 768, hasTouch: width < 1024 });
    const page = await ctx.newPage();
    await page.goto(base);
    await page.waitForSelector('.home__main');
    await page.addStyleTag({ content: `html { font-size: ${size}% !important; }` });
    await check(page, `${width}×${height} text ${size}% start`);
    await openLevel(page);
    await check(page, `${width}×${height} text ${size}% level`);
    await page.locator('.top .icon-btn').first().click();
    await page.waitForSelector('.home__main');
    await openField(page);
    await check(page, `${width}×${height} text ${size}% field`);
    await ctx.close();
  }

  // The Word Field on phones held sideways: a small field, the biggest (turned) and a word placed.
  for (const [width, height] of [
    [640, 360],
    [863, 360],
    [915, 412],
  ]) {
    for (const [level, colorScheme] of [
      [1, 'light'],
      [151, 'dark'],
    ]) {
      const label = `${width}×${height} side, field level ${level} ${colorScheme}`;
      const ctx = await browser.newContext({ viewport: { width, height }, locale: 'uk-UA', colorScheme, isMobile: true, hasTouch: true });
      const page = await ctx.newPage();
      watch(page, `words ${label}`, origin, fail);
      await page.goto(base);
      await page.evaluate(([key, n]) => localStorage.setItem(key, String(n)), [`${STORE}field-reached:uk:tiles`, level]);
      await page.goto(base);
      await page.waitForSelector('.home__main');
      await check(page, `${label} start`);
      await openField(page);
      await check(page, label);
      if (level > 80 && !(await page.$eval('.field', (f) => f.classList.contains('is-turned')))) fail(`words ${label}: a tall field is not turned on a wide screen`);
      await typeFieldWord(page, 'uk');
      await check(page, `${label}, a word placed`);
      if (shots) await page.screenshot({ path: join(shots, `words-field-side-${width}x${height}-${level}.png`) });
      await ctx.close();
    }
  }

  // The wheel on phones held sideways (decision of 25.11): the crossword and the wheel side by side, nothing to
  // scroll in play; the wheel stays where it is while the line above it changes; a word, a hint, a chosen cell,
  // the large letters.
  for (const [width, height, locale, colorScheme, level] of [
    [640, 360, 'uk-UA', 'light', 81],
    [740, 360, 'hu-HU', 'dark', 81],
    [863, 360, 'en-GB', 'light', 1],
    [915, 412, 'uk-UA', 'dark', 500],
  ]) {
    const label = `${width}×${height} side, wheel level ${level} ${locale} ${colorScheme}`;
    const lang = locale.slice(0, 2);
    const ctx = await browser.newContext({ viewport: { width, height }, locale, colorScheme, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    watch(page, `words ${label}`, origin, fail);
    await page.goto(base);
    await page.evaluate(([key, n]) => localStorage.setItem(key, String(n)), [`${STORE}reached:${lang}:tiles`, level]);
    await page.goto(base);
    await page.waitForSelector('.home__main');
    await check(page, `${label} start`);
    await openLevel(page);
    const inPlay = async (what) => {
      await check(page, `${label} ${what}`);
      const scroll = await page.evaluate(() => document.scrollingElement.scrollHeight - innerHeight);
      if (scroll > 1) fail(`words ${label} ${what}: the page scrolls ${scroll} px in play`);
    };
    const wheelBox = () => page.$eval('.wheel', (w) => JSON.stringify(w.getBoundingClientRect()));
    await inPlay('level');
    const before = await wheelBox();
    const words = await levelWords(page, lang);
    await slide(page, words[0]);
    await page.waitForTimeout(50);
    await inPlay('word found');
    if ((await wheelBox()) !== before) fail(`words ${label}: the wheel moved when the line above it changed`);
    await page.locator('.info__tools .tool').last().click();
    await check(page, `${label} hint window`);
    await page.locator('.hint-option').nth(1).click();
    await inPlay('choosing a cell');
    await page.locator('.cw-cell.is-choice').first().click();
    await inPlay('cell opened');
    await page.evaluate(() => document.documentElement.classList.add('big'));
    await inPlay('large letters');
    if (shots) await page.screenshot({ path: join(shots, `words-side-${width}x${height}-${lang}.png`) });
    await ctx.close();
  }

  // The keyboard, and a level to the end with the keys (English: the test browser's own keys).
  {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, locale: 'en-GB' });
    const page = await ctx.newPage();
    watch(page, 'words keyboard', origin, fail);
    await page.goto(base);
    await page.waitForSelector('.home__main');
    await checkFocusVisible(page, 6, fail, 'words keyboard start');
    await openLevel(page);
    await checkFocusVisible(page, 12, fail, 'words keyboard level');
    for (const word of await levelWords(page, 'en')) {
      await page.keyboard.type(word.join(''));
      await page.keyboard.press('Enter');
    }
    await page.waitForSelector('dialog[open]', { timeout: 5000 }).catch(() => fail('words keyboard: no "level done" window'));
    await check(page, 'level done');
    // the level's words with their meanings, folded under a line that opens them
    const fold = page.locator('dialog[open] .end-words summary');
    if (!(await fold.count())) fail('words keyboard: no "what the words mean" in the "level done" window');
    else {
      await fold.focus();
      await page.keyboard.press('Enter');
      if (!(await page.locator('dialog[open] .end-words[open] .meanings dd').count())) fail('words keyboard: the meanings did not open by the keyboard');
      await check(page, 'level done, the meanings open');
    }
    const reached = await page.evaluate((key) => localStorage.getItem(key), `${STORE}reached:en:tiles`);
    if (reached !== '2') fail(`words keyboard: the next level is not 2 (${reached})`);
    if (shots) await page.screenshot({ path: join(shots, 'words-done.png') });

    // Each language keeps its own level: a word found, the language switched there and back.
    await page.locator('dialog[open] .btn--primary').click();
    await page.waitForFunction((key) => JSON.parse(localStorage.getItem(key))?.play.level.number === 2, `${STORE}play:en:tiles`, { timeout: 30000 });
    const [first] = await levelWords(page, 'en');
    await page.keyboard.type(first.join(''));
    await page.keyboard.press('Enter');
    for (const code of ['hu', 'en']) {
      await page.locator('.top .icon-btn').nth(1).click();
      await page.locator(`dialog[open] .choices__btn[lang="${code}"]`).click();
      await page.locator('dialog[open] .dialog__actions .btn--primary').click();
      await page.waitForSelector('.wheel__letter', { timeout: 30000 });
    }
    const kept = await page.evaluate((key) => JSON.parse(localStorage.getItem(key))?.play, `${STORE}play:en:tiles`);
    if (kept?.level.lang !== 'en' || !kept.found.includes(first.join(''))) fail(`words: after switching the language and back, the English level has ${JSON.stringify(kept?.found)}`);
    if (!(await page.locator('.cw-cell.is-found').count())) fail('words: after switching the language and back, no found cells');
    await ctx.close();
  }
  return `${SIZES.length} sizes × ${LOOKS.length} looks (Wheel and Word Field), phones on their side (both modes), large text, keyboard, a level to the end, a level kept across languages`;
}
