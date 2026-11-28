// The play of a colour picture (docs/nonograms/SPEC.md, "Кольорові малюнки"), as play.ts is for black and white: the
// marks on the cells — blank, a cross, or one of the picture's paints — strokes of a finger with the chosen paint or the
// cross (a tap is a stroke over one cell), crosses that come by themselves in a finished line, "Undo", the time and the
// hints. A picture is solved when every line's runs and their colours are its numbers. Pure, no DOM.
import type { Size } from '../config.ts';
import { lineCells, type Axis } from './clues.ts';
import { NO_PAINT, colourClueAt, colourLines, paintedTotal, type ColourClues } from './colour-clues.ts';
import { fitsColourLine } from './colour-solve.ts';
import type { Picture } from './picture.ts';
import type { SecondTap } from './play.ts';

/** A cell as the player left it: untouched, crossed ("empty here"), or painted — 1 the first paint, 2 the second… */
export type ColourMark = number;
export const BLANK = 0;
export const CROSS = -1;

/** What a tap puts: a paint (1, 2…) or crosses (`CROSS`). */
export type Tool = number;

/** One move to undo: the cells it changed and their marks before. */
export interface ColourStep {
  cells: number[];
  before: ColourMark[];
}

export interface ColourPlay {
  id: string;
  size: Size;
  marks: ColourMark[];
  history: ColourStep[];
  hints: number;
  /** Time played, ms. */
  ms: number;
  done: boolean;
}

export interface ColourStrokeOptions {
  tool: Tool;
  secondTap: SecondTap;
  /** Crosses in a line by themselves once its painted cells fit its numbers (a setting). */
  autoCross: boolean;
}

export function newColourPlay(picture: Picture): ColourPlay {
  return { id: picture.id, size: picture.size, marks: new Array<ColourMark>(picture.size * picture.size).fill(BLANK), history: [], hints: 0, ms: 0, done: false };
}

/**
 * The mark a stroke puts, decided by the cell it starts on: with a paint, a blank cell takes it, a cell of that paint
 * clears (or takes a cross — the second-tap setting), a cell of another paint takes this one, a cross clears; with the
 * cross, a cross clears and anything else takes a cross.
 */
export function colourTargetOf(first: ColourMark, tool: Tool, secondTap: SecondTap): ColourMark {
  if (tool === CROSS) return first === CROSS ? BLANK : CROSS;
  if (first === BLANK) return tool;
  if (first === tool) return secondTap === 'cross' ? CROSS : BLANK;
  if (first === CROSS) return BLANK;
  return tool;
}

/** The values the marks of a line give: a paint, or nothing (blank and crossed cells alike). */
const valuesOfMarks = (marks: readonly ColourMark[], cells: readonly number[]): number[] => cells.map((c) => Math.max(NO_PAINT, marks[c]!));

/** Whether the painted cells of a line are exactly its numbers, colours too. */
export function colourLineFits(marks: readonly ColourMark[], clues: ColourClues, axis: Axis, index: number): boolean {
  return fitsColourLine(valuesOfMarks(marks, lineCells(clues.size, axis, index)), colourClueAt(clues, axis, index), clues.paints);
}

/** Whether every line fits its numbers: the picture is solved. */
export const colourSolved = (marks: readonly ColourMark[], clues: ColourClues): boolean => colourLines(clues).every((l) => colourLineFits(marks, clues, l.axis, l.index));

/** The lines whose painted cells fit their numbers (their numbers fade), as "row3", "col0". */
export function colourFittingLines(marks: readonly ColourMark[], clues: ColourClues): Set<string> {
  return new Set(colourLines(clues).filter((l) => colourLineFits(marks, clues, l.axis, l.index)).map((l) => `${l.axis}${l.index}`));
}

/** Cells against the answer (its values, colour-clues.ts): painted another colour, painted where it is empty, crossed where it is painted. */
export function colourMistakes(marks: readonly ColourMark[], values: readonly number[]): number[] {
  const out: number[] = [];
  marks.forEach((m, c) => {
    if ((m > BLANK && m !== values[c]) || (m === CROSS && values[c] !== NO_PAINT)) out.push(c);
  });
  return out;
}

/** As many painted cells as the numbers ask, yet not solved: somewhere is a mistake. */
export const colourFullButWrong = (play: ColourPlay, clues: ColourClues): boolean => !play.done && play.marks.filter((m) => m > BLANK).length === paintedTotal(clues);

/** Changes marks and records one step; crosses come by themselves in lines that now fit (when asked). */
function change(play: ColourPlay, clues: ColourClues, updates: ReadonlyMap<number, ColourMark>, autoCross: boolean): ColourPlay {
  const marks = [...play.marks];
  const before = new Map<number, ColourMark>();
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
      if (!colourLineFits(marks, clues, axis, Number(index))) continue;
      for (const c of lineCells(size, axis, Number(index))) {
        if (marks[c] !== BLANK) continue;
        if (!before.has(c)) before.set(c, BLANK);
        marks[c] = CROSS;
      }
    }
  }
  return { ...play, marks, history: [...play.history, { cells: [...before.keys()], before: [...before.values()] }], done: colourSolved(marks, clues) };
}

/** A stroke over cells (one cell for a tap): every cell with the first one's mark takes the new mark — one step. */
export function colourStroke(play: ColourPlay, clues: ColourClues, cells: readonly number[], options: ColourStrokeOptions): ColourPlay {
  if (play.done || !cells.length) return play;
  const first = play.marks[cells[0]!]!;
  const to = colourTargetOf(first, options.tool, options.secondTap);
  const updates = new Map<number, ColourMark>();
  for (const c of cells) if (play.marks[c] === first) updates.set(c, to);
  return change(play, clues, updates, options.autoCross);
}

/** Puts marks given by a hint: cells with their paints, and crosses — one step, like a move. */
export function colourPut(play: ColourPlay, clues: ColourClues, paint: readonly { cell: number; paint: number }[], cross: readonly number[], autoCross: boolean): ColourPlay {
  if (play.done) return play;
  const updates = new Map<number, ColourMark>();
  for (const p of paint) updates.set(p.cell, p.paint);
  for (const c of cross) updates.set(c, CROSS);
  return change(play, clues, updates, autoCross);
}

/** Clears cells (the Backspace key): painted and crossed alike — one step, like a move. */
export function colourClear(play: ColourPlay, clues: ColourClues, cells: readonly number[], autoCross: boolean): ColourPlay {
  if (play.done) return play;
  return change(play, clues, new Map(cells.map((c) => [c, BLANK] as const)), autoCross);
}

/** Takes the last step back (a whole stroke at once). */
export function colourUndo(play: ColourPlay): ColourPlay {
  const last = play.history.at(-1);
  if (!last || play.done) return play;
  const marks = [...play.marks];
  last.cells.forEach((c, i) => (marks[c] = last.before[i]!));
  return { ...play, marks, history: play.history.slice(0, -1) };
}

export const colourCountHint = (play: ColourPlay): ColourPlay => ({ ...play, hints: play.hints + 1 });

export const colourAddTime = (play: ColourPlay, ms: number): ColourPlay => (play.done || ms <= 0 ? play : { ...play, ms: play.ms + ms });
