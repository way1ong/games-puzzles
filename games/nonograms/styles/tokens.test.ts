// Colours: every token has a light value, both dark blocks (system dark and a host's explicit dark) say the
// same, no colour is written anywhere but tokens.css, and what must be seen is seen in both themes.
import { expect, it } from 'vitest';
import app from './app.css?raw';
import tokens from './tokens.css?raw';

const COLOUR = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(/i;

/** Custom properties declared in the first block that follows `selector`. */
function block(selector: string): Map<string, string> {
  const start = tokens.indexOf(`${selector} {`);
  expect(start, selector).toBeGreaterThanOrEqual(0);
  const body = tokens.slice(start + selector.length + 2, tokens.indexOf('}', start));
  const out = new Map<string, string>();
  for (const [, name, value] of body.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    out.set(name as string, (value as string).trim());
  }
  return out;
}

const light = block(':root');
const systemDark = block(":root:not([data-theme='light'])");
const chosenDark = block(":root[data-theme='dark']");

it('gives both dark blocks the same values', () => {
  expect([...chosenDark]).toEqual([...systemDark]);
});

it('defines every dark token in the light block too', () => {
  for (const name of systemDark.keys()) expect(light.has(name), name).toBe(true);
});

it('keeps colours out of app.css', () => {
  const line = app.split('\n').find((l) => COLOUR.test(l));
  expect(line).toBeUndefined();
});

// ---------- contrast (WCAG 2): text 4.5:1, what marks controls and the cells 3:1 ----------

type RGB = [number, number, number];

function parse(value: string): { rgb: RGB; alpha: number } {
  const hex = value.match(/^#([0-9a-f]{6})([0-9a-f]{2})?$/i);
  if (hex) {
    const n = hex[1] as string;
    const rgb: RGB = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16)) as RGB;
    return { rgb, alpha: hex[2] ? parseInt(hex[2], 16) / 255 : 1 };
  }
  const fn = value.match(/^rgb\((\d+) (\d+) (\d+) \/ ([\d.]+)\)$/);
  if (fn) return { rgb: [Number(fn[1]), Number(fn[2]), Number(fn[3])], alpha: Number(fn[4]) };
  throw new Error(`Cannot read the colour ${value}`);
}

function luminance([r, g, b]: RGB): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function ratio(a: RGB, b: RGB): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

const themes = { light, dark: new Map([...light, ...systemDark]) };
/** Every face a cell of the sheet can show: plain, under the finger's row and column, in a hint's line. */
const CELLS = ['--sheet', '--sheet-line', '--hint-bg'];
/** Every ground of the numbers' strips. */
const STRIPS = ['--surface', '--clue-line', '--clue-hint'];
const TEXT: [string, string][] = [
  ['--text', '--bg'],
  ['--muted', '--bg'],
  ['--on-accent', '--accent'],
  ['--accent', '--surface'],
  ['--accent', '--bg'],
  // the numbers, and a finished line's faded ones, on every ground of their strips
  ...STRIPS.flatMap((ground): [string, string][] => [
    ['--text', ground],
    ['--muted', ground],
  ]),
];
const MARKS: [string, string][] = [
  ['--focus', '--bg'],
  ['--focus', '--surface'],
  ['--line', '--surface'],
  ['--line', '--bg'],
  // a filled cell, a cross, the lines and the keys' focus on every face of a cell
  ...CELLS.flatMap((face): [string, string][] => [
    ['--ink', face],
    ['--cross', face],
    ['--grid-line', face],
    ['--grid-thick', face],
    ['--sheet-focus', face],
    ['--bad', face],
    ['--hint-mark', face],
  ]),
];

for (const [theme, t] of Object.entries(themes)) {
  const solid = (name: string): RGB => {
    const v = t.get(name);
    if (!v) throw new Error(`No ${name}`);
    const c = parse(v);
    expect(c.alpha, `${name} must be solid`).toBe(1);
    return c.rgb;
  };

  it(`${theme}: text and the numbers have contrast 4.5:1`, () => {
    for (const [fg, bg] of TEXT) expect(ratio(solid(fg), solid(bg)), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
  });

  it(`${theme}: focus, borders, the marks and lines on the sheet have contrast 3:1`, () => {
    for (const [fg, bg] of MARKS) expect(ratio(solid(fg), solid(bg)), `${fg} on ${bg}`).toBeGreaterThanOrEqual(3);
  });

  it(`${theme}: the sheet stands out on the page by its face or by its edge`, () => {
    const byFace = ratio(solid('--sheet'), solid('--bg'));
    const byEdge = ratio(solid('--grid-thick'), solid('--bg'));
    expect(Math.max(byFace, byEdge)).toBeGreaterThanOrEqual(3);
  });
}
