import { describe, expect, it } from 'vitest';
import { DETECTIVE } from '../config.ts';
import { makeCast } from './cast.ts';
import { fairness } from './clues.ts';
import { PEOPLE, traitsOf } from './people.ts';
import { clueKind } from './traits.ts';

describe('suspects made from a seed', () => {
  const SEEDS = Array.from({ length: 600 }, (_, i) => (i * 2654435761) >>> 0);
  const casts = SEEDS.map((seed) => makeCast(seed));

  it('are always a fair puzzle with the numbers of the rules', () => {
    casts.forEach((cast, i) => {
      expect(cast.suspects.length, `seed ${i}`).toBe(DETECTIVE.suspectsPerCase);
      expect(new Set(cast.suspects.map((s) => s.person)).size, `seed ${i}`).toBe(cast.suspects.length);
      expect(cast.clues.length, `seed ${i}`).toBe(DETECTIVE.cluesPerCase);
      expect(new Set(cast.clues.map(clueKind)).size, `seed ${i}`).toBe(cast.clues.length);
      expect(fairness(cast.suspects.map(traitsOf), cast.clues), `seed ${i}`).toEqual({ fit: [cast.culprit], needless: [] });
    });
  });

  it('are the same for the same seed', () => {
    expect(makeCast(12345)).toEqual(makeCast(12345));
  });

  it('vary: every person is the culprit sometimes, every kind of evidence is used, any place in the row', () => {
    const culprits = new Set(casts.map((c) => c.suspects[c.culprit]?.person));
    const kinds = new Set(casts.flatMap((c) => c.clues.map(clueKind)));
    const places = new Set(casts.map((c) => c.culprit));
    expect(culprits.size).toBe(Object.keys(PEOPLE).length);
    expect([...kinds].sort()).toEqual(['buttons', 'flower', 'glasses', 'hair', 'scarf']);
    expect(places.size).toBe(DETECTIVE.suspectsPerCase);
  });
});
