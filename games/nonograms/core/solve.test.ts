// Solving a whole picture line by line (docs/nonograms/SPEC.md, "Без вгадування"): a picture with one answer is
// solved to the end; one with two answers stops halfway; numbers that cannot hold are found out.
import { describe, expect, it } from 'vitest';
import { cluesOf } from './clues.ts';
import { EMPTY, FILLED, UNKNOWN, type Know } from './line.ts';
import { solutionOf, type Picture } from './picture.ts';
import { fitsLine, solvableByLines, solveGrid } from './solve.ts';

const picture = (rows: string[]): Picture => ({ id: 'test', size: rows.length as 5, rows });

describe('solveGrid', () => {
  it('solves a picture with one answer to the end, by steps that together decide every cell', () => {
    const heart = picture(['.#.#.', '#####', '#####', '.###.', '..#..']);
    const solution = solutionOf(heart);
    const result = solveGrid(cluesOf(solution, 5));
    expect(result.solved).toBe(true);
    expect(result.contradiction).toBe(false);
    expect(result.known.map((k) => k === FILLED)).toEqual(solution);
    const decided = result.steps.flatMap((s) => [...s.filled, ...s.emptied]).sort((a, b) => a - b);
    expect(decided).toEqual(Array.from({ length: 25 }, (_, i) => i));
    expect(solvableByLines(heart)).toBe(true);
  });

  it('stops where a guess would be needed: two answers (a diagonal either way)', () => {
    const diagonal = picture(['#....', '.#...', '..#..', '...#.', '....#']);
    const result = solveGrid(cluesOf(solutionOf(diagonal), 5));
    expect(result.solved).toBe(false);
    expect(result.contradiction).toBe(false);
    expect(solvableByLines(diagonal)).toBe(false);
  });

  it('goes on from what is known already, and finds numbers that cannot hold', () => {
    const block = picture(['##...', '##...', '.....', '.....', '.....']);
    const clues = cluesOf(solutionOf(block), 5);
    // the empty corner cannot be filled: a filled cell there contradicts the numbers
    const wrong: Know[] = new Array<Know>(25).fill(UNKNOWN);
    wrong[24] = FILLED;
    expect(solveGrid(clues, wrong).contradiction).toBe(true);
    const start: Know[] = new Array<Know>(25).fill(UNKNOWN);
    start[0] = FILLED;
    start[2] = EMPTY;
    const result = solveGrid(clues, start);
    expect(result.solved).toBe(true);
    expect(result.steps.every((s) => !s.filled.includes(0) && !s.emptied.includes(2))).toBe(true);
  });

  it('tells whether marks fit the numbers of a line', () => {
    expect(fitsLine([true, true, false, true, false], [2, 1])).toBe(true);
    expect(fitsLine([true, false, true, true, false], [2, 1])).toBe(false);
    expect(fitsLine([false, false], [])).toBe(true);
  });
});
