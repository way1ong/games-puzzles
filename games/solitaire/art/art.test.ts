// The suits: every suit is drawn, each with its own shape, and without a colour of its own (the card gives it). The
// figures of the jack, queen and king (the drawn look): each its own, the robe in the suit's colour, other colours
// from the tokens. The textures: noise only.
import { expect, it } from 'vitest';
import { SUITS } from '../core/cards.ts';
import { COURTS, courtSymbols } from './courts.ts';
import { suitShape, suitSymbols } from './suits.ts';
import { TEXTURES } from './textures.ts';

const sources = import.meta.glob('./*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

it('draws every suit, each one different', () => {
  const shapes = SUITS.map((s) => suitShape(s));
  for (const [i, shape] of shapes.entries()) expect(shape, SUITS[i]).toMatch(/^<(path|circle)/);
  expect(new Set(shapes).size).toBe(SUITS.length);
  expect(suitSymbols().match(/<symbol /g)).toHaveLength(SUITS.length);
});

it('keeps colours out of the drawings: the card gives them', () => {
  for (const [file, text] of Object.entries(sources)) {
    if (file.endsWith('.test.ts')) continue;
    expect(text.match(/#[0-9a-fA-F]{3,8}\b|rgb\(|hsl\(/g), file).toBeNull();
  }
});

it('draws the jack, the queen and the king, each its own, the robe in the colour of the suit', () => {
  const figures = Object.values(COURTS);
  expect(figures).toHaveLength(3);
  expect(new Set(figures).size).toBe(3);
  for (const f of figures) {
    expect(f).toContain('fill:currentColor');
    // every other colour is a token: var(--court-…)
    for (const [, paint] of f.matchAll(/fill:([^;"]+)/g)) expect(paint).toMatch(/^(currentColor|none|var\(--court-[a-z]+\))$/);
  }
  expect(courtSymbols().match(/<symbol /g)).toHaveLength(3);
});

it('makes the textures of noise only', () => {
  for (const [name, url] of Object.entries(TEXTURES)) {
    expect(name).toMatch(/^--tex-/);
    expect(decodeURIComponent(url)).toContain('feTurbulence');
  }
});
