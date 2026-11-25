// The tile pictures: every picture is drawn, colours come from the palette only, and the outline that carries
// every shape stands out on the face of a tile.
import { expect, it } from 'vitest';
import { PICTURES } from '../config.ts';
import { PAINT } from './palette.ts';
import { pictureSvg, symbolsSvg } from './tiles.ts';

const sources = import.meta.glob('./*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

const luminance = (hex: string) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
};
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
};

it('keeps colours in palette.ts only', () => {
  for (const [file, text] of Object.entries(sources)) {
    if (file.endsWith('/palette.ts') || file.endsWith('.test.ts')) continue;
    expect(text.match(/#[0-9a-fA-F]{3,8}\b|rgb\(|hsl\(/g), file).toBeNull();
  }
});

it('draws every picture, each one different, with whole numbers only', () => {
  const drawn = PICTURES.map((p) => pictureSvg(p));
  for (const [i, svg] of drawn.entries()) {
    expect(svg.length, PICTURES[i]).toBeGreaterThan(40);
    expect(svg, PICTURES[i]).not.toMatch(/NaN|undefined/);
    // every picture carries the outline
    expect(svg, PICTURES[i]).toContain(PAINT.outline);
  }
  expect(new Set(drawn).size).toBe(PICTURES.length);
  expect(symbolsSvg(PICTURES).match(/<symbol /g)).toHaveLength(PICTURES.length);
});

it('the outline stands out on the face of a tile (at least 3:1), and so do the eye of the fish and the stems', () => {
  for (const ink of ['outline', 'eye', 'stem', 'leafDark'] as const) expect(contrast(PAINT[ink], PAINT.face), ink).toBeGreaterThanOrEqual(3);
});
