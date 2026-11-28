// FreeCell's deals (docs/solitaire/SPEC.md, "Вільні клітинки"): from a seed on, the first deal the solver wins within
// its budget; the deal of the day from the date and the number of free cells, the same for everybody. In slices. Pure.
import { seedFromText } from '../../../shared/core/rng.ts';
import { SOLITAIRE, type FreeCells } from '../config.ts';
import type { Task } from './deals.ts';
import { createFreeSolver, type FreeSolver } from './freecell-solve.ts';
import { freecellDeal } from './freecell.ts';

const RULES = SOLITAIRE.freecell;

/**
 * The first seed from `seed` on whose deal can be won; null if none of RULES.dealTries seeds was won. The cards no
 * longer needed going home by themselves or not does not change whether a deal can be won (they are never needed).
 */
export function freecellWinnableSeed(seed: number, cells: FreeCells): Task<number | null> {
  let tries = 1;
  let current = seed >>> 0;
  let solver: FreeSolver = createFreeSolver(freecellDeal(current, cells), true);
  let used = 0;
  return {
    run(steps) {
      let left = steps;
      while (left > 0) {
        const before = solver.steps;
        const status = solver.run(Math.min(left, RULES.solve.deal - used));
        const spent = Math.max(1, solver.steps - before);
        left -= spent;
        used += spent;
        if (status === 'won') return current;
        if (status === 'lost' || used >= RULES.solve.deal) {
          if (tries >= RULES.dealTries) return null;
          tries += 1;
          current = (current + 1) >>> 0;
          solver = createFreeSolver(freecellDeal(current, cells), true);
          used = 0;
        }
      }
      return undefined;
    },
  };
}

/** The seed the deal of the day starts from: the date and the number of free cells. */
export const freecellDailySeed = (dateKey: string, cells: FreeCells): number => seedFromText(`way1ong-solitaire:freecell:${cells}:${dateKey}`);
