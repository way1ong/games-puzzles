import { describe, expect, it } from 'vitest';
import { LEVELS } from '../config.ts';
import { makePuzzle } from './generate.ts';
import { UNITS, bit, parseGrid } from './grid.ts';
import { nextHint } from './hint.ts';
import { applyStep, positionOf } from './logic.ts';
import { stillHolds, type Position, type Step } from './techniques.ts';

/** Whether the board, as the hint's earlier steps left it, shows the digit the way the last step names. */
function justified(pos: Position, step: Step): boolean {
  const { cell, digit } = step.place!;
  const unit = UNITS[step.units[0]!]!;
  switch (step.technique) {
    case 'fullHouse':
      return unit.cells.every((c) => c === cell || pos.values[c]);
    case 'hiddenSingle':
      return unit.cells.every((c) => c === cell || !(pos.cands[c]! & bit(digit)));
    case 'nakedSingle':
      return pos.cands[cell] === bit(digit);
    default:
      return false;
  }
}

describe('hints', () => {
  it('show a wrong digit first', () => {
    const puzzle = makePuzzle(3, 'easy');
    const solution = parseGrid(puzzle.solution);
    const values = parseGrid(puzzle.givens);
    const empty = values.indexOf(0);
    values[empty] = (solution[empty]! % 9) + 1; // any other digit
    expect(nextHint(values, solution)).toEqual({ kind: 'mistakes', cells: [empty] });
  });

  it('give nothing for a solved board', () => {
    const solution = parseGrid(makePuzzle(3, 'easy').solution);
    expect(nextHint(solution, solution)).toBeNull();
  });

  it('on an easy board, place a digit in one step', () => {
    const puzzle = makePuzzle(8, 'easy');
    const hint = nextHint(parseGrid(puzzle.givens), parseGrid(puzzle.solution));
    expect(hint?.kind).toBe('steps');
    if (hint?.kind !== 'steps') return;
    expect(hint.steps).toHaveLength(1);
    expect(['fullHouse', 'hiddenSingle', 'nakedSingle']).toContain(hint.steps[0]!.technique);
  });

  for (const level of LEVELS) {
    it(`lead through a whole ${level} puzzle, each digit right and each step needed`, () => {
      for (const seed of [21, 22]) {
        const puzzle = makePuzzle(seed, level);
        const solution = parseGrid(puzzle.solution);
        const values = parseGrid(puzzle.givens);
        for (let guard = 0; guard < 81; guard++) {
          const hint = nextHint(values, solution);
          if (!hint) break;
          expect(hint.kind).toBe('steps');
          if (hint.kind !== 'steps') return;
          const removals = hint.steps.slice(0, -1);
          const last = hint.steps.at(-1)!;
          expect(removals.every((s) => s.place === null && s.eliminate.length > 0)).toBe(true);
          expect(last.place).not.toBeNull();
          // The steps replayed from the board hold one after another and end with the digit of the solution.
          const pos = positionOf(values);
          for (const s of removals) {
            expect(stillHolds(pos, s)).toBe(true);
            for (const e of s.eliminate) expect(e.mask & bit(solution[e.cell]!)).toBe(0);
            applyStep(pos, s);
          }
          const { cell, digit } = last.place!;
          expect(digit).toBe(solution[cell]);
          expect(justified(pos, last)).toBe(true);
          // Every removal is needed: without any one of them a later step no longer holds or the digit no
          // longer follows.
          for (let skip = 0; skip < removals.length; skip++) {
            const partial = positionOf(values);
            let holds = true;
            removals.forEach((s, i) => {
              if (i === skip) return;
              holds &&= stillHolds(partial, s);
              applyStep(partial, s);
            });
            expect(holds && justified(partial, last)).toBe(false);
          }
          values[cell] = digit;
        }
        expect(values).toEqual(solution);
      }
    }, 60_000);
  }
});
