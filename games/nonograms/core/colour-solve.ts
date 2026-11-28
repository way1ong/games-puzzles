// Solving a colour picture as a person does (docs/nonograms/SPEC.md, "Кольорові малюнки"), as solve.ts does for black
// and white: what the numbers of a line allow each cell, then what follows for the lines it crosses, and on, until
// nothing more follows. A picture belongs in the colour section when this leaves each cell one value: then it has one
// answer and never needs a guess. Pure, no DOM.
import { lineCells, type Axis } from './clues.ts';
import { colourClueAt, colourClueOf, colourCluesOf, paintsOf, sameColourClue, valuesOf, type ColourClue, type ColourClues } from './colour-clues.ts';
import { anyOf, bitOf, onlyValue, solveColourLine, type Can } from './colour-line.ts';
import type { Picture } from './picture.ts';

/** One step: a line and the cells its numbers narrowed (grid indices), each with what it may still be. */
export interface ColourDeduction {
  axis: Axis;
  index: number;
  cells: { cell: number; can: Can }[];
}

export interface ColourSolved {
  known: Can[];
  /** Every cell has one value left. */
  solved: boolean;
  /** The numbers cannot hold with what was given. */
  contradiction: boolean;
  /** The steps, in the order they were found. */
  steps: ColourDeduction[];
}

/** Line after line until nothing more follows; from what is known already, or from a grid where anything goes. */
export function solveColourGrid(clues: ColourClues, start?: readonly Can[]): ColourSolved {
  const { size, paints } = clues;
  const known: Can[] = start ? [...start] : new Array<Can>(size * size).fill(anyOf(paints.length));
  const steps: ColourDeduction[] = [];
  const queued = new Set<string>();
  const queue: { axis: Axis; index: number }[] = [];
  const push = (axis: Axis, index: number) => {
    const key = `${axis}${index}`;
    if (queued.has(key)) return;
    queued.add(key);
    queue.push({ axis, index });
  };
  for (const axis of ['row', 'col'] as const) for (let i = 0; i < size; i++) push(axis, i);
  while (queue.length) {
    const { axis, index } = queue.shift()!;
    queued.delete(`${axis}${index}`);
    const cells = lineCells(size, axis, index);
    const result = solveColourLine(colourClueAt(clues, axis, index), cells.map((c) => known[c]!), paints);
    if (!result) return { known, solved: false, contradiction: true, steps };
    const narrowed: { cell: number; can: Can }[] = [];
    result.forEach((can, i) => {
      const c = cells[i]!;
      if (can === known[c]) return;
      known[c] = can;
      narrowed.push({ cell: c, can });
      push(axis === 'row' ? 'col' : 'row', i); // the line across, through this cell
    });
    if (narrowed.length) steps.push({ axis, index, cells: narrowed });
  }
  return { known, solved: known.every((can) => onlyValue(can) !== null), contradiction: false, steps };
}

/** Whether a colour picture has one answer that line after line finds to the end — no guess needed. */
export function colourSolvableByLines(picture: Picture): boolean {
  const paints = paintsOf(picture);
  const values = valuesOf(picture, paints);
  const result = solveColourGrid(colourCluesOf(values, picture.size, paints));
  return result.solved && result.known.every((can, i) => can === bitOf(values[i]!));
}

/** Whether a line of values fits its numbers (its runs and their colours are exactly the numbers). */
export const fitsColourLine = (line: readonly number[], clue: ColourClue, paints: readonly string[]): boolean =>
  sameColourClue(colourClueOf(line, paints), clue);
