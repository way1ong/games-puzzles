// Deals that can be won (docs/solitaire/SPEC.md, "Роздачі"): from a seed on, the first deal the solver wins within
// its budget; the deal of the day, from the date, the same for everybody. The work goes in slices (`run`), so the
// screen keeps working. Pure.
import { seedFromText } from '../../../shared/core/rng.ts';
import { SOLITAIRE, type Draw } from '../config.ts';
import { deal } from './klondike.ts';
import { createSolver, type Solver } from './solve.ts';

/** Work that goes on in slices: `run` spends at most `steps` positions, and returns the result once there is one. */
export interface Task<T> {
  run(steps: number): T | undefined;
}

/** Runs a task to its end at once (tests, and work that is known to be short). */
export function finishTask<T>(task: Task<T>): T {
  for (;;) {
    const result = task.run(1_000_000);
    if (result !== undefined) return result;
  }
}

/** The first seed from `seed` on whose deal can be won; null if none of SOLITAIRE.dealTries seeds was won. */
export function winnableSeed(seed: number, draw: Draw): Task<number | null> {
  let tries = 1;
  let current = seed >>> 0;
  let solver: Solver = createSolver(deal(current, draw), draw);
  let used = 0;
  return {
    run(steps) {
      let left = steps;
      while (left > 0) {
        const before = solver.steps;
        const status = solver.run(Math.min(left, SOLITAIRE.solve.deal - used));
        const spent = Math.max(1, solver.steps - before);
        left -= spent;
        used += spent;
        if (status === 'won') return current;
        if (status === 'lost' || used >= SOLITAIRE.solve.deal) {
          if (tries >= SOLITAIRE.dealTries) return null;
          tries += 1;
          current = (current + 1) >>> 0;
          solver = createSolver(deal(current, draw), draw);
          used = 0;
        }
      }
      return undefined;
    },
  };
}

/** The seed the deal of the day starts from: the date and the way of turning the stock. */
export const dailySeed = (dateKey: string, draw: Draw): number => seedFromText(`way1ong-solitaire:daily:${draw}:${dateKey}`);
