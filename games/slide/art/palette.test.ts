// The drawings' colours (docs/slide/SPEC.md, "Три теми навмання", "Скринька"; rule 6): in every look the pieces'
// outline reads on the ground and on each piece at 3:1, the arrow reads on the player's piece, and the player's piece
// differs from the others by colour (and always by its arrow); in "The chest" the chest differs from the blocks by
// colour (and by its brass fittings, which read on it), the blocks' grain reads on them, the slot's arrow on its
// edge; the drawing modules hold no colour of their own.
import { describe, expect, it } from 'vitest';
import { THEMES } from '../config.ts';
import chest from './chest.ts?raw';
import pieces from './pieces.ts?raw';
import { BOX_LOOK, LOOKS } from './palette.ts';

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
function lab(hex: string): RGB {
  const [r, g, b] = rgb(hex).map(lin) as RGB;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047;
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}
const distance = (a: string, b: string) => Math.hypot(...lab(a).map((v, i) => v - lab(b)[i]!));

describe.each(THEMES)('the look %s', (theme) => {
  const p = LOOKS[theme];

  it('outlines every piece at 3:1 on the ground and on the piece itself', () => {
    expect(ratio(p.outline, p.ground)).toBeGreaterThanOrEqual(3);
    for (const fill of [p.own, p.short, p.long]) expect(ratio(p.outline, fill), fill).toBeGreaterThanOrEqual(3);
  });

  it('shows the arrow on the player’s piece at 3:1', () => {
    expect(ratio(p.arrow, p.own)).toBeGreaterThanOrEqual(3);
  });

  it('tells the player’s piece from the others by colour (CIE Lab distance 20 at least)', () => {
    expect(distance(p.own, p.short)).toBeGreaterThanOrEqual(20);
    expect(distance(p.own, p.long)).toBeGreaterThanOrEqual(20);
    expect(distance(p.own, p.ground)).toBeGreaterThanOrEqual(20);
  });
});

describe('the chest', () => {
  const p = BOX_LOOK;

  it('outlines every piece at 3:1 on the tray and on the piece itself; the sides of the tray stand out from it', () => {
    expect(ratio(p.outline, p.ground)).toBeGreaterThanOrEqual(3);
    for (const fill of [p.chest, p.block, p.blockTop]) expect(ratio(p.outline, fill), fill).toBeGreaterThanOrEqual(3);
    expect(ratio(p.frame, p.ground)).toBeGreaterThanOrEqual(3);
    expect(ratio(p.arrow, p.outline)).toBeGreaterThanOrEqual(3);
  });

  it('shows the chest’s brass fittings and the blocks’ grain at 3:1', () => {
    expect(ratio(p.brass, p.chest)).toBeGreaterThanOrEqual(3);
    expect(ratio(p.blockLine, p.blockTop)).toBeGreaterThanOrEqual(3);
  });

  it('tells the chest from the blocks and the tray by colour (CIE Lab distance 20 at least)', () => {
    for (const other of [p.block, p.blockTop, p.ground]) expect(distance(p.chest, other), other).toBeGreaterThanOrEqual(20);
  });
});

it('the drawing modules take every colour from the palette', () => {
  for (const module of [pieces, chest]) {
    expect(module.match(/#[0-9a-f]{3,8}\b/gi)).toBeNull();
    expect(module).not.toMatch(/rgb\(|hsl\(/);
  }
});
