// When the game says, unasked, that the deal can no longer be won (docs/solitaire/SPEC.md, "Коли ходів більше
// немає"; decision of 25.11). The solver — the hint's search, which knows every card — is asked only when the player
// is plainly stuck: no move that leads anywhere is left (nothing goes home, no stock card fits anywhere, no face-down
// card can be turned up), or the stock has been turned over SOLITAIRE.circles times with nothing changed. Never just
// because a move was made: that would give the face-down cards away. Pure.
import { SOLITAIRE } from '../config.ts';
import { canFinish, type Klondike } from './klondike.ts';
import { createSolver } from './solve.ts';

/** No move that leads anywhere: the solver, which tries every such move, has none to try. */
export function noUsefulMove(g: Klondike): boolean {
  return !g.done && !canFinish(g) && createSolver(g, g.draw).firstMove() === null;
}

/** Times the stock has been turned over since anything changed: a card off the waste, a card home, a face-down card turned up. */
export function turnsWithoutChange(g: Klondike): number {
  let turns = 0;
  for (let k = g.history.length - 1; k >= 0; k--) {
    const step = g.history[k]!;
    if (step.kind === 'draw') {
      // the stock was empty and the waste went back into it (no card has left the waste since, so the talon is as now)
      if (step.pos === g.talon.length) turns += 1;
    } else if (step.from.kind === 'waste' || step.to.kind === 'foundation' || step.flipped) return turns;
  }
  return turns;
}

/** Whether the last step turned the waste back into the stock. */
function justTurnedOver(g: Klondike): boolean {
  const last = g.history[g.history.length - 1];
  return last?.kind === 'draw' && last.pos === g.talon.length;
}

/**
 * Whether to ask the solver now if the deal can still be won: no useful move is left, or the stock has just been
 * turned over the SOLITAIRE.circles-th time (or more) with nothing changed — once a round, not at every card.
 */
export function worthChecking(g: Klondike): boolean {
  if (g.done || canFinish(g)) return false;
  if (justTurnedOver(g) && turnsWithoutChange(g) >= SOLITAIRE.circles) return true;
  return noUsefulMove(g);
}

/**
 * The verdict "no way to the end from here" found for one position, carried to a later one reached from it by turning
 * the stock only. Turning keeps every stock card within reach as before (or fewer of them, three a turn), so the later
 * position cannot be won either, and the way back grows by the turns. undefined — the verdict does not carry.
 */
export function carriedBack(checked: Klondike, back: number | null, now: Klondike): number | null | undefined {
  const n = checked.history.length;
  if (now.history.length < n) return undefined;
  for (let k = 0; k < n; k++) if (now.history[k] !== checked.history[k]) return undefined;
  for (let k = n; k < now.history.length; k++) if (now.history[k]!.kind !== 'draw') return undefined;
  return back === null ? null : back + now.history.length - n;
}
