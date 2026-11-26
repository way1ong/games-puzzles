import { describe, expect, it } from 'vitest';
import { PAIRS } from '../config.ts';
import { clearRate } from './difficulty.ts';
import { makeDaily, makeLevel } from './level.ts';
import { tableFor } from './play.ts';
import { tableOf } from './table.ts';

/** How often random play clears a made level or day, measured with more plays than the choice uses. */
const rateOf = (p: ReturnType<typeof makeLevel>) => clearRate(tableFor(p.layout), p.kinds, 200, 7);
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

describe('how hard a deal is', () => {
  it('a table any order clears has the rate 1; one that cannot be cleared, 0', () => {
    // two pictures in a row of four: the ends first, then the middle — any way works
    const row = tableOf([0, 2, 4, 6].map((x) => ({ x, y: 0, z: 0 })));
    expect(clearRate(row, [1, 2, 2, 1], 50, 1)).toBe(1);
    // the ends differ and the middle tiles never come free
    expect(clearRate(row, [1, 1, 2, 2], 50, 1)).toBe(0);
  });

  it('a wrong choice costs the game: four alike, one on another — a third of the first picks closes the way', () => {
    // an A lies on an A; two more A free beside: taking those two first leaves the stacked pair, which cannot be taken
    const table = tableOf([
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: 1 },
      { x: 4, y: 0, z: 0 },
      { x: 8, y: 0, z: 0 },
    ]);
    const rate = clearRate(table, [0, 0, 0, 0], 600, 3);
    expect(rate).toBeGreaterThan(0.55);
    expect(rate).toBeLessThan(0.78);
    // the same random player for the same deal: the same rate on every device
    expect(clearRate(table, [0, 0, 0, 0], 600, 3)).toBe(rate);
  });
});

describe('levels harder step by step (decision of 25.11)', () => {
  const steps = PAIRS.levels.map((step) => Array.from({ length: 5 }, (_, i) => rateOf(makeLevel(step.from + i))));

  it('each step is dealt harder than the one before, near the rate it asks for', () => {
    const means = steps.map(mean);
    for (let k = 1; k < means.length; k++) expect(means[k]!, `step ${k + 1}`).toBeLessThan(means[k - 1]!);
    PAIRS.levels.forEach((step, k) => expect(Math.abs(means[k]! - step.rate), `step from ${step.from}`).toBeLessThan(0.15));
  });

  it('the layout of the day is among the hardest', () => {
    const days = ['2026-11-25', '2026-11-26', '2026-11-27', '2026-11-28', '2026-11-29'].map((d) => rateOf(makeDaily(d)));
    expect(mean(days)).toBeLessThanOrEqual(mean(steps[2]!));
    expect(Math.abs(mean(days) - PAIRS.daily.rate)).toBeLessThan(0.15);
  });

  it('the layouts that soon lie nearly all free are dealt no more', () => {
    const dealt = new Set([...PAIRS.levels.flatMap((s) => s.layouts), ...PAIRS.daily.layouts]);
    for (const name of ['hills', 'castle', 'tower', 'citadel']) expect(dealt.has(name), name).toBe(false);
  });
});
