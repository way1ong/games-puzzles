// What the browser audit of every game shares: collecting problems, the checks that hold for any screen
// (no sideways scroll, touch targets, whole words on buttons), the axe-core rules, console and network watch.

export function createReport() {
  const problems = [];
  return {
    problems,
    fail(message) {
      problems.push(message);
      console.log('FAIL', message);
    },
  };
}

/**
 * Runs in the page: everything a player could meet that is wrong on any screen right now. `width` — the
 * width of the screen: a phone shows a wider page shrunk, and then the page's own measure of the window
 * grows with it. Or { width, dense, skip }: `dense` — a selector of targets that cannot all be 44 px on a phone
 * (the 81 cells of a sudoku board), checked against the smaller size `dense.min` instead; `skip` — a selector of
 * targets the game's own check measures (the cells of a zoomed grid lie partly beyond the screen by design).
 */
export function inspectScreen(arg) {
  const width = typeof arg === 'number' ? arg : arg.width;
  const dense = typeof arg === 'number' ? null : arg.dense;
  const skip = typeof arg === 'number' ? null : arg.skip;
  const out = [];
  const doc = document.scrollingElement;
  if (doc.scrollWidth > width + 1 || window.innerWidth > width + 1) out.push(`the page is ${Math.max(doc.scrollWidth, window.innerWidth)} px wide on a ${width} px screen`);
  const visible = (el) => {
    const b = el.getBoundingClientRect();
    const dialog = el.closest('dialog');
    return b.width > 0 && getComputedStyle(el).visibility !== 'hidden' && (!dialog || dialog.open) && !(document.querySelector('dialog[open]') && !dialog);
  };
  for (const el of document.querySelectorAll('button, .tray__grab, a, input')) {
    if (!visible(el) || (skip && el.matches(skip))) continue;
    const box = (el.tagName === 'INPUT' ? el.closest('label') : el).getBoundingClientRect();
    const name = (el.getAttribute('aria-label') || el.textContent).trim().slice(0, 24);
    const min = dense && el.matches(dense.selector) ? dense.min : 44;
    if (box.width < min || box.height < min) out.push(`small target "${name}" ${Math.round(box.width)}×${Math.round(box.height)}`);
    if (box.right > window.innerWidth + 1 || box.left < -1) out.push(`"${name}" sticks out of the screen`);
    const text = el.textContent.trim();
    if (el.tagName !== 'BUTTON' || !text) continue;
    if (el.scrollWidth > el.clientWidth + 1) out.push(`text sticks out of "${text.slice(0, 24)}"`);
    // only the element's own words count: a word must not be broken across lines
    for (const node of el.querySelectorAll('span, strong, b')) {
      if (node.children.length || !node.textContent.trim() || !node.getClientRects().length) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      const lines = new Set([...range.getClientRects()].filter((r) => r.width > 0).map((r) => Math.round(r.top))).size;
      if (lines > node.textContent.trim().split(/\s+/).length) out.push(`word broken in "${node.textContent.trim().slice(0, 24)}"`);
    }
    if (!el.children.length) {
      const range = document.createRange();
      range.selectNodeContents(el);
      const lines = new Set([...range.getClientRects()].filter((r) => r.width > 0).map((r) => Math.round(r.top))).size;
      if (lines > text.split(/\s+/).length) out.push(`word broken on "${text}"`);
    }
  }
  return out;
}

export function createAxe(source) {
  return async function axe(page) {
    if (!source) return [];
    await page.addScriptTag({ content: source });
    const result = await page.evaluate(() =>
      window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] } }),
    );
    return result.violations.map((v) => `axe ${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).slice(0, 2).join(' | ')})`);
  };
}

/** Errors in the console and requests to anywhere but the game's own server are problems. */
export function watch(page, label, origin, fail) {
  page.on('pageerror', (e) => fail(`${label}: page error ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') fail(`${label}: console ${m.type()} ${m.text()}`);
  });
  page.on('request', (r) => {
    if (!r.url().startsWith(origin) && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) fail(`${label}: request to ${r.url()}`);
  });
}

export const SIZES = [
  [320, 640],
  [360, 640],
  [390, 844],
  [768, 1024],
  [1024, 768],
  [1366, 768],
];
export const LOOKS = [
  ['en-GB', 'light'],
  ['hu-HU', 'dark'],
  ['uk-UA', 'light'],
];

/** Focus must be visible on everything Tab reaches. */
export async function checkFocusVisible(page, presses, fail, label) {
  const seen = [];
  for (let i = 0; i < presses; i++) {
    await page.keyboard.press('Tab');
    const f = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const st = getComputedStyle(el);
      return { name: (el.getAttribute('aria-label') || el.textContent).trim().slice(0, 20), shown: st.outlineStyle !== 'none' && parseFloat(st.outlineWidth) >= 2 };
    });
    if (!f) continue;
    seen.push(f.name);
    if (!f.shown) fail(`${label}: focus not visible on "${f.name}"`);
  }
  return seen;
}
