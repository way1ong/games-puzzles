// FreeCell's hint (docs/solitaire/SPEC.md, "Вільні клітинки"): the next move of a way to the end, found by the solver
// from the position on the table; "Зібрати все" when the rest goes home card by card; if no way is found from here, how
// many moves to undo to a position from which one is; if the search cannot decide in its time, the move it would try
// first, not one back to where the game has just been. As in Spider (spider-hint.ts), the way found is made straight
// and kept: while the player follows it, or undoes some of it, the next hint is its next move, without a search. Pure.
import { SOLITAIRE } from '../config.ts';
import type { Task } from './deals.ts';
import { createFreeSolver, type FreeMove, type FreeSolver } from './freecell-solve.ts';
import { canFinish, moveCards, undoFreeCell, type FreeCell, type FreeTable } from './freecell.ts';

const RULES = SOLITAIRE.freecell;

/**
 * move — a step of a way to the end; finish — the rest goes home card by card ("Зібрати все"); stuck — no way found
 * from here, `back` moves to undo to one (null — none within RULES.lookBack); unsure — the search ran out of time.
 */
export type FreeHint = ({ kind: 'move' } & FreeMove) | { kind: 'finish' } | { kind: 'stuck'; back: number | null } | { kind: 'unsure'; move: FreeMove | null };

/** A way to the end a hint found: the position it starts from, its moves in order, and how the cards went home on it. */
export interface FreeWay {
  from: FreeCell;
  moves: readonly FreeMove[];
  autoHome: boolean;
}

export interface FreeHintFound {
  hint: FreeHint;
  way: FreeWay | null;
}

/** Two tables alike: every card where it was, the order of the columns and of the cells too. */
export function sameFreeTable(a: FreeTable, b: FreeTable): boolean {
  return (
    a.foundations.every((f, s) => f === b.foundations[s]) &&
    a.cells.length === b.cells.length &&
    a.cells.every((c, i) => c === b.cells[i]) &&
    a.columns.every((col, i) => {
      const other = b.columns[i]!;
      return col.length === other.length && col.every((card, k) => card === other[k]);
    })
  );
}

/** Which move of a way comes next, if the table stands at one of the way's positions before its end; else null. */
export function nextOnFreeWay(way: FreeWay, t: FreeTable, autoHome: boolean): number | null {
  if (way.autoHome !== autoHome) return null;
  let at: FreeCell = way.from;
  for (let k = 0; k < way.moves.length; k++) {
    if (sameFreeTable(at, t)) return k;
    const m = way.moves[k]!;
    const next = moveCards(at, m.from, m.index, m.to, autoHome);
    if (next === at) return null;
    at = next;
  }
  return null;
}

const asHint = (m: FreeMove): FreeHint => ({ kind: 'move', ...m });

/** The hint for the position `g`; `way` — the way of the last hint, followed while the game stays on it. */
export function freecellHintSearch(g: FreeCell, autoHome: boolean, way: FreeWay | null = null): Task<FreeHintFound> {
  if (canFinish(g)) {
    const found: FreeHintFound = { hint: { kind: 'finish' }, way: null };
    return { run: () => found };
  }
  const onWay = way ? nextOnFreeWay(way, g, autoHome) : null;
  if (way && onWay !== null) {
    const found: FreeHintFound = { hint: asHint(way.moves[onWay]!), way };
    return { run: () => found };
  }
  // Looking back: positions after undoing k moves; the fewest that can be won (they only get easier further back).
  const states: FreeCell[] = [g];
  const stateBack = (k: number): FreeCell => {
    while (states.length <= k) states.push(undoFreeCell(states[states.length - 1]!));
    return states[k]!;
  };
  // Where the game has just been: the positions since a card last went home (only those can come again).
  const homeCount = (t: FreeTable) => t.foundations.reduce((a, b) => a + b, 0);
  const past: FreeCell[] = [];
  for (let k = 1; k <= Math.min(RULES.lookBack, g.history.length); k++) {
    const s = stateBack(k);
    if (homeCount(s) !== homeCount(g)) break;
    past.push(s);
  }
  let solver: FreeSolver = createFreeSolver(g, autoHome, past);
  let used = 0;
  let phase: 'here' | 'back' = 'here';
  let lo = 1;
  let hi = Math.min(RULES.lookBack, g.history.length);
  let best: number | null = null;
  let mid = 0;
  const probe = () => {
    mid = Math.floor((lo + hi) / 2);
    solver = createFreeSolver(stateBack(mid), autoHome);
    used = 0;
  };
  const stuck = (n: number | null): FreeHintFound => ({ hint: { kind: 'stuck', back: n }, way: null });

  return {
    run(steps) {
      let left = steps;
      while (left > 0) {
        const budget = phase === 'here' ? RULES.solve.hint : RULES.solve.back;
        const before = solver.steps;
        const status = solver.run(Math.min(left, budget - used));
        const spent = Math.max(1, solver.steps - before);
        left -= spent;
        used += spent;
        if (status === 'more' && used < budget) continue;
        if (phase === 'here') {
          if (status === 'won') {
            const moves = createFreeSolver(g, autoHome).straighten(solver.path());
            return moves.length > 0 ? { hint: asHint(moves[0]!), way: { from: g, moves, autoHome } } : stuck(null);
          }
          if (status === 'more') return { hint: { kind: 'unsure', move: solver.firstMove() }, way: null };
          if (hi < lo) return stuck(null);
          phase = 'back';
          probe();
          continue;
        }
        if (status === 'won') {
          best = mid;
          hi = mid - 1;
        } else lo = mid + 1;
        if (lo > hi) return stuck(best);
        probe();
      }
      return undefined;
    },
  };
}
