// The hint (docs/mines/SPEC.md, "Керування"): wrong flags first; otherwise the simplest step the open numbers allow
// now — which cells are safe or hold mines, and on what numbers that rests; doing it opens the safe cells and flags
// the mines. A field the game makes always has such a step (core/make.ts); should the reasoning stop at its limits,
// the hint names a safe cell next to the open part without a reason. Pure.
import type { Field } from './field.ts';
import { mineMap, neighbourTable, numbers } from './field.ts';
import { CLOSED_CELL, FLAG, OPEN, openCell, toggleFlag, type MinesPlay } from './play.ts';
import { CLOSED, MINE, nextStep, type Deduction, type Knowledge } from './solve.ts';

export type MinesHint =
  /** Flags on cells without a mine. */
  | { kind: 'wrongFlags'; cells: number[] }
  /** A step of reasoning; `left` — the mines not yet flagged (what a step with the count of mines speaks of). */
  | { kind: 'step'; step: Deduction; left: number }
  /** Only where it is safe (the reasoning stopped at its limits). */
  | { kind: 'safe'; cell: number }
  /** The player is to choose the first place: anywhere is safe. */
  | { kind: 'choose' };

/** What the player knows: the open numbers and the flags (by now all of them right). */
export function knowledgeOf(play: MinesPlay, field: Field): Knowledge {
  const nums = numbers(field);
  const cells = new Int8Array(play.cells.length);
  for (let cell = 0; cell < cells.length; cell++) {
    const c = play.cells[cell];
    cells[cell] = c === OPEN ? nums[cell]! : c === FLAG ? MINE : CLOSED;
  }
  return { width: field.width, height: field.height, mines: field.mines.length, cells };
}

export function findHint(play: MinesPlay): MinesHint | null {
  const field = play.field;
  if (!field) return { kind: 'choose' };
  if (play.done || play.boom !== null) return null;
  const mine = mineMap(field);
  const wrong: number[] = [];
  for (let cell = 0; cell < play.cells.length; cell++) if (play.cells[cell] === FLAG && !mine[cell]) wrong.push(cell);
  if (wrong.length > 0) return { kind: 'wrongFlags', cells: wrong };
  const step = nextStep(knowledgeOf(play, field), 'all');
  if (step) return { kind: 'step', step, left: field.mines.length - [...play.cells].filter((c) => c === FLAG).length };
  // the reasoning stopped at its limits: a safe closed cell, next to the open part if there is one
  const table = neighbourTable(field);
  let fallback = -1;
  for (let cell = 0; cell < play.cells.length; cell++) {
    if (play.cells[cell] !== CLOSED_CELL || mine[cell]) continue;
    if (table[cell]!.some((o) => play.cells[o] === OPEN)) return { kind: 'safe', cell };
    if (fallback < 0) fallback = cell;
  }
  return fallback >= 0 ? { kind: 'safe', cell: fallback } : null;
}

/** Doing what the hint says: wrong flags off; safe cells open, mines flagged. */
export function applyHint(play: MinesPlay, hint: MinesHint): MinesPlay {
  let next = play;
  if (hint.kind === 'wrongFlags') {
    for (const cell of hint.cells) if (next.cells[cell] === FLAG) next = toggleFlag(next, cell);
  } else if (hint.kind === 'step') {
    for (const cell of hint.step.mines) if (next.cells[cell] === CLOSED_CELL) next = toggleFlag(next, cell);
    for (const cell of hint.step.safe) next = openCell(next, cell);
  } else if (hint.kind === 'safe') {
    next = openCell(next, hint.cell);
  }
  return next;
}
