// Colours: every token has a light value, both dark blocks (system dark and a host's explicit dark) say the
// same, no colour is written anywhere but tokens.css, and what must be seen is seen in both themes: the numbers on an
// open cell; a closed cell told from an open one by its dark edge; the flag, the mine, the flower and a hint's ring.
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
/** The faces of the field's cells: open, closed, the mine opened. */
const FACES = ['--open', '--closed', '--boom'];
const TEXT: [string, string][] = [
  ['--text', '--bg'],
  ['--muted', '--bg'],
  ['--text', '--surface'],
  ['--muted', '--surface'],
  ['--on-accent', '--accent'],
  ['--accent', '--surface'],
  ['--accent', '--bg'],
  // the numbers on an open cell
  ...['--n1', '--n2', '--n3', '--n4', '--n5', '--n6', '--n7', '--n8'].map((n): [string, string] => [n, '--open']),
];
const MARKS: [string, string][] = [
  ['--focus', '--bg'],
  ['--focus', '--surface'],
  ['--line', '--surface'],
  ['--line', '--bg'],
  // a closed cell's dark edge parts it from an open one and from its own face; the lines between open cells
  ['--closed-dark', '--open'],
  ['--closed-dark', '--closed'],
  ['--grid', '--open'],
  // the flag on a closed cell; the mine and the flower where they are shown; the cross over a wrong flag
  ['--flag', '--closed'],
  ['--pole', '--closed'],
  ['--mine', '--open'],
  ['--mine', '--boom'],
  ['--petal', '--open'],
  ['--petal', '--boom'],
  ['--bad', '--closed'],
  // a hint's ring and the keys' focus on every face
  ...FACES.flatMap((face): [string, string][] => [
    ['--hint-mark', face],
    ['--cell-focus', face],
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

  it(`${theme}: focus, borders and the marks of the field have contrast 3:1`, () => {
    for (const [fg, bg] of MARKS) expect(ratio(solid(fg), solid(bg)), `${fg} on ${bg}`).toBeGreaterThanOrEqual(3);
  });

  it(`${theme}: the field stands out on the page by its cells or by their edge`, () => {
    const byFace = ratio(solid('--closed'), solid('--bg'));
    const byEdge = ratio(solid('--closed-dark'), solid('--bg'));
    expect(Math.max(byFace, byEdge)).toBeGreaterThanOrEqual(3);
  });
}
