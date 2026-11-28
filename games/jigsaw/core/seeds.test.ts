import { describe, expect, it } from 'vitest';
import { PICTURES } from '../config.ts';
import { dailySeed, partSeed, pictureOf } from './seeds.ts';

describe('seeds', () => {
  it('of the day are the same for the same date and differ between dates', () => {
    expect(dailySeed('2026-11-28')).toBe(dailySeed('2026-11-28'));
    expect(dailySeed('2026-11-28')).not.toBe(dailySeed('2026-11-29'));
  });

  it('give each part of a puzzle a seed of its own', () => {
    const parts = (['cut', 'tray', 'things', 'picture'] as const).map((p) => partSeed(77, p));
    expect(new Set(parts).size).toBe(parts.length);
    expect(partSeed(77, 'cut')).toBe(partSeed(77, 'cut'));
  });

  it('draw every picture for puzzles whose picture was not chosen', () => {
    const seen = new Set<number>();
    for (let seed = 0; seed < 200; seed++) {
      const p = pictureOf(seed, PICTURES.length);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThan(PICTURES.length);
      seen.add(p);
    }
    expect(seen.size).toBe(PICTURES.length);
  });

  it('of the day draw pictures that do not follow the dates’ last digits', () => {
    // two dates that differ only at the end must not give a fixed step between pictures (rules/game-logic.md)
    const days = Array.from({ length: 28 }, (_, i) => `2026-11-${String(i + 1).padStart(2, '0')}`);
    const pictures = days.map((d) => pictureOf(dailySeed(d), PICTURES.length));
    const steps = new Set(pictures.slice(1).map((p, i) => (p - pictures[i]! + PICTURES.length) % PICTURES.length));
    expect(steps.size).toBeGreaterThan(2);
  });
});
