// A game: the puzzle, what the player has entered (digits and notes), undo and redo, hints asked and time
// played. Pure: every action returns a new game (or the same one when nothing changes); the screen shows it
// and saves it.
import type { Level } from '../config.ts';
import type { Puzzle } from './generate.ts';
import { CELLS, PEERS, SIZE, bit, candidatesOf, conflicts, parseGrid } from './grid.ts';
import type { Elimination } from './techniques.ts';

export interface CellState {
  digit: number;
  notes: number;
}

export interface Change {
  cell: number;
  from: CellState;
  to: CellState;
}

/** One undoable action: every cell it changed. */
export type Move = Change[];

export interface Game {
  level: Level;
  /** The day ("YYYY-MM-DD") of a daily puzzle; null — an ordinary game. */
  daily: string | null;
  seed: number;
  /** The open digits and the solution, one character a cell ('0' — empty). */
  givens: string;
  solution: string;
  /** Digits on the board, the open ones included (0 — empty). */
  digits: number[];
  /** Notes of every cell, as candidate masks. */
  notes: number[];
  undo: Move[];
  redo: Move[];
  /** Hints asked in this game. */
  hints: number;
  /** Time played, ms. */
  ms: number;
  solved: boolean;
}

export interface Options {
  /** Remove a placed digit from the notes of its row, column and box. */
  autoNotes: boolean;
}

export function newGame(puzzle: Puzzle, daily: string | null = null): Game {
  return {
    level: puzzle.level,
    daily,
    seed: puzzle.seed,
    givens: puzzle.givens,
    solution: puzzle.solution,
    digits: parseGrid(puzzle.givens),
    notes: new Array<number>(CELLS).fill(0),
    undo: [],
    redo: [],
    hints: 0,
    ms: 0,
    solved: false,
  };
}

export const isGiven = (game: Game, cell: number): boolean => game.givens[cell] !== '0';

const stateOf = (game: Game, cell: number): CellState => ({ digit: game.digits[cell]!, notes: game.notes[cell]! });

function apply(game: Game, move: Move, side: 'from' | 'to'): { digits: number[]; notes: number[] } {
  const digits = [...game.digits];
  const notes = [...game.notes];
  for (const change of move) {
    digits[change.cell] = change[side].digit;
    notes[change.cell] = change[side].notes;
  }
  return { digits, notes };
}

const solvedBy = (digits: readonly number[], solution: string): boolean => digits.every((d, cell) => String(d) === solution[cell]);

/** Makes the changes one undoable move (nothing changes — the same game). */
function commit(game: Game, changes: Map<number, CellState>): Game {
  const move: Move = [];
  for (const [cell, to] of changes) {
    const from = stateOf(game, cell);
    if (from.digit !== to.digit || from.notes !== to.notes) move.push({ cell, from, to });
  }
  if (!move.length) return game;
  const next = apply(game, move, 'to');
  return { ...game, ...next, undo: [...game.undo, move], redo: [], solved: solvedBy(next.digits, game.solution) };
}

/** Puts a digit in a cell (not in an open one); its notes go; with autoNotes — also from the notes it sees. */
export function placeDigit(game: Game, cell: number, digit: number, options: Options): Game {
  if (game.solved || isGiven(game, cell) || game.digits[cell] === digit) return game;
  const changes = new Map<number, CellState>([[cell, { digit, notes: 0 }]]);
  if (options.autoNotes) {
    for (const peer of PEERS[cell]!) {
      if (game.notes[peer]! & bit(digit)) changes.set(peer, { digit: game.digits[peer]!, notes: game.notes[peer]! & ~bit(digit) });
    }
  }
  return commit(game, changes);
}

/** Empties a cell: its digit, or else its notes. Open digits stay. */
export function clearCell(game: Game, cell: number): Game {
  if (game.solved || isGiven(game, cell)) return game;
  const { digit, notes } = stateOf(game, cell);
  if (digit) return commit(game, new Map([[cell, { digit: 0, notes }]]));
  return commit(game, new Map([[cell, { digit: 0, notes: 0 }]]));
}

/** Adds or removes a note in an empty cell. */
export function toggleNote(game: Game, cell: number, digit: number): Game {
  if (game.solved || game.digits[cell]) return game;
  return commit(game, new Map([[cell, { digit: 0, notes: game.notes[cell]! ^ bit(digit) }]]));
}

/**
 * Notes in every empty cell: a cell without notes gets all digits still possible there; a cell with notes keeps
 * the player's own choice, without the digits its row, column or box already holds.
 */
export function fillNotes(game: Game): Game {
  if (game.solved) return game;
  const possible = candidatesOf(game.digits);
  const changes = new Map<number, CellState>();
  for (let cell = 0; cell < CELLS; cell++) {
    if (game.digits[cell]) continue;
    const notes = game.notes[cell] ? game.notes[cell]! & possible[cell]! : possible[cell]!;
    changes.set(cell, { digit: 0, notes });
  }
  return commit(game, changes);
}

/** Counts a hint asked. */
export function askHint(game: Game): Game {
  return game.solved ? game : { ...game, hints: game.hints + 1 };
}

/** A hint's last step: the removals it explained leave the notes, and its digit is placed — one move. */
export function applyHint(game: Game, removals: readonly Elimination[], cell: number, digit: number, options: Options): Game {
  if (game.solved || isGiven(game, cell)) return game;
  const notes = [...game.notes];
  for (const r of removals) notes[r.cell] = notes[r.cell]! & ~r.mask;
  const changes = new Map<number, CellState>();
  for (let c = 0; c < CELLS; c++) if (notes[c] !== game.notes[c]) changes.set(c, { digit: game.digits[c]!, notes: notes[c]! });
  changes.set(cell, { digit, notes: 0 });
  if (options.autoNotes) {
    for (const peer of PEERS[cell]!) {
      const current = changes.get(peer)?.notes ?? notes[peer]!;
      if (current & bit(digit)) changes.set(peer, { digit: game.digits[peer]!, notes: current & ~bit(digit) });
    }
  }
  return commit(game, changes);
}

/** Empties the cells with wrong digits — one move. */
export function eraseCells(game: Game, cells: readonly number[]): Game {
  if (game.solved) return game;
  return commit(game, new Map(cells.filter((c) => !isGiven(game, c)).map((c) => [c, { digit: 0, notes: 0 }])));
}

export function undo(game: Game): Game {
  const move = game.undo.at(-1);
  if (game.solved || !move) return game;
  return { ...game, ...apply(game, move, 'from'), undo: game.undo.slice(0, -1), redo: [...game.redo, move] };
}

export function redo(game: Game): Game {
  const move = game.redo.at(-1);
  if (game.solved || !move) return game;
  const next = apply(game, move, 'to');
  return { ...game, ...next, undo: [...game.undo, move], redo: game.redo.slice(0, -1), solved: solvedBy(next.digits, game.solution) };
}

export function addTime(game: Game, ms: number): Game {
  return game.solved || ms <= 0 ? game : { ...game, ms: game.ms + ms };
}

/** Cells whose digit is not the solution's. */
export function wrongCells(game: Game): number[] {
  return game.digits.flatMap((d, cell) => (d && String(d) !== game.solution[cell] ? [cell] : []));
}

/** Cells whose digit repeats in a row, column or box. */
export function repeatedCells(game: Game): number[] {
  return [...conflicts(game.digits)].sort((a, b) => a - b);
}

export const isFull = (game: Game): boolean => game.digits.every((d) => d > 0);

/** How many of each digit are still to place (index 0 — the digit 1); never below zero. */
export function remaining(game: Game): number[] {
  const left = new Array<number>(SIZE).fill(SIZE);
  for (const d of game.digits) if (d) left[d - 1] = Math.max(0, left[d - 1]! - 1);
  return left;
}

/** How many cells are filled, the open ones included. */
export const filledCount = (game: Game): number => game.digits.filter((d) => d > 0).length;
