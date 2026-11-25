// The suits: every suit is drawn, each with its own shape, and without a colour of its own (the card gives it).
import { expect, it } from 'vitest';
import { SUITS } from '../core/cards.ts';
import { suitShape, suitSymbols } from './suits.ts';

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
