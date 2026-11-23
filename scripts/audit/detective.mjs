// Browser audit of Detective: a whole story case on every size and look (the list of cases, the story, the
// room, a hint, every thing found, the suspects, a wrong and a right name, the end), the menu and the large
// mode, the night case, the case of the day, free search, a saved game after a reload, the keyboard, large
// system text. And the drawings themselves: every thing stays inside its size and rests on its line.
import { join } from 'node:path';
import { LOOKS, SIZES, checkFocusVisible, inspectScreen, watch } from './common.mjs';

/** Runs in the page: the things in the room — inside their boxes, resting on their lines, inside the room. */
function inspectThings() {
  const out = [];
  const scene = document.querySelector('.room__scroll .scene');
  if (!scene) return ['no room on the screen'];
  const view = scene.viewBox.baseVal;
  const sceneBox = scene.getBoundingClientRect();
  const scale = sceneBox.width / view.width;
  for (const el of scene.querySelectorAll('[data-thing]')) {
    const name = el.getAttribute('data-thing');
    const [w, h] = el.getAttribute('data-box').split(' ').map(Number);
    // the thing's own point (the middle of its bottom edge) and its drawing as the eye sees it, in scene units
    const origin = new DOMPoint(0, 0).matrixTransform(el.getScreenCTM());
    const box = el.getBoundingClientRect();
    const b = { left: (box.left - origin.x) / scale, right: (box.right - origin.x) / scale, top: (box.top - origin.y) / scale, bottom: (box.bottom - origin.y) / scale };
    const x = (origin.x - sceneBox.left) / scale;
    const y = (origin.y - sceneBox.top) / scale;
    if (x < 0 || x > view.width || y < 0 || y > view.height) out.push(`${name}: outside the room`);
    const size = `${Math.round(b.right - b.left)}×${Math.round(b.bottom - b.top)}`;
    if (b.right - b.left < w * 0.5 || b.bottom - b.top < h * 0.4) out.push(`${name}: the drawing ${size} is much smaller than its box ${w}×${h}`);
    // a turned thing lies on the floor: only its size can be told
    if (/rotate/.test(el.getAttribute('transform'))) continue;
    const slack = 2.5;
    if (b.left < -w / 2 - slack || b.right > w / 2 + slack || b.top < -h - slack) out.push(`${name}: the drawing ${size} leaves its box ${w}×${h}`);
    // the bottom of the drawing is the line the thing rests on
    if (Math.abs(b.bottom) > 3) out.push(`${name}: its bottom is ${b.bottom.toFixed(1)} off its line — it would hang in the air or sink`);
  }
  return out;
}

/** The middle of a thing on the screen, after scrolling the room to it. */
async function bringThing(page, thing) {
  return page.evaluate((t) => {
    const el = document.querySelector(`[data-thing="${t}"]`);
    if (!el) return null;
    const scroll = document.querySelector('.room__scroll');
    const b = el.getBoundingClientRect();
    const s = scroll.getBoundingClientRect();
    scroll.scrollLeft += b.left + b.width / 2 - (s.left + s.width / 2);
    scroll.scrollTop += b.top + b.height / 2 - (s.top + s.height / 2);
    const a = el.getBoundingClientRect();
    return { x: a.left + a.width / 2, y: a.top + a.height / 2 };
  }, thing);
}

const thingsLeft = (page) => page.evaluate(() => [...document.querySelectorAll('.room__scroll [data-thing]:not(.is-found)')].map((e) => e.getAttribute('data-thing')));
const foundCount = (page) => page.evaluate(() => document.querySelectorAll('.thing-chip.is-found').length);

export async function audit({ browser, origin, axe, fail, shots }) {
  const base = `${origin}/detective/`;
  const check = async (page, label) => {
    for (const p of [...(await page.evaluate(inspectScreen, page.viewportSize().width)), ...(await axe(page))]) fail(`detective ${label}: ${p}`);
  };
  const touch = async (page, point, hasTouch) => (hasTouch ? page.touchscreen.tap(point.x, point.y) : page.mouse.click(point.x, point.y));

  async function findEverything(page, hasTouch, label) {
    for (const thing of await thingsLeft(page)) {
      const before = await foundCount(page);
      const point = await bringThing(page, thing);
      if (!point) {
        fail(`${label}: ${thing} is not in the room`);
        continue;
      }
      await touch(page, point, hasTouch);
      await page.waitForFunction((n) => document.querySelectorAll('.thing-chip.is-found').length > n || !document.querySelector('.things'), before, { timeout: 3000 }).catch(() => fail(`${label}: a touch on ${thing} did not find it`));
    }
  }

  // ---------- a whole story case on every size, in every language and theme ----------
  for (const [width, height] of SIZES) {
    for (const [locale, colorScheme] of LOOKS) {
      const label = `${width}×${height} ${locale} ${colorScheme}`;
      const hasTouch = width < 1024;
      const ctx = await browser.newContext({ viewport: { width, height }, locale, colorScheme, isMobile: width < 768, hasTouch });
      const page = await ctx.newPage();
      watch(page, `detective ${label}`, origin, fail);
      const shot = async (name) => {
        if (shots) await page.screenshot({ path: join(shots, `detective-${width}x${height}-${locale}-${name}.png`) });
      };
      await page.goto(base);
      await page.waitForSelector('.case-card');
      await check(page, `${label} cases`);
      await shot('1-cases');

      // the first story
      await page.locator('.cases .case-card').first().click();
      await page.waitForSelector('.intro');
      await check(page, `${label} story`);
      await page.locator('.intro .btn--primary').click();
      await page.waitForSelector('.room__scroll .scene');
      await page.waitForFunction(() => Number(document.querySelector('.room__scroll .scene').getAttribute('width')) > 0);
      await check(page, `${label} room`);
      for (const p of await page.evaluate(inspectThings)) fail(`detective ${label}: ${p}`);
      const room = await page.evaluate(() => {
        const r = document.querySelector('.room__scroll').getBoundingClientRect();
        return { w: r.width, h: r.height, pageScroll: document.scrollingElement.scrollHeight > window.innerHeight + 1 };
      });
      if (room.h < 180) fail(`detective ${label}: the room is only ${Math.round(room.h)} px tall`);
      if (room.pageScroll && height >= 760) fail(`detective ${label}: the page scrolls while the room is looked over`);
      await shot('2-room');

      // size buttons: closer makes the room bigger; farther — back to the whole room, then the button rests
      const sceneWidth = () => page.evaluate(() => Number(document.querySelector('.room__scroll .scene').getAttribute('width')));
      const w0 = await sceneWidth();
      await page.locator('.room__zoom .icon-btn').nth(1).click();
      if ((await sceneWidth()) <= w0) fail(`detective ${label}: "closer" did not bring the room closer`);
      for (let i = 0; i < 8 && !(await page.locator('.room__zoom .icon-btn').nth(0).isDisabled()); i++) await page.locator('.room__zoom .icon-btn').nth(0).click();
      const whole = await page.evaluate(() => {
        const s = document.querySelector('.room__scroll');
        return s.scrollWidth <= s.clientWidth + 1 && s.scrollHeight <= s.clientHeight + 1;
      });
      if (!whole) fail(`detective ${label}: the farthest view does not show the whole room`);
      await shot('3-whole-room');

      // a hint: the ring and the words
      await page.locator('.panel__head .btn').click();
      if (!(await page.locator('.scene__marks .hint').count())) fail(`detective ${label}: no ring after a hint`);
      if (!(await page.locator('.status').textContent()).trim()) fail(`detective ${label}: a hint says nothing`);

      await findEverything(page, hasTouch, label);
      await page.waitForSelector('.panel__end .btn--primary');
      await check(page, `${label} everything found`);
      await shot('4-found');
      await page.locator('.panel__end .btn--primary').click();
      await page.waitForSelector('.people');
      await check(page, `${label} suspects`);
      await shot('5-suspects');

      // a wrong name, then setting a person aside, then the right name
      await page.locator('.person').nth(0).click();
      await page.waitForSelector('dialog[open]');
      await check(page, `${label} a person`);
      await shot('6-person');
      await page.locator('dialog[open] .btn--primary').click();
      await page.waitForFunction(() => document.querySelector('dialog[open] .person-card__note')?.textContent.trim());
      await check(page, `${label} a wrong name`);
      await page.locator('dialog[open] .btn--ghost').first().click();
      if (!(await page.locator('.person.is-aside').count())) fail(`detective ${label}: a wrongly named person is not set aside`);
      await page.locator('.person').nth(1).click();
      await page.locator('dialog[open] .btn--ghost').nth(1).click(); // set aside
      if ((await page.locator('.person.is-aside').count()) !== 2) fail(`detective ${label}: "set aside" did not set the person aside`);
      await check(page, `${label} set aside`);
      await page.locator('.person').nth(2).click();
      await page.locator('dialog[open] .btn--primary').click();
      await page.waitForSelector('.result');
      await check(page, `${label} solved`);
      await shot('7-solved');

      // the menu and the large mode
      await page.locator('.top .icon-btn').last().click();
      await page.waitForSelector('dialog[open]');
      await check(page, `${label} menu`);
      await page.locator('dialog[open] input[type=checkbox]').first().check();
      await page.locator('dialog[open] .btn--primary').click();
      await check(page, `${label} large mode, solved`);
      await page.locator('.result .btn--primary').click();
      await page.waitForSelector('.case-card');
      await check(page, `${label} large mode, cases`);
      if ((await page.locator('.badge--solved').count()) !== 1) fail(`detective ${label}: the solved case is not marked in the list`);

      // the night case in the large mode: the room and the things
      await page.locator('.cases .case-card').nth(1).click();
      await page.locator('.intro .btn--primary').click();
      await page.waitForSelector('.room__scroll .scene');
      await page.waitForFunction(() => Number(document.querySelector('.room__scroll .scene').getAttribute('width')) > 0);
      await check(page, `${label} large mode, night room`);
      for (const p of await page.evaluate(inspectThings)) fail(`detective ${label} night: ${p}`);
      await shot('8-night-large');
      await ctx.close();
    }
  }

  // ---------- the case of the day and free search; a saved game after a reload ----------
  {
    const label = 'day and search';
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'uk-UA', isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    watch(page, `detective ${label}`, origin, fail);
    await page.goto(base);
    await page.locator('.home__part .case-card').first().click();
    await page.waitForSelector('.intro');
    await page.locator('.intro .btn--primary').click();
    await page.waitForSelector('.room__scroll .scene');
    await page.waitForFunction(() => Number(document.querySelector('.room__scroll .scene').getAttribute('width')) > 0);
    for (const p of await page.evaluate(inspectThings)) fail(`detective ${label}: ${p}`);
    const [first, second] = await thingsLeft(page);
    for (const thing of [first, second]) await page.touchscreen.tap(...Object.values(await bringThing(page, thing)));
    await page.waitForFunction(() => document.querySelectorAll('.thing-chip.is-found').length === 2);
    await page.reload();
    await page.waitForSelector('.room__scroll .scene');
    if ((await foundCount(page)) !== 2) fail(`detective ${label}: the saved game did not come back after a reload`);
    if ((await thingsLeft(page)).includes(first)) fail(`detective ${label}: a found thing is in the room again after a reload`);
    await findEverything(page, true, label);
    await page.locator('.panel__end .btn--primary').click();
    // name everybody in turn until the case is solved
    for (let i = 0; i < 6 && !(await page.locator('.result').count()); i++) {
      await page.locator('.person').nth(i).click();
      await page.locator('dialog[open] .btn--primary').click();
      if (await page.locator('dialog[open]').count()) await page.locator('dialog[open] .btn--ghost').first().click();
    }
    await page.waitForSelector('.result');
    if (!(await page.locator('.result .copy-out').count())) fail(`detective ${label}: no "copy result" for the case of the day`);
    await check(page, `${label} day solved`);
    await page.locator('.result .btn--primary').click();
    await page.waitForSelector('.home__streak');

    // free search: no story, ends with the last thing, "once more" hides the things anew
    await page.locator('.home__part').nth(2).locator('.case-card').first().click();
    await page.waitForSelector('.room__scroll .scene');
    await page.waitForFunction(() => Number(document.querySelector('.room__scroll .scene').getAttribute('width')) > 0);
    const placesOf = () => page.evaluate(() => [...document.querySelectorAll('.room__scroll [data-thing]')].map((e) => `${e.getAttribute('data-thing')}@${e.getAttribute('transform')}`).sort().join());
    const before = await placesOf();
    for (const p of await page.evaluate(inspectThings)) fail(`detective ${label} search: ${p}`);
    await findEverything(page, true, `${label} search`);
    await page.waitForSelector('.result');
    await check(page, `${label} search done`);
    await page.locator('.result .btn--ghost').click();
    await page.waitForSelector('.room__scroll .scene');
    if ((await placesOf()) === before) fail(`detective ${label}: "once more" kept the same places`);
    await ctx.close();
  }

  // ---------- keyboard: focus is visible; the pointer finds a thing ----------
  {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, locale: 'en-GB' });
    const page = await ctx.newPage();
    watch(page, 'detective keyboard', origin, fail);
    await page.goto(base);
    await page.waitForSelector('.case-card');
    await checkFocusVisible(page, 7, fail, 'detective keyboard, cases');
    await page.locator('.cases .case-card').first().focus();
    await page.keyboard.press('Enter');
    await page.waitForSelector('.intro');
    await page.locator('.intro .btn--primary').focus();
    await page.keyboard.press('Enter');
    await page.waitForSelector('.room__scroll .scene');
    await page.waitForFunction(() => Number(document.querySelector('.room__scroll .scene').getAttribute('width')) > 0);
    await checkFocusVisible(page, 6, fail, 'detective keyboard, room');
    await page.locator('.room__scroll').focus();
    await page.keyboard.press('ArrowRight');
    if (!(await page.locator('.scene__marks .pointer').count())) fail('detective keyboard: no pointer after an arrow key');
    // walk the pointer to the first thing and touch it
    const steps = await page.evaluate(() => {
      const scene = document.querySelector('.room__scroll .scene');
      const scale = Number(scene.getAttribute('width')) / scene.viewBox.baseVal.width;
      const at = (el) => {
        const b = el.getBoundingClientRect();
        const s = scene.getBoundingClientRect();
        return { x: (b.left + b.width / 2 - s.left) / scale, y: (b.top + b.height / 2 - s.top) / scale };
      };
      const thing = at(document.querySelector('.room__scroll [data-thing]'));
      const pointer = at(document.querySelector('.scene__marks .pointer'));
      return { dx: thing.x - pointer.x, dy: thing.y - pointer.y };
    });
    const press = async (key, n) => {
      for (let i = 0; i < n; i++) await page.keyboard.press(key);
    };
    const walk = async (delta, back, forth) => {
      const big = Math.floor(Math.abs(delta) / 80);
      const small = Math.round((Math.abs(delta) - big * 80) / 16);
      await press(`Shift+${delta < 0 ? back : forth}`, big);
      await press(delta < 0 ? back : forth, small);
    };
    await walk(steps.dx, 'ArrowLeft', 'ArrowRight');
    await walk(steps.dy, 'ArrowUp', 'ArrowDown');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelectorAll('.thing-chip.is-found').length === 1, null, { timeout: 3000 }).catch(() => fail('detective keyboard: Enter on a thing did not find it'));
    if (!/Found/.test(await page.locator('.status').textContent())) fail('detective keyboard: nothing is said after a find');
    await press('Shift+ArrowDown', 12);
    await page.keyboard.press('Enter');
    if (!/Nothing/.test(await page.locator('.status').textContent())) fail('detective keyboard: nothing is said after a touch on nothing');
    const w0 = await page.evaluate(() => Number(document.querySelector('.room__scroll .scene').getAttribute('width')));
    await page.keyboard.press('+');
    if ((await page.evaluate(() => Number(document.querySelector('.room__scroll .scene').getAttribute('width')))) <= w0) fail('detective keyboard: "+" did not bring the room closer');
    await ctx.close();
  }

  // ---------- large system text ----------
  for (const [width, height, size] of [
    [320, 640, 150],
    [390, 844, 200],
    [1366, 768, 200],
  ]) {
    const label = `${width}×${height} text ${size}%`;
    const ctx = await browser.newContext({ viewport: { width, height }, locale: 'uk-UA', isMobile: width < 768, hasTouch: width < 1024 });
    const page = await ctx.newPage();
    await page.addInitScript((s) => {
      document.addEventListener('DOMContentLoaded', () => {
        const style = document.createElement('style');
        style.textContent = `html { font-size: ${s}% !important; }`;
        document.head.append(style);
      });
    }, size);
    await page.goto(base);
    await page.waitForSelector('.case-card');
    await check(page, `${label} cases`);
    await page.locator('.cases .case-card').first().click();
    await page.waitForSelector('.intro');
    await check(page, `${label} story`);
    await page.locator('.intro .btn--primary').click();
    await page.waitForSelector('.room__scroll .scene');
    await check(page, `${label} room`);
    const roomHeight = await page.evaluate(() => document.querySelector('.room__scroll').getBoundingClientRect().height);
    if (roomHeight < 150) fail(`detective ${label}: the room is only ${Math.round(roomHeight)} px tall`);
    await findEverything(page, width < 1024, label);
    await page.locator('.panel__end .btn--primary').click();
    await page.waitForSelector('.people');
    await check(page, `${label} suspects`);
    await page.locator('.person').nth(0).click();
    await check(page, `${label} a person`);
    await ctx.close();
  }
  return `${SIZES.length} sizes × ${LOOKS.length} looks through a whole case, the case of the day, free search, a reload, keyboard, large text`;
}
