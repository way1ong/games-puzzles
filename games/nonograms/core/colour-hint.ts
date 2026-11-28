// The hint of a colour picture (docs/nonograms/SPEC.md, "Кольорові малюнки"), as hint.ts is for black and white: a
// mistake first, if the grid has one — a cell painted another colour, painted where it is empty, or crossed where it
// is painted; otherwise the line where the numbers and the cells already marked decide the most cells, which paint
// each takes and which are crossed. It never guesses: the line's own reasoning (colour-line.ts) on what the marks say —
// what a person could see there now. Pure, no DOM.
import { NO_PAINT, colourLines, type ColourClues } from './colour-clues.ts';
import { anyOf, bitOf, onlyValue, solveColourLine } from './colour-line.ts';
import { BLANK, CROSS, colourMistakes, type ColourPlay } from './colour-play.ts';
import type { Axis } from './clues.ts';

export type ColourHint =
  /** A cell against the answer: the paint it takes, or `NO_PAINT` — it is empty. */
  | { kind: 'mistake'; cell: number; should: number }
  /** A line where more follows: the cells to paint, each with its paint, and the cells to cross. */
  | { kind: 'line'; axis: Axis; index: number; paint: { cell: number; paint: number }[]; cross: number[] }
  /** Nothing more to find (the picture is solved). */
  | { kind: 'none' };

/** The hint for the marks of a play; `values` — the answer (colour-clues.ts, valuesOf). */
export function colourHintFor(play: ColourPlay, values: readonly number[], clues: ColourClues): ColourHint {
  const wrong = colourMistakes(play.marks, values);
  if (wrong.length) {
    const cell = wrong[0]!;
    return { kind: 'mistake', cell, should: values[cell]! };
  }
  const open = anyOf(clues.paints.length);
  const known = play.marks.map((m) => (m === CROSS ? bitOf(NO_PAINT) : m === BLANK ? open : bitOf(m)));
  // the line that decides the most: cells to paint count first — they are what the picture is made of
  let best: ColourHint = { kind: 'none' };
  let bestScore = 0;
  for (const line of colourLines(clues)) {
    const result = solveColourLine(line.clue, line.cells.map((c) => known[c]!), clues.paints);
    if (!result) continue;
    const paint: { cell: number; paint: number }[] = [];
    const cross: number[] = [];
    result.forEach((can, i) => {
      const c = line.cells[i]!;
      const value = onlyValue(can);
      if (play.marks[c] !== BLANK || value === null) return;
      if (value === NO_PAINT) cross.push(c);
      else paint.push({ cell: c, paint: value });
    });
    const score = paint.length * clues.size * clues.size + cross.length;
    if (score > bestScore) {
      best = { kind: 'line', axis: line.axis, index: line.index, paint, cross };
      bestScore = score;
    }
  }
  return best;
}
