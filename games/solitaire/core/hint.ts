// The hint (docs/solitaire/SPEC.md, "Підказка, «Скасувати», «Зібрати все»"): a move after which the deal can still be
// won, found by the solver from the position on the table (it knows every card). If it finds no way from here, how
// many moves to undo to a position from which it does; if it cannot decide in its time, the move it would try first.
// In slices, like the solver. Pure.
import { SOLITAIRE } from '../config.ts';
import { suitOf } from './cards.ts';
import type { Task } from './deals.ts';
import { canFinish, undo, type Klondike, type Place } from './klondike.ts';
import { FOUNDATION, createSolver, type Solver, type SolverMove } from './solve.ts';

export type HintMove = { kind: 'move'; from: Place; index: number; to: Place } | { kind: 'draw' };

/**
 * move / draw — a step of a way to the end; finish — the rest goes home by itself ("Зібрати все"); stuck — no way
 * found from here, `back` moves to undo to one (null — none within SOLITAIRE.lookBack); unsure — the search ran out of
 * time, `move` is what it would try first.
 */
export type Hint = HintMove | { kind: 'finish' } | { kind: 'stuck'; back: number | null } | { kind: 'unsure'; move: HintMove | null };

const placeOf = (to: number, card: number): Place => (to === FOUNDATION ? { kind: 'foundation', suit: suitOf(card) } : { kind: 'column', index: to });

/** A solver's move as the player would make it: a stock card not yet on top means turning the stock. */
export function asHint(g: Klondike, m: SolverMove): HintMove {
  if (m.kind === 'talon') {
    if (m.p !== g.pos) return { kind: 'draw' };
    return { kind: 'move', from: { kind: 'waste' }, index: 0, to: placeOf(m.to, g.talon[g.pos - 1]!) };
  }
  return { kind: 'move', from: { kind: 'column', index: m.from }, index: m.index, to: placeOf(m.to, g.columns[m.from]![m.index]!) };
}

export function hintSearch(g: Klondike): Task<Hint> {
  if (canFinish(g)) return { run: () => ({ kind: 'finish' }) };
  let solver: Solver = createSolver(g, g.draw);
  let used = 0;
  let phase: 'here' | 'back' = 'here';
  // Looking back: positions after undoing k moves; the fewest that can be won (they only get easier further back).
  const states: Klondike[] = [g];
  const stateBack = (k: number): Klondike => {
    while (states.length <= k) states.push(undo(states[states.length - 1]!));
    return states[k]!;
  };
  let lo = 1;
  let hi = Math.min(SOLITAIRE.lookBack, g.history.length);
  let best: number | null = null;
  let mid = 0;
  const startProbe = () => {
    mid = Math.floor((lo + hi) / 2);
    const s = stateBack(mid);
    solver = createSolver(s, s.draw);
    used = 0;
  };

  return {
    run(steps) {
      let left = steps;
      while (left > 0) {
        const budget = phase === 'here' ? SOLITAIRE.solve.hint : SOLITAIRE.solve.back;
        const before = solver.steps;
        const status = solver.run(Math.min(left, budget - used));
        const spent = Math.max(1, solver.steps - before);
        left -= spent;
        used += spent;
        if (status === 'more' && used < budget) continue;
        if (phase === 'here') {
          if (status === 'won') {
            const first = solver.path()[0];
            return first ? asHint(g, first) : { kind: 'finish' };
          }
          if (status === 'more') {
            const first = solver.firstMove();
            return { kind: 'unsure', move: first ? asHint(g, first) : g.talon.length > 0 ? { kind: 'draw' } : null };
          }
          if (hi < lo) return { kind: 'stuck', back: null };
          phase = 'back';
          startProbe();
          continue;
        }
        if (status === 'won') {
          best = mid;
          hi = mid - 1;
        } else lo = mid + 1;
        if (lo > hi) return { kind: 'stuck', back: best };
        startProbe();
      }
      return undefined;
    },
  };
}
