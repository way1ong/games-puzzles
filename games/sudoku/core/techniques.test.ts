import { describe, expect, it } from 'vitest';
import { LEVELS, TECHNIQUES, type Technique } from '../config.ts';
import { makePuzzle } from './generate.ts';
import { ALL, CELLS, bit, boxUnit, cellAt, colUnit, parseGrid, rowUnit } from './grid.ts';
import { applyStep, nextStep, positionOf } from './logic.ts';
import { FINDERS, stillHolds, type Position } from './techniques.ts';

/** An empty board where every cell may still hold every digit. */
function open(): Position {
  return { values: new Array<number>(CELLS).fill(0), cands: new Array<number>(CELLS).fill(ALL) };
}

/** Takes the digits out of the candidates of the cells. */
function without(pos: Position, cells: readonly number[], digits: readonly number[]): void {
  const mask = digits.reduce((m, d) => m | bit(d), 0);
  for (const cell of cells) pos.cands[cell]! &= ~mask;
}

const row = (r: number, except: readonly number[] = []): number[] =>
  Array.from({ length: 9 }, (_, c) => c).filter((c) => !except.includes(c)).map((c) => cellAt(r, c));
const col = (c: number, except: readonly number[] = []): number[] =>
  Array.from({ length: 9 }, (_, r) => r).filter((r) => !except.includes(r)).map((r) => cellAt(r, c));
const sortCells = (es: { cell: number }[]): number[] => es.map((e) => e.cell).sort((a, b) => a - b);

describe('techniques, each on a board made for it', () => {
  it('last free cell of a unit', () => {
    const values = new Array<number>(CELLS).fill(0);
    for (let c = 0; c < 8; c++) values[cellAt(0, c)] = c + 1;
    const step = FINDERS.fullHouse(positionOf(values));
    expect(step).toMatchObject({ technique: 'fullHouse', place: { cell: cellAt(0, 8), digit: 9 }, units: [rowUnit(0)] });
  });

  it('only place for a digit in a box', () => {
    const pos = open();
    without(pos, [0, 1, 2, 9, 11, 18, 19, 20], [7]); // box 1 except row 2, column 2
    const step = FINDERS.hiddenSingle(pos);
    expect(step).toMatchObject({ technique: 'hiddenSingle', place: { cell: cellAt(1, 1), digit: 7 }, units: [boxUnit(0)] });
  });

  it('only digit for a cell', () => {
    const pos = open();
    pos.cands[cellAt(4, 4)] = bit(3);
    expect(FINDERS.nakedSingle(pos)).toMatchObject({ place: { cell: cellAt(4, 4), digit: 3 } });
  });

  it('a digit locked in one row of a box leaves the rest of the row', () => {
    const pos = open();
    without(pos, [9, 10, 11, 18, 19, 20], [4]);
    const step = FINDERS.pointing(pos)!;
    expect(step).toMatchObject({ technique: 'pointing', cells: [0, 1, 2], units: [boxUnit(0), rowUnit(0)], digits: [4] });
    expect(sortCells(step.eliminate)).toEqual(row(0, [0, 1, 2]));
    expect(step.eliminate.every((e) => e.mask === bit(4))).toBe(true);
  });

  it('a digit locked in one box of a row leaves the rest of the box', () => {
    const pos = open();
    without(pos, row(0, [0, 1, 2]), [4]);
    const step = FINDERS.claiming(pos)!;
    expect(step).toMatchObject({ technique: 'claiming', cells: [0, 1, 2], units: [rowUnit(0), boxUnit(0)], digits: [4] });
    expect(sortCells(step.eliminate)).toEqual([9, 10, 11, 18, 19, 20]);
  });

  it('a pair of cells with the same two digits', () => {
    const pos = open();
    pos.cands[0] = bit(2) | bit(5);
    pos.cands[1] = bit(2) | bit(5);
    const step = FINDERS.nakedPair(pos)!;
    expect(step).toMatchObject({ technique: 'nakedPair', cells: [0, 1], units: [boxUnit(0)], digits: [2, 5] });
    expect(sortCells(step.eliminate)).toEqual([2, 9, 10, 11, 18, 19, 20]);
    expect(step.eliminate.every((e) => e.mask === (bit(2) | bit(5)))).toBe(true);
  });

  it('two digits with the same two places only', () => {
    const pos = open();
    without(pos, row(0, [4, 6]), [3, 8]);
    const step = FINDERS.hiddenPair(pos)!;
    expect(step).toMatchObject({ technique: 'hiddenPair', cells: [4, 6], units: [rowUnit(0)], digits: [3, 8] });
    expect(step.eliminate).toEqual([
      { cell: 4, mask: ALL & ~(bit(3) | bit(8)) },
      { cell: 6, mask: ALL & ~(bit(3) | bit(8)) },
    ]);
  });

  it('three cells with three digits between them', () => {
    const pos = open();
    pos.cands[cellAt(0, 0)] = bit(1) | bit(2);
    pos.cands[cellAt(0, 4)] = bit(2) | bit(3);
    pos.cands[cellAt(0, 8)] = bit(1) | bit(3);
    const step = FINDERS.nakedTriple(pos)!;
    expect(step).toMatchObject({ technique: 'nakedTriple', cells: [0, 4, 8], units: [rowUnit(0)], digits: [1, 2, 3] });
    expect(sortCells(step.eliminate)).toEqual(row(0, [0, 4, 8]));
  });

  it('three digits with the same three places only', () => {
    const pos = open();
    without(pos, row(0, [1, 4, 7]), [1, 2, 3]);
    without(pos, [cellAt(0, 1)], [3]);
    without(pos, [cellAt(0, 4)], [1]);
    without(pos, [cellAt(0, 7)], [2]);
    const step = FINDERS.hiddenTriple(pos)!;
    expect(step).toMatchObject({ technique: 'hiddenTriple', cells: [1, 4, 7], units: [rowUnit(0)], digits: [1, 2, 3] });
    expect(sortCells(step.eliminate)).toEqual([1, 4, 7]);
    for (const e of step.eliminate) expect(e.mask & (bit(1) | bit(2) | bit(3))).toBe(0);
  });

  it('X-Wing: two rows, the digit only in the same two columns', () => {
    const pos = open();
    without(pos, [...row(1, [2, 7]), ...row(5, [2, 7])], [6]);
    const step = FINDERS.xWing(pos)!;
    expect(step).toMatchObject({ technique: 'xWing', digits: [6], units: [rowUnit(1), rowUnit(5), colUnit(2), colUnit(7)] });
    expect(step.cells).toEqual([cellAt(1, 2), cellAt(1, 7), cellAt(5, 2), cellAt(5, 7)]);
    expect(sortCells(step.eliminate)).toEqual([...col(2, [1, 5]), ...col(7, [1, 5])].sort((a, b) => a - b));
  });

  it('Swordfish: three rows, the digit only in the same three columns', () => {
    const pos = open();
    without(pos, [...row(0, [1, 4]), ...row(3, [4, 7]), ...row(6, [1, 7])], [6]);
    const step = FINDERS.swordfish(pos)!;
    expect(step).toMatchObject({ technique: 'swordfish', digits: [6] });
    expect(step.units).toEqual([rowUnit(0), rowUnit(3), rowUnit(6), colUnit(1), colUnit(4), colUnit(7)]);
    const others = [1, 2, 4, 5, 7, 8];
    expect(sortCells(step.eliminate)).toEqual([...col(1, [0, 3, 6]), ...col(4, [0, 3, 6]), ...col(7, [0, 3, 6])].sort((a, b) => a - b));
    expect(step.eliminate).toHaveLength(3 * others.length);
  });

  it('XY-Wing: whichever digit the pivot takes, one pincer is z', () => {
    const pos = open();
    pos.cands[cellAt(0, 0)] = bit(1) | bit(2);
    pos.cands[cellAt(0, 5)] = bit(1) | bit(3);
    pos.cands[cellAt(4, 0)] = bit(2) | bit(3);
    const step = FINDERS.xyWing(pos)!;
    expect(step).toMatchObject({ technique: 'xyWing', cells: [cellAt(0, 0), cellAt(0, 5), cellAt(4, 0)], digits: [1, 2, 3] });
    expect(step.eliminate).toEqual([{ cell: cellAt(4, 5), mask: bit(3) }]);
  });

  it('XYZ-Wing: z is in the pivot or a pincer', () => {
    const pos = open();
    pos.cands[cellAt(0, 0)] = bit(1) | bit(2) | bit(3);
    pos.cands[cellAt(0, 4)] = bit(1) | bit(3);
    pos.cands[cellAt(1, 1)] = bit(2) | bit(3);
    const step = FINDERS.xyzWing(pos)!;
    expect(step).toMatchObject({ technique: 'xyzWing', cells: [cellAt(0, 0), cellAt(0, 4), cellAt(1, 1)], digits: [1, 2, 3] });
    expect(sortCells(step.eliminate)).toEqual([cellAt(0, 1), cellAt(0, 2)]);
  });

  it('tells whether the pattern of a step still holds', () => {
    const pos = open();
    without(pos, [9, 10, 11, 18, 19, 20], [4]);
    const pointing = FINDERS.pointing(pos)!;
    expect(stillHolds(pos, pointing)).toBe(true);
    pos.cands[10]! |= bit(4); // the digit may again be in another row of the box
    expect(stillHolds(pos, pointing)).toBe(false);

    const pair = open();
    pair.cands[0] = bit(2) | bit(5);
    pair.cands[1] = bit(2) | bit(5);
    const naked = FINDERS.nakedPair(pair)!;
    expect(stillHolds(pair, naked)).toBe(true);
    pair.cands[1] = bit(2) | bit(5) | bit(7);
    expect(stillHolds(pair, naked)).toBe(false);

    const wing = open();
    without(wing, [...row(1, [2, 7]), ...row(5, [2, 7])], [6]);
    const xWing = FINDERS.xWing(wing)!;
    expect(stillHolds(wing, xWing)).toBe(true);
    wing.cands[cellAt(1, 4)]! |= bit(6);
    expect(stillHolds(wing, xWing)).toBe(false);

    expect(stillHolds(open(), { technique: 'nakedSingle', place: { cell: 0, digit: 1 }, eliminate: [], cells: [0], units: [], digits: [1] })).toBe(false);
  });

  it('finds nothing where there is nothing to find', () => {
    const pos = open();
    for (const technique of TECHNIQUES) expect(FINDERS[technique](pos)).toBeNull();
  });
});

describe('techniques on real puzzles', () => {
  it('never place a wrong digit nor remove the right one', () => {
    const seen = new Set<Technique>();
    for (const level of LEVELS) {
      for (let seed = 1; seed <= 6; seed++) {
        const puzzle = makePuzzle(seed, level);
        const solution = parseGrid(puzzle.solution);
        const pos = positionOf(parseGrid(puzzle.givens));
        for (let step = nextStep(pos); step; step = nextStep(pos)) {
          seen.add(step.technique);
          if (step.place) expect(step.place.digit).toBe(solution[step.place.cell]);
          for (const e of step.eliminate) expect(e.mask & bit(solution[e.cell]!)).toBe(0);
          applyStep(pos, step);
        }
        expect(pos.values).toEqual(solution);
      }
    }
    // The puzzles of all levels together use the techniques of every level.
    for (const t of ['fullHouse', 'hiddenSingle', 'nakedSingle', 'pointing', 'xyWing'] as const) expect(seen).toContain(t);
  }, 60_000);
});
