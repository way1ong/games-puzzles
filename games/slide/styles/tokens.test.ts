// Colours: every token has a light value, both dark blocks (system dark and a host's explicit dark) say the
// same, no colour is written anywhere but tokens.css (and the drawings in art/palette.ts), and what must be seen is
// seen in both themes: the numbers on the tiles, a tile on the board, the small number on a picture, and the marks on
// the boards (a dark ring around a light band: one of them reads on whatever is under it).
import { expect, it } from 'vitest';
import app from './app.css?raw';
import tokens from './tokens.css?raw';
import { LOOKS } from '../art/palette.ts';

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
const TEXT: [string, string][] = [
  ['--text', '--bg'],
  ['--muted', '--bg'],
  ['--text', '--surface'],
  ['--muted', '--surface'],
  ['--on-accent', '--accent'],
  ['--accent', '--surface'],
  ['--accent', '--bg'],
  // the numbers on the tiles, the small number on a picture
  ['--tile-ink', '--tile'],
  ['--badge-ink', '--badge'],
];
const MARKS: [string, string][] = [
  ['--focus', '--bg'],
  ['--focus', '--surface'],
  ['--line', '--surface'],
  ['--line', '--bg'],
  // a tile's edge on the tile
  ['--tile-line', '--tile'],
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

  it(`${theme}: a tile stands out on the board by its fill or by its edge, at 3:1`, () => {
    expect(Math.max(ratio(solid('--tile'), solid('--board')), ratio(solid('--tile-line'), solid('--board')))).toBeGreaterThanOrEqual(3);
  });

  it(`${theme}: a mark's dark ring and light band are apart at 3:1, so one of them reads on anything`, () => {
    expect(ratio(solid('--mark-dark'), solid('--mark-light'))).toBeGreaterThanOrEqual(3);
    // on the drawings of "Clear the way" each ground reads one of them at 3:1 at least
    for (const look of Object.values(LOOKS)) {
      const ground = parse(look.ground).rgb;
      expect(Math.max(ratio(solid('--mark-dark'), ground), ratio(solid('--mark-light'), ground)), look.ground).toBeGreaterThanOrEqual(3);
    }
  });
}
