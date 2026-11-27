// The paints: as many as the box holds; any two told apart by colour (and always by pattern); each pattern's ink and the
// line between layers of water read on every paint at 3:1, in both themes.
import { expect, it } from 'vitest';
import tokens from '../styles/tokens.css?raw';
import { POUR } from '../config.ts';
import { PAINTS } from './palette.ts';

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

/** A token's value in a block of tokens.css. */
function token(selector: string, name: string): string | undefined {
  const start = tokens.indexOf(`${selector} {`);
  const body = tokens.slice(start, tokens.indexOf('}', start));
  return body.match(new RegExp(`${name}\\s*:\\s*(#[0-9a-f]{6})`, 'i'))?.[1];
}

it('holds as many paints as the box', () => {
  expect(PAINTS).toHaveLength(POUR.paints);
});

it('tells any two paints apart by colour (CIE Lab distance 20 at least)', () => {
  for (let i = 0; i < PAINTS.length; i++) {
    for (let j = i + 1; j < PAINTS.length; j++) expect(distance(PAINTS[i]!.water, PAINTS[j]!.water), `${i} and ${j}`).toBeGreaterThanOrEqual(20);
  }
});

it('shows each pattern on its paint at 3:1', () => {
  for (const [i, p] of PAINTS.entries()) expect(ratio(p.ink, p.water), `paint ${i}`).toBeGreaterThanOrEqual(3);
});

it('shows the line between layers on every paint at 3:1 (one of its two edges), in both themes', () => {
  for (const selector of [':root', ":root[data-theme='dark']"]) {
    const dark = token(selector, '--layer-dark') ?? token(':root', '--layer-dark')!;
    const light = token(selector, '--layer-light') ?? token(':root', '--layer-light')!;
    for (const [i, p] of PAINTS.entries()) expect(Math.max(ratio(dark, p.water), ratio(light, p.water)), `${selector} paint ${i}`).toBeGreaterThanOrEqual(3);
  }
});
