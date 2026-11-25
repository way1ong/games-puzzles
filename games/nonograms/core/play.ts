// The play of one picture (docs/nonograms/SPEC.md, "Керування"): the marks on the cells, strokes of a finger (a tap is
// a stroke over one cell), crosses that come by themselves in a finished line, "Undo", the time and the hints.
// Pure, no DOM.
import type { Size } from '../config.ts';
import { allLines, clueAt, filledTotal, lineCells, type Axis, type Clues } from './clues.ts';
import type { Picture } from './picture.ts';
import { fitsLine } from './solve.ts';

/** A cell as the player left it: untouched, filled, or crossed ("empty here"). */
export type Mark = 0 | 1 | 2;
export const BLANK = 0;
export const FILL = 1;
export const CROSS = 2;

/** What a tap puts: paint or crosses (the switch under the grid). */
export type Mode = 'fill' | 'cross';
/** What a second tap on a filled cell does (a setting): clears it, or puts a cross. */
export type SecondTap = 'clear' | 'cross';

/** One move to undo: the cells it changed and their marks before. */
export interface Step {
  cells: number[];
  before: Mark[];
}

export interface Play {
  id: string;
  size: Size;
  /** The day of a picture of the day; null — a picture of the album. */
  daily: string | null;
  marks: Mark[];
  history: Step[];
  hints: number;
  /** Time played, ms. */
  ms: number;
  done: boolean;
}

export interface StrokeOptions {
  mode: Mode;
  secondTap: SecondTap;
  /** Crosses in a line by themselves once its filled cells fit its numbers (a setting). */
  autoCross: boolean;
}

export function newPlay(picture: Picture, daily: string | null = null): Play {
  return { id: picture.id, size: picture.size, daily, marks: new Array<Mark>(picture.size * picture.size).fill(BLANK), history: [], hints: 0, ms: 0, done: false };
}

/** The mark a stroke puts, decided by the cell it starts on. */
export function targetOf(first: Mark, mode: Mode, secondTap: SecondTap): Mark {
  if (mode === 'cross') return first === CROSS ? BLANK : CROSS;
  if (first === BLANK) return FILL;
  if (first === FILL) return secondTap === 'cross' ? CROSS : BLANK;
  return BLANK;
}

/** Whether the filled cells of a line are exactly its numbers. */
export function lineFits(marks: readonly Mark[], clues: Clues, axis: Axis, index: number): boolean {
  return fitsLine(
    lineCells(clues.size, axis, index).map((c) => marks[c] === FILL),
    clueAt(clues, axis, index),
  );
}

/** Whether every line fits its numbers: the picture is solved (it has one answer). */
export const isSolved = (marks: readonly Mark[], clues: Clues): boolean => allLines(clues.size).every((l) => lineFits(marks, clues, l.axis, l.index));

/** The lines whose filled cells fit their numbers (their numbers fade), as "row3", "col0". */
export function fittingLines(marks: readonly Mark[], clues: Clues): Set<string> {
  return new Set(allLines(clues.size).filter((l) => lineFits(marks, clues, l.axis, l.index)).map((l) => `${l.axis}${l.index}`));
}

/** Cells against the answer: filled where it is empty, crossed where it is filled. */
export function mistakes(marks: readonly Mark[], solution: readonly boolean[]): number[] {
  const out: number[] = [];
  marks.forEach((m, c) => {
    if ((m === FILL && !solution[c]) || (m === CROSS && solution[c])) out.push(c);
  });
  return out;
}

/** As many filled cells as the numbers ask, yet not solved: somewhere is a mistake. */
export const fullButWrong = (play: Play, clues: Clues): boolean => !play.done && play.marks.filter((m) => m === FILL).length === filledTotal(clues);

/** Changes marks and records one step; crosses come by themselves in lines that now fit (when asked). */
function change(play: Play, clues: Clues, updates: ReadonlyMap<number, Mark>, autoCross: boolean): Play {
  const marks = [...play.marks];
  const before = new Map<number, Mark>();
  for (const [c, m] of updates) {
    if (marks[c] === m) continue;
    before.set(c, marks[c]!);
    marks[c] = m;
  }
  if (!before.size) return play;
  if (autoCross) {
    const size = clues.size;
    const lines = new Set<string>();
    for (const c of before.keys()) lines.add(`row:${Math.floor(c / size)}`).add(`col:${c % size}`);
    for (const key of lines) {
      const [axis, index] = key.split(':') as [Axis, string];
      if (!lineFits(marks, clues, axis, Number(index))) continue;
      for (const c of lineCells(size, axis, Number(index))) {
        if (marks[c] !== BLANK) continue;
        if (!before.has(c)) before.set(c, BLANK);
        marks[c] = CROSS;
      }
    }
  }
  return { ...play, marks, history: [...play.history, { cells: [...before.keys()], before: [...before.values()] }], done: isSolved(marks, clues) };
}

/** A stroke over cells (one cell for a tap): every cell with the first one's mark takes the new mark — one step. */
export function stroke(play: Play, clues: Clues, cells: readonly number[], options: StrokeOptions): Play {
  if (play.done || !cells.length) return play;
  const first = play.marks[cells[0]!]!;
  const to = targetOf(first, options.mode, options.secondTap);
  const updates = new Map<number, Mark>();
  for (const c of cells) if (play.marks[c] === first) updates.set(c, to);
  return change(play, clues, updates, options.autoCross);
}

/** Puts marks given by a hint: the cells to fill and to cross — one step, like a move. */
export function put(play: Play, clues: Clues, fill: readonly number[], cross: readonly number[], autoCross: boolean): Play {
  if (play.done) return play;
  const updates = new Map<number, Mark>();
  for (const c of fill) updates.set(c, FILL);
  for (const c of cross) updates.set(c, CROSS);
  return change(play, clues, updates, autoCross);
}

/** Takes the last step back (a whole stroke at once). */
export function undo(play: Play): Play {
  const last = play.history.at(-1);
  if (!last || play.done) return play;
  const marks = [...play.marks];
  last.cells.forEach((c, i) => (marks[c] = last.before[i]!));
  return { ...play, marks, history: play.history.slice(0, -1) };
}

export const countHint = (play: Play): Play => ({ ...play, hints: play.hints + 1 });

export const addTime = (play: Play, ms: number): Play => (play.done || ms <= 0 ? play : { ...play, ms: play.ms + ms });
