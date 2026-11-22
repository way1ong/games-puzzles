import { describe, expect, it } from 'vitest';
import { nextInt, nextRandom, seedFromText } from './rng.ts';

describe('seeded random numbers', () => {
  it('gives the same sequence for the same seed', () => {
    const run = (seed: number) => {
      const out: number[] = [];
      let s = seed;
      for (let i = 0; i < 5; i++) {
        const d = nextRandom(s);
        out.push(d.value);
        s = d.state;
      }
      return out;
    };
    expect(run(42)).toEqual(run(42));
    expect(run(42)).not.toEqual(run(43));
  });

  it('stays in [0, 1) and whole numbers stay below max', () => {
    let s = 7;
    for (let i = 0; i < 1000; i++) {
      const d = nextRandom(s);
      expect(d.value).toBeGreaterThanOrEqual(0);
      expect(d.value).toBeLessThan(1);
      const n = nextInt(d.state, 6);
      expect(n.value).toBeGreaterThanOrEqual(0);
      expect(n.value).toBeLessThan(6);
      s = n.state;
    }
  });

  it('turns text into a stable seed', () => {
    expect(seedFromText('way1ong-blocks:daily:2026-11-22')).toBe(seedFromText('way1ong-blocks:daily:2026-11-22'));
    expect(seedFromText('a')).not.toBe(seedFromText('b'));
  });
});
