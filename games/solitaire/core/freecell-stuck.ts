// When FreeCell says, unasked, that no way to the end is left (docs/solitaire/SPEC.md, "Вільні клітинки"): the player is
// plainly stuck — no move at all is left (the free cells full, no empty column, no card fits anywhere), or the table has
// come back to a position it was in a moment ago (going round in circles). Only then is the hint's search asked,
// quietly; never just because a move was made. A verdict "no way" carries to every later position reached by moves
// (fewer moves cannot open a way the earlier position lacked), and the way back grows by them. Pure.
import { SOLITAIRE } from '../config.ts';
import { createFreeSolver } from './freecell-solve.ts';
import { sameFreeTable } from './freecell-hint.ts';
import { canFinish, undoFreeCell, type FreeCell } from './freecell.ts';

/** No move at all is left: the solver, which tries every move that changes anything, has none. */
export function noFreeMove(g: FreeCell, autoHome: boolean): boolean {
  return !g.done && !canFinish(g) && createFreeSolver(g, autoHome).firstMove() === null;
}

/** The table stands where it stood after an earlier move, with no card gone home since: the player goes round. */
export function cameBack(g: FreeCell): boolean {
  const home = g.foundations.reduce((a, b) => a + b, 0);
  let s = g;
  for (let k = 1; k <= Math.min(SOLITAIRE.freecell.lookBack, g.history.length); k++) {
    s = undoFreeCell(s);
    if (s.foundations.reduce((a, b) => a + b, 0) !== home) return false;
    if (sameFreeTable(s, g)) return true;
  }
  return false;
}

/** Whether to ask the solver now if the deal can still be won. */
export function freecellWorthChecking(g: FreeCell, autoHome: boolean): boolean {
  if (g.done || canFinish(g)) return false;
  return cameBack(g) || noFreeMove(g, autoHome);
}

/**
 * The verdict "no way to the end from here" found for one position, carried to a later one reached from it by moves
 * (not undone): the later position cannot be won either, and the way back grows by those moves. undefined — it does
 * not carry (a move was undone, or another deal).
 */
export function freeCarried(checked: FreeCell, back: number | null, now: FreeCell): number | null | undefined {
  const n = checked.history.length;
  if (now.seed !== checked.seed || now.history.length < n) return undefined;
  for (let k = 0; k < n; k++) if (now.history[k] !== checked.history[k]) return undefined;
  return back === null ? null : back + now.history.length - n;
}
