import { describe, expect, it } from 'vitest';
import { CELLS, conflicts, emptyGrid, isComplete } from './grid.ts';
import { makeRand } from './rand.ts';
import { countSolutions, randomFull, solveOne } from './search.ts';

describe('search by trial', () => {
  it('makes a full valid board, the same for the same seed', () => {
    const a = randomFull(makeRand(1));
    const b = randomFull(makeRand(1));
    const c = randomFull(makeRand(2));
    expect(isComplete(a)).toBe(true);
    expect(isComplete(c)).toBe(true);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });

  it('counts solutions: one, several, none', () => {
    const full = randomFull(makeRand(7));
    expect(countSolutions(full)).toBe(1);
    // An empty board has very many solutions: the count stops at the limit.
    expect(countSolutions(emptyGrid(), 3)).toBe(3);
    const clash = [...full];
    clash[1] = clash[0]!; // the same digit twice in the first row
    expect(countSolutions(clash)).toBe(0);
  });

  it('solves a board with digits removed back to the board', () => {
    const full = randomFull(makeRand(11));
    const puzzle = full.map((d, cell) => (cell % 3 === 0 ? 0 : d));
    const solved = solveOne(puzzle);
    expect(solved).not.toBeNull();
    expect(isComplete(solved!)).toBe(true);
    for (let cell = 0; cell < CELLS; cell++) if (puzzle[cell]) expect(solved![cell]).toBe(puzzle[cell]);
    expect(conflicts(solved!).size).toBe(0);
  });
});
