// Spider's hint (docs/solitaire/SPEC.md, "Павук"): a move after which the deal can still be won, found by the solver from
// the position on the table (it knows every card); if it finds no way from here, how many moves to undo to a position
// from which it does; if it cannot decide in its time, the move it would try first. As Klondike's (hint.ts). Pure.
import { SOLITAIRE } from '../config.ts';
import type { Task } from './deals.ts';
import { spiderSearch, type SearchResult } from './spider-search.ts';
import type { SpiderMove } from './spider-solve.ts';
import { undoSpider, type Spider } from './spider.ts';

const RULES = SOLITAIRE.spider;

/** move / deal — a step of a way to the end; stuck — no way found, `back` moves to undo to one; unsure — no time. */
export type SpiderHint = SpiderMove | { kind: 'stuck'; back: number | null } | { kind: 'unsure'; move: SpiderMove | null };

export function spiderHintSearch(g: Spider): Task<SpiderHint> {
  const { hint, back, attempts } = RULES.solve;
  let task: Task<SearchResult> = spiderSearch(g, g.suits, hint, attempts);
  let phase: 'here' | 'back' = 'here';
  // Looking back: positions after undoing k moves; the fewest that can be won (they only get easier further back).
  const states: Spider[] = [g];
  const stateBack = (k: number): Spider => {
    while (states.length <= k) states.push(undoSpider(states[states.length - 1]!));
    return states[k]!;
  };
  let lo = 1;
  let hi = Math.min(RULES.lookBack, g.history.length);
  let best: number | null = null;
  let mid = 0;
  const probe = () => {
    mid = Math.floor((lo + hi) / 2);
    const s = stateBack(mid);
    task = spiderSearch(s, s.suits, back, 1);
  };

  return {
    run(steps) {
      const result = task.run(steps);
      if (result === undefined) return undefined;
      if (phase === 'here') {
        if (result.status === 'won') return result.path[0] ?? { kind: 'stuck', back: null };
        if (result.status === 'more') return { kind: 'unsure', move: result.first };
        if (hi < lo) return { kind: 'stuck', back: null };
        phase = 'back';
        probe();
        return undefined;
      }
      if (result.status === 'won') {
        best = mid;
        hi = mid - 1;
      } else lo = mid + 1;
      if (lo > hi) return { kind: 'stuck', back: best };
      probe();
      return undefined;
    },
  };
}
