// Solving a colour picture line by line (docs/nonograms/SPEC.md, "Кольорові малюнки"): a picture with one answer is
// solved to the end; one with two answers stops halfway; the colours can tell more than black and white, and touching
// runs less; numbers that cannot hold are found out.
import { describe, expect, it } from 'vitest';
import { colourCluesOfPicture, paintsOf, valuesOf } from './colour-clues.ts';
import { anyOf, bitOf, onlyValue } from './colour-line.ts';
import { colourSolvableByLines, fitsColourLine, solveColourGrid } from './colour-solve.ts';
import type { Picture } from './picture.ts';
import { solvableByLines } from './solve.ts';

const picture = (rows: string[]): Picture => ({ id: 'test-5', name: 'test', size: rows.length as 5, rows });

describe('solveColourGrid', () => {
  it('solves a picture with one answer to the end, by steps that together decide every cell', () => {
    const mushroom = picture(['.rrr.', 'rrrrr', 'rrrrr', '..t..', '.ttt.']);
    const clues = colourCluesOfPicture(mushroom);
    const values = valuesOf(mushroom, clues.paints);
    const result = solveColourGrid(clues);
    expect(result.solved).toBe(true);
    expect(result.contradiction).toBe(false);
    expect(result.known).toEqual(values.map(bitOf));
    // every cell narrowed by some step, its last step leaving it its own value
    const last = new Map<number, number>();
    for (const step of result.steps) for (const { cell, can } of step.cells) last.set(cell, can);
    expect([...last.keys()].sort((a, b) => a - b)).toEqual(Array.from({ length: 25 }, (_, i) => i));
    for (const [cell, can] of last) expect(onlyValue(can), `${cell}`).toBe(values[cell]);
    expect(colourSolvableByLines(mushroom)).toBe(true);
  });

  it('stops where a guess would be needed: two answers (a diagonal of one colour, either way)', () => {
    const diagonal = picture(['r....', '.r...', '..r..', '...r.', '....r']);
    const result = solveColourGrid(colourCluesOfPicture(diagonal));
    expect(result.solved).toBe(false);
    expect(result.contradiction).toBe(false);
    expect(colourSolvableByLines(diagonal)).toBe(false);
  });

  it('finds more than black and white where the colours tell lines apart, less where runs touch', () => {
    // each cell of the diagonal has its own colour: its row and its column alone say where it is
    const rainbow = picture(['r....', '.g...', '..b..', '...y.', '....o']);
    expect(solvableByLines(rainbow)).toBe(false);
    expect(colourSolvableByLines(rainbow)).toBe(true);
    // "g1 g2" and "g1 r1" leave open whether the runs touch, where black and white "1 2", "2" did not
    const touching = picture(['.g.gg', '..r..', '.r...', '..g..', '..g..']);
    expect(solvableByLines(touching)).toBe(true);
    expect(colourSolvableByLines(touching)).toBe(false);
  });

  it('goes on from what is known already, and finds numbers that cannot hold', () => {
    const flag = picture(['rrrr.', 'rrrr.', 'k....', 'k....', 'k....']);
    const clues = colourCluesOfPicture(flag);
    expect(paintsOf(flag)).toEqual(['r', 'k']);
    const open = anyOf(clues.paints.length);
    // the empty corner cannot be painted: a red cell there contradicts the numbers
    const wrong = new Array<number>(25).fill(open);
    wrong[24] = bitOf(1);
    expect(solveColourGrid(clues, wrong).contradiction).toBe(true);
    const start = new Array<number>(25).fill(open);
    start[0] = bitOf(1);
    const result = solveColourGrid(clues, start);
    expect(result.solved).toBe(true);
    expect(result.steps.every((s) => s.cells.every((c) => c.cell !== 0))).toBe(true);
  });

  it('tells whether a line of paints fits its numbers, colours and all', () => {
    const paints = ['r', 'g'];
    const clue = [
      { colour: 'r', length: 2 },
      { colour: 'g', length: 1 },
    ];
    expect(fitsColourLine([1, 1, 2, 0], clue, paints)).toBe(true);
    expect(fitsColourLine([1, 1, 0, 2], clue, paints)).toBe(true);
    expect(fitsColourLine([2, 2, 1, 0], clue, paints)).toBe(false); // the colours the other way round
    expect(fitsColourLine([1, 1, 1, 0], clue, paints)).toBe(false);
    expect(fitsColourLine([0, 0], [], paints)).toBe(true);
  });
});
