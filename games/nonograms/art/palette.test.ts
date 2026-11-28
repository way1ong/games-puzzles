// The colours while a colour picture is played (docs/nonograms/SPEC.md, "Кольорові малюнки"): each palette colour's
// ink reads on it at 4.5:1 (its numbers); a colour goes without a pattern only where it stands out on every face of a
// cell by itself (3:1, both themes), and the pattern of any other stands out there in its ink; a number's box shows on
// every ground of its strip by its colour or by its edge (the ink). The grounds are read from styles/tokens.css.
import { expect, it } from 'vitest';
import tokens from '../styles/tokens.css?raw';
import { INK, PAINT_LOOK, PALETTE, type Colour } from './palette.ts';

type RGB = [number, number, number];
const rgb = (hex: string): RGB => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as RGB;
const lin = (c: number) => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const luminance = (hex: string) => {
  const [r, g, b] = rgb(hex).map(lin) as RGB;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
};

/** A token's value in the light block, or in the dark one (falling back to the light value). */
function token(name: string, theme: 'light' | 'dark'): string {
  const find = (selector: string) => {
    const start = tokens.indexOf(`${selector} {`);
    const body = tokens.slice(start, tokens.indexOf('}', start));
    return body.match(new RegExp(`${name}\\s*:\\s*(#[0-9a-f]{6})\\b`, 'i'))?.[1];
  };
  const value = (theme === 'dark' ? find(":root[data-theme='dark']") : undefined) ?? find(':root');
  if (!value) throw new Error(`No ${name}`);
  return value;
}

const THEMES = ['light', 'dark'] as const;
/** Every face a cell of the sheet can show: plain, under the finger's row and column, in a hint's line. */
const FACES = THEMES.flatMap((t) => ['--sheet', '--sheet-line', '--hint-bg'].map((name) => ({ name: `${t} ${name}`, hex: token(name, t) })));
/** Every ground of the numbers' strips. */
const GROUNDS = THEMES.flatMap((t) => ['--surface', '--clue-line', '--clue-hint'].map((name) => ({ name: `${t} ${name}`, hex: token(name, t) })));
const colours = Object.keys(PALETTE) as Colour[];

it('gives every colour of the palette its look, with one of the two inks', () => {
  expect(Object.keys(PAINT_LOOK).sort()).toEqual([...colours].sort());
  for (const c of colours) expect(Object.values(INK), c).toContain(PAINT_LOOK[c].ink);
  for (const hex of Object.values(INK)) expect(hex).toMatch(/^#[0-9a-f]{6}$/);
});

it('writes each colour’s numbers in an ink that reads on it at 4.5:1', () => {
  for (const c of colours) expect(ratio(PAINT_LOOK[c].ink, PALETTE[c]), c).toBeGreaterThanOrEqual(4.5);
});

it('lets a colour go without a pattern exactly where it stands out on every face of a cell (3:1)', () => {
  for (const c of colours) {
    const standsOut = FACES.every((f) => ratio(PALETTE[c], f.hex) >= 3);
    expect(PAINT_LOOK[c].plain, c).toBe(standsOut);
  }
});

it('shows the pattern of a colour that needs one on every face of a cell (3:1)', () => {
  for (const c of colours.filter((x) => !PAINT_LOOK[x].plain)) {
    for (const f of FACES) expect(ratio(PAINT_LOOK[c].ink, f.hex), `${c} on ${f.name}`).toBeGreaterThanOrEqual(3);
  }
});

it('shows a number’s box on every ground of its strip, by its colour or by its edge in the ink (3:1)', () => {
  for (const c of colours) {
    for (const g of GROUNDS) {
      expect(Math.max(ratio(PALETTE[c], g.hex), ratio(PAINT_LOOK[c].ink, g.hex)), `${c} on ${g.name}`).toBeGreaterThanOrEqual(3);
    }
  }
});
