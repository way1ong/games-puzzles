// Solving a whole picture as a person does (docs/nonograms/SPEC.md, "Без вгадування"): what the numbers of a line
// force, then what follows for the lines it crosses, and on, until nothing more follows. A picture belongs in the game
// when this fills every cell: then it has one answer and never needs a guess. Pure, no DOM.
import { allLines, clueAt, clueOf, cluesOf, lineCells, type Axis, type Clues } from './clues.ts';
import { FILLED, UNKNOWN, solveLine, type Know } from './line.ts';
import { solutionOf, type Picture } from './picture.ts';

/** One step: a line and the cells its numbers decided (grid indices). */
export interface Deduction {
  axis: Axis;
  index: number;
  filled: number[];
  emptied: number[];
}

export interface Solved {
  known: Know[];
  /** Every cell is known. */
  solved: boolean;
  /** The numbers cannot hold with what was given. */
  contradiction: boolean;
  /** The steps, in the order they were found. */
  steps: Deduction[];
}

/** Line after line until nothing more follows; from what is known already, or from an empty grid. */
export function solveGrid(clues: Clues, start?: readonly Know[]): Solved {
  const size = clues.size;
  const known: Know[] = start ? [...start] : new Array<Know>(size * size).fill(UNKNOWN);
  const steps: Deduction[] = [];
  const queued = new Set<string>();
  const queue: { axis: Axis; index: number }[] = [];
  const push = (axis: Axis, index: number) => {
    const key = `${axis}${index}`;
    if (queued.has(key)) return;
    queued.add(key);
    queue.push({ axis, index });
  };
  for (const line of allLines(size)) push(line.axis, line.index);
  while (queue.length) {
    const { axis, index } = queue.shift()!;
    queued.delete(`${axis}${index}`);
    const cells = lineCells(size, axis, index);
    const result = solveLine(clueAt(clues, axis, index), cells.map((c) => known[c]!));
    if (!result) return { known, solved: false, contradiction: true, steps };
    const filled: number[] = [];
    const emptied: number[] = [];
    result.forEach((k, i) => {
      const c = cells[i]!;
      if (known[c] !== UNKNOWN || k === UNKNOWN) return;
      known[c] = k;
      (k === FILLED ? filled : emptied).push(c);
      push(axis === 'row' ? 'col' : 'row', i); // the line across, through this cell
    });
    if (filled.length || emptied.length) steps.push({ axis, index, filled, emptied });
  }
  return { known, solved: known.every((k) => k !== UNKNOWN), contradiction: false, steps };
}

/** Whether a picture has one answer that line after line finds to the end — no guess needed. */
export function solvableByLines(picture: Picture): boolean {
  const solution = solutionOf(picture);
  const result = solveGrid(cluesOf(solution, picture.size));
  return result.solved && result.known.every((k, i) => (k === FILLED) === solution[i]);
}

/** Whether marks fit the numbers of a line (the filled runs are exactly the numbers). */
export const fitsLine = (filled: readonly boolean[], clue: readonly number[]): boolean => {
  const runs = clueOf(filled);
  return runs.length === clue.length && runs.every((n, i) => n === clue[i]);
};
