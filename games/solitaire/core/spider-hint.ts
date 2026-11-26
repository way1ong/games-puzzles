// Spider's hint (docs/solitaire/SPEC.md, "Павук"): a move after which the deal can still be won, found by the solver from
// the position on the table (it knows every card); if it finds no way from here, how many moves to undo to a position
// from which it does; if it cannot decide in its time, the move it would try first. As Klondike's (hint.ts).
//
// A way, not a single move (found 26.11: a player who did only what the hint said went round in a circle in 6 deals of
// 20 with one suit). The way the search finds is the line it went down, and it can wander for thousands of moves before
// it reaches the end; its first move, found afresh at each position, need not lead anywhere, and the next one may lead
// back. So the way found is made straight (spider-solve.ts, straighten: 18 242 moves became 158) and kept: while the
// player does what the hints say, or undoes some of it, the next hint is the way's next move, without a search. A move
// given without a way found is not one back to where the game has just been. Pure.
import { SOLITAIRE } from '../config.ts';
import type { Task } from './deals.ts';
import { spiderSearch, type SearchResult } from './spider-search.ts';
import { createSpiderSolver, type SpiderMove } from './spider-solve.ts';
import { dealRow, moveRun, undoSpider, type Spider, type SpiderTable } from './spider.ts';

const RULES = SOLITAIRE.spider;

/** move / deal — a step of a way to the end; stuck — no way found, `back` moves to undo to one; unsure — no time. */
export type SpiderHint = SpiderMove | { kind: 'stuck'; back: number | null } | { kind: 'unsure'; move: SpiderMove | null };

/** A way to the end a hint found: the position it starts from and its moves, in order. */
export interface SpiderWay {
  from: Spider;
  moves: readonly SpiderMove[];
}

/** A hint and the way it is a step of (null — no way found). */
export interface SpiderHintFound {
  hint: SpiderHint;
  way: SpiderWay | null;
}

const sameTable = (a: SpiderTable, b: SpiderTable): boolean =>
  a.stock.length === b.stock.length &&
  a.home.length === b.home.length &&
  a.columns.every((col, i) => {
    const other = b.columns[i]!;
    return a.down[i] === b.down[i] && col.length === other.length && col.every((card, k) => card === other[k]);
  });

/** Which move of a way comes next, if the table stands at one of the way's positions before its end; else null. */
export function nextOnWay(way: SpiderWay, t: SpiderTable): number | null {
  let at: Spider = way.from;
  for (let k = 0; k < way.moves.length; k++) {
    if (sameTable(at, t)) return k;
    const m = way.moves[k]!;
    at = m.kind === 'deal' ? dealRow(at) : moveRun(at, m.from, m.index, m.to);
  }
  return null;
}

/** The hint for the position `g`; `way` — the way of the last hint, followed while the game stays on it. */
export function spiderHintSearch(g: Spider, way: SpiderWay | null = null): Task<SpiderHintFound> {
  const onWay = way ? nextOnWay(way, g) : null;
  if (way && onWay !== null) {
    const found: SpiderHintFound = { hint: way.moves[onWay]!, way };
    return { run: () => found };
  }
  const { hint, back, attempts } = RULES.solve;
  // Looking back: positions after undoing k moves; the fewest that can be won (they only get easier further back).
  const states: Spider[] = [g];
  const stateBack = (k: number): Spider => {
    while (states.length <= k) states.push(undoSpider(states[states.length - 1]!));
    return states[k]!;
  };
  // Where the game has just been: the positions since the last deal and the last run home (only those can come again).
  const past: Spider[] = [];
  for (let k = 1; k <= Math.min(RULES.lookBack, g.history.length); k++) {
    const s = stateBack(k);
    if (s.stock.length !== g.stock.length || s.home.length !== g.home.length) break;
    past.push(s);
  }
  let task: Task<SearchResult> = spiderSearch(g, g.suits, hint, attempts, past);
  let phase: 'here' | 'back' = 'here';
  let lo = 1;
  let hi = Math.min(RULES.lookBack, g.history.length);
  let best: number | null = null;
  let mid = 0;
  const probe = () => {
    mid = Math.floor((lo + hi) / 2);
    const s = stateBack(mid);
    task = spiderSearch(s, s.suits, back, 1);
  };
  const stuck = (n: number | null): SpiderHintFound => ({ hint: { kind: 'stuck', back: n }, way: null });

  return {
    run(steps) {
      const result = task.run(steps);
      if (result === undefined) return undefined;
      if (phase === 'here') {
        if (result.status === 'won') {
          const moves = createSpiderSolver(g, g.suits).straighten(result.path);
          return moves.length > 0 ? { hint: moves[0]!, way: { from: g, moves } } : stuck(null);
        }
        if (result.status === 'more') return { hint: { kind: 'unsure', move: result.first }, way: null };
        if (hi < lo) return stuck(null);
        phase = 'back';
        probe();
        return undefined;
      }
      if (result.status === 'won') {
        best = mid;
        hi = mid - 1;
      } else lo = mid + 1;
      if (lo > hi) return stuck(best);
      probe();
      return undefined;
    },
  };
}
