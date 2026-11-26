// The hint (docs/nonograms/SPEC.md, "Керування"): a mistake first, if the grid has one; otherwise a line where the
// numbers and the cells already marked decide more cells, and which. It never guesses: the line's own reasoning
// (line.ts) — what a person could see there now. Pure, no DOM.
import { allLines, clueAt, type Axis, type Clues } from './clues.ts';
import { EMPTY, FILLED, UNKNOWN, solveLine, type Know } from './line.ts';
import { CROSS, FILL, mistakes, type Play } from './play.ts';
import { solutionOf, type Picture } from './picture.ts';

export type Hint =
  /** A cell against the answer: it should be filled, or empty. */
  | { kind: 'mistake'; cell: number; should: 'fill' | 'empty' }
  /** A line where more follows: the cells to fill and to cross. */
  | { kind: 'line'; axis: Axis; index: number; fill: number[]; cross: number[] }
  /** Nothing more to find (the picture is solved). */
  | { kind: 'none' };

export function hintFor(play: Play, picture: Picture, clues: Clues): Hint {
  const solution = solutionOf(picture);
  const wrong = mistakes(play.marks, solution);
  if (wrong.length) {
    const cell = wrong[0]!;
    return { kind: 'mistake', cell, should: solution[cell] ? 'fill' : 'empty' };
  }
  const known: Know[] = play.marks.map((m) => (m === FILL ? FILLED : m === CROSS ? EMPTY : UNKNOWN));
  // the line that decides the most: cells to fill count first — they are what the picture is made of
  let best: Hint = { kind: 'none' };
  let bestScore = 0;
  for (const line of allLines(clues.size)) {
    const result = solveLine(clueAt(clues, line.axis, line.index), line.cells.map((c) => known[c]!));
    if (!result) continue;
    const fill: number[] = [];
    const cross: number[] = [];
    result.forEach((k, i) => {
      const c = line.cells[i]!;
      if (known[c] !== UNKNOWN) return;
      if (k === FILLED) fill.push(c);
      else if (k === EMPTY) cross.push(c);
    });
    const score = fill.length * clues.size * clues.size + cross.length;
    if (score > bestScore) {
      best = { kind: 'line', axis: line.axis, index: line.index, fill, cross };
      bestScore = score;
    }
  }
  return best;
}
