import { describe, expect, it } from 'vitest';
import { LEVELS, SUDOKU } from '../config.ts';
import { makePuzzle, puzzleMaker } from './generate.ts';
import { CELLS, isComplete, parseGrid } from './grid.ts';
import { fitsLevel, solveLogically, techniquesOf } from './logic.ts';
import { countSolutions } from './search.ts';

describe('making puzzles', () => {
  it('gives the same puzzle for the same seed and level, another for another seed', () => {
    expect(makePuzzle(42, 'medium')).toEqual(makePuzzle(42, 'medium'));
    expect(makePuzzle(42, 'medium').givens).not.toBe(makePuzzle(43, 'medium').givens);
    expect(makePuzzle(42, 'medium').givens).not.toBe(makePuzzle(42, 'easy').givens);
  });

  for (const level of LEVELS) {
    it(`${level}: one solution, solvable by the level's techniques only, symmetric`, () => {
      const rule = SUDOKU.levels[level];
      for (let seed = 100; seed < 106; seed++) {
        const puzzle = makePuzzle(seed, level);
        const givens = parseGrid(puzzle.givens);
        const solution = parseGrid(puzzle.solution);
        expect(puzzle).toMatchObject({ level, seed });
        expect(isComplete(solution)).toBe(true);
        expect(countSolutions(givens)).toBe(1);
        for (let cell = 0; cell < CELLS; cell++) {
          if (givens[cell]) expect(givens[cell]).toBe(solution[cell]);
          expect(givens[cell] === 0).toBe(givens[CELLS - 1 - cell] === 0); // mirror through the centre
        }
        const count = givens.filter((d) => d > 0).length;
        if (rule.minGivens !== null) expect(count).toBeGreaterThanOrEqual(rule.minGivens);
        if (rule.maxGivens !== null) expect(count).toBeLessThanOrEqual(rule.maxGivens);
        expect(fitsLevel(givens, level)).toBe(true);
        // A harder level's puzzle cannot be solved with the techniques of the level before it.
        const before = LEVELS[LEVELS.indexOf(level) - 1];
        if (rule.needsNew && before) expect(solveLogically(givens, techniquesOf(before)).solved).toBe(false);
      }
    }, 60_000);
  }

  it('makes a puzzle in small slices, reporting the attempts', () => {
    const maker = puzzleMaker(7, 'hard');
    let slices = 0;
    let r = maker.next();
    while (!r.done) {
      expect(r.value.attempts).toBeGreaterThanOrEqual(1);
      slices++;
      r = maker.next();
    }
    expect(slices).toBeGreaterThan(1);
    expect(r.value).toEqual(makePuzzle(7, 'hard'));
  });
});

describe('levels', () => {
  it('add techniques from the simplest, each level keeps the techniques before it', () => {
    expect(techniquesOf('easy')).toEqual(['fullHouse', 'hiddenSingle', 'nakedSingle']);
    expect(techniquesOf('medium')).toEqual(techniquesOf('easy'));
    expect(techniquesOf('hard')).toEqual([...techniquesOf('medium'), ...SUDOKU.levels.hard.adds]);
    expect(techniquesOf('expert')).toEqual(['fullHouse', 'hiddenSingle', 'nakedSingle', 'pointing', 'claiming', 'nakedPair', 'hiddenPair', 'nakedTriple', 'hiddenTriple', 'xWing', 'xyWing', 'swordfish', 'xyzWing']);
  });

  it('tell an easy puzzle from a medium one by the open digits', () => {
    const easy = parseGrid(makePuzzle(5, 'easy').givens);
    expect(fitsLevel(easy, 'easy')).toBe(true);
    expect(fitsLevel(easy, 'medium')).toBe(false); // too many open digits
    const medium = parseGrid(makePuzzle(5, 'medium').givens);
    expect(fitsLevel(medium, 'easy')).toBe(false); // too few
    expect(fitsLevel(medium, 'hard')).toBe(false); // needs no technique of the hard level
  });
});
