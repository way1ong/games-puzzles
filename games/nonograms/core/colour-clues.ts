// The numbers of a colour picture (docs/nonograms/SPEC.md, "Кольорові малюнки"): beside each row and above each column,
// its runs of cells of one colour, in order, each number with the colour of its run. Two runs of the same colour have
// at least one empty cell between them; runs of different colours may touch. A picture's paints are its colours, the
// one with the most cells first (C). Cells hold values: 0 — empty, 1 — the first paint, 2 — the second… Pure, no DOM.
import { allLines, lineCells, type Axis, type Clues } from './clues.ts';
import { EMPTY_PIXEL, pixelsOf, type Picture } from './picture.ts';

/** A run of cells of one colour: its colour (a letter of art/palette.ts) and how many cells. */
export interface Run {
  colour: string;
  length: number;
}

export type ColourClue = readonly Run[];

export interface ColourClues {
  size: number;
  /** The picture's paints: the value v of a cell is the paint paints[v - 1]. */
  paints: readonly string[];
  rows: ColourClue[];
  cols: ColourClue[];
}

/** An empty cell's value. */
export const NO_PAINT = 0;

/** The colours of a picture, the one with the most cells first (the same count: the one met first, row after row). */
export function paintsOf(picture: Picture): string[] {
  const count = new Map<string, number>();
  for (const p of pixelsOf(picture)) if (p !== EMPTY_PIXEL) count.set(p, (count.get(p) ?? 0) + 1);
  return [...count.keys()].sort((a, b) => count.get(b)! - count.get(a)!);
}

/** The answer, row after row: each cell's value (0 — empty, else its paint's place in `paints` from 1). */
export function valuesOf(picture: Picture, paints: readonly string[]): number[] {
  return pixelsOf(picture).map((p) => (p === EMPTY_PIXEL ? NO_PAINT : paints.indexOf(p) + 1));
}

/** The runs of a line of values: a new run where the colour changes or after an empty cell. */
export function colourClueOf(line: readonly number[], paints: readonly string[]): Run[] {
  const out: Run[] = [];
  let last = NO_PAINT;
  for (const v of line) {
    if (v !== NO_PAINT && v === last) out[out.length - 1]!.length++;
    else if (v !== NO_PAINT) out.push({ colour: paints[v - 1]!, length: 1 });
    last = v;
  }
  return out;
}

/** The numbers of a grid of values. */
export function colourCluesOf(values: readonly number[], size: number, paints: readonly string[]): ColourClues {
  const of = (axis: Axis) => Array.from({ length: size }, (_, i) => colourClueOf(lineCells(size, axis, i).map((c) => values[c]!), paints));
  return { size, paints, rows: of('row'), cols: of('col') };
}

/** The numbers of a picture, with its paints. */
export function colourCluesOfPicture(picture: Picture): ColourClues {
  const paints = paintsOf(picture);
  return colourCluesOf(valuesOf(picture, paints), picture.size, paints);
}

/** The numbers of a line on the grid. */
export const colourClueAt = (clues: ColourClues, axis: Axis, index: number): ColourClue => (axis === 'row' ? clues.rows : clues.cols)[index]!;

/** The lengths alone, as the numbers of a black-and-white grid read (the board's room for them). */
export const lengthsOf = (clues: ColourClues): Clues => ({
  size: clues.size,
  rows: clues.rows.map((clue) => clue.map((r) => r.length)),
  cols: clues.cols.map((clue) => clue.map((r) => r.length)),
});

/** How many cells the numbers paint in all. */
export const paintedTotal = (clues: ColourClues): number => clues.rows.reduce((sum, clue) => sum + clue.reduce((a, r) => a + r.length, 0), 0);

/** Whether two clues are the same runs. */
export const sameColourClue = (a: ColourClue, b: ColourClue): boolean =>
  a.length === b.length && a.every((r, i) => r.colour === b[i]!.colour && r.length === b[i]!.length);

/** Every line of the grid with its numbers: the rows from the top, then the columns from the left. */
export function colourLines(clues: ColourClues): { axis: Axis; index: number; cells: number[]; clue: ColourClue }[] {
  return allLines(clues.size).map((l) => ({ ...l, clue: colourClueAt(clues, l.axis, l.index) }));
}
