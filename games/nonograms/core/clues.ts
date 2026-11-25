// The numbers beside the rows and above the columns (docs/nonograms/SPEC.md, "Як грати"): the lengths of the runs of
// filled cells, in order. An empty line has none (shown as "0"). Lines are lists of cell indices, row after row.
// Pure, no DOM.

export type Clue = readonly number[];
export type Axis = 'row' | 'col';

export interface Clues {
  size: number;
  rows: Clue[];
  cols: Clue[];
}

/** The runs of filled cells in a line. */
export function clueOf(line: readonly boolean[]): number[] {
  const out: number[] = [];
  let run = 0;
  for (const filled of line) {
    if (filled) run++;
    else if (run) {
      out.push(run);
      run = 0;
    }
  }
  if (run) out.push(run);
  return out;
}

/** The cells of a row or a column, by their index in the grid (row after row). */
export function lineCells(size: number, axis: Axis, index: number): number[] {
  return Array.from({ length: size }, (_, k) => (axis === 'row' ? index * size + k : k * size + index));
}

/** Every line of the grid: the rows from the top, then the columns from the left. */
export function allLines(size: number): { axis: Axis; index: number; cells: number[] }[] {
  const out: { axis: Axis; index: number; cells: number[] }[] = [];
  for (const axis of ['row', 'col'] as const) for (let i = 0; i < size; i++) out.push({ axis, index: i, cells: lineCells(size, axis, i) });
  return out;
}

/** The numbers of a grid's answer. */
export function cluesOf(solution: readonly boolean[], size: number): Clues {
  const of = (axis: Axis) => Array.from({ length: size }, (_, i) => clueOf(lineCells(size, axis, i).map((c) => solution[c]!)));
  return { size, rows: of('row'), cols: of('col') };
}

/** The numbers of a line on the grid. */
export const clueAt = (clues: Clues, axis: Axis, index: number): Clue => (axis === 'row' ? clues.rows : clues.cols)[index]!;

/** How many cells the numbers fill in all. */
export const filledTotal = (clues: Clues): number => clues.rows.reduce((sum, clue) => sum + clue.reduce((a, b) => a + b, 0), 0);

/** Whether two clues are the same numbers. */
export const sameClue = (a: Clue, b: Clue): boolean => a.length === b.length && a.every((n, i) => n === b[i]);
