// The fewest pours (decision of 28.11): counted exactly — as a plain search over every position finds them on small
// deals; within the limit for the levels and free play; never more than the way the solver finds; a deal already done
// needs none; a limit too small gives up honestly.
import { describe, expect, it } from 'vitest';
import { POUR } from '../config.ts';
import { isSolved, keyOf, legalMoves, pour, type Bottles } from './bottles.ts';
import { fewestPours, finishTask, runsOf } from './fewest.ts';
import { freeDeal, levelDeal } from './level.ts';
import { solve } from './solve.ts';

const CAP = POUR.capacity;

/** The fewest pours by a plain search, breadth first, over every legal pour. */
function plainFewest(start: Bottles): number | null {
  let layer: Bottles[] = [start];
  const seen = new Set([keyOf(start)]);
  for (let depth = 0; layer.length; depth++) {
    const next: Bottles[] = [];
    for (const b of layer) {
      if (isSolved(b, CAP)) return depth;
      for (const m of legalMoves(b, CAP)) {
        const n = pour(b, m, CAP);
        const k = keyOf(n);
        if (seen.has(k)) continue;
        seen.add(k);
        next.push(n);
      }
    }
    layer = next;
  }
  return null;
}

describe('the fewest pours', () => {
  it('are the fewest: as a plain search over every position finds them', () => {
    for (const level of [1, 2, 3, 4, 5, 6, 7]) {
      const d = levelDeal(level);
      expect(finishTask(fewestPours(d.bottles, d.colours, CAP, POUR.fewest.limit)), `level ${level}`).toBe(plainFewest(d.bottles));
    }
  });

  it('are counted within the limit for the levels and free play, and are never more than the way the solver finds', () => {
    for (const d of [levelDeal(10), levelDeal(30), levelDeal(60), freeDeal('hard', 3), freeDeal('hard', 5)]) {
      const n = finishTask(fewestPours(d.bottles, d.colours, CAP, POUR.fewest.limit));
      expect(n).not.toBeNull();
      expect(n!).toBeLessThanOrEqual(solve(d.bottles, CAP, POUR.solveLimit).moves!.length);
      expect(n!).toBeGreaterThanOrEqual(runsOf(d.bottles) - d.colours);
    }
  });

  it('are none for a shelf already done, and given up within too small a limit', () => {
    const done: Bottles = [[0, 0, 0, 0], [1, 1, 1, 1], [], []];
    expect(finishTask(fewestPours(done, 2, CAP, 10))).toBe(0);
    const d = levelDeal(30);
    expect(finishTask(fewestPours(d.bottles, d.colours, CAP, 3))).toBeNull();
  });
});
