// A Spider search in several attempts (docs/solitaire/SPEC.md, "Павук"): the solver goes depth first, and once it has
// gone deep down a wrong way it may not come back within its budget; so the budget is split between searches, each
// along another order of equally good moves (spider-solve.ts, `attempt`). One that has looked at every position it
// can reach and found no way settles it: no way. In slices. Pure.
import type { SpiderSuits } from '../config.ts';
import type { Task } from './deals.ts';
import { createSpiderSolver, type SpiderMove, type SpiderSolver } from './spider-solve.ts';
import type { SpiderTable } from './spider.ts';

export type SearchResult = { status: 'won'; path: SpiderMove[] } | { status: 'lost' } | { status: 'more'; first: SpiderMove | null };

/** Searches `attempts` times, each looking at no more than `perAttempt` positions. */
export function spiderSearch(table: SpiderTable, suits: SpiderSuits, perAttempt: number, attempts: number): Task<SearchResult> {
  let attempt = 0;
  let solver: SpiderSolver = createSpiderSolver(table, suits, 0);
  const first = solver.firstMove();
  let used = 0;
  return {
    run(steps) {
      let left = steps;
      while (left > 0) {
        const before = solver.steps;
        const status = solver.run(Math.min(left, perAttempt - used));
        const spent = Math.max(1, solver.steps - before);
        left -= spent;
        used += spent;
        if (status === 'won') return { status: 'won', path: solver.path() };
        if (status === 'lost') return { status: 'lost' };
        if (used >= perAttempt) {
          attempt += 1;
          if (attempt >= attempts) return { status: 'more', first };
          solver = createSpiderSolver(table, suits, attempt);
          used = 0;
        }
      }
      return undefined;
    },
  };
}
