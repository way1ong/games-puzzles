import { describe, expect, it } from 'vitest';
import {
  ALL,
  CELLS,
  PEERS,
  SIZE,
  UNITS,
  UNITS_OF,
  bit,
  boxOf,
  candidatesOf,
  cellAt,
  cellName,
  conflicts,
  countOf,
  digitsOf,
  emptyGrid,
  formatGrid,
  isComplete,
  onlyDigit,
  parseGrid,
  sees,
} from './grid.ts';

/** A full valid board built by the pattern (row × 3 + row ÷ 3 + col) — enough to test the rules. */
function patternBoard(): number[] {
  return Array.from({ length: CELLS }, (_, cell) => {
    const r = Math.floor(cell / SIZE);
    const c = cell % SIZE;
    return ((r * 3 + Math.floor(r / 3) + c) % SIZE) + 1;
  });
}

describe('grid', () => {
  it('has rows, columns and boxes of nine different cells, three for every cell', () => {
    expect(UNITS).toHaveLength(3 * SIZE);
    for (const unit of UNITS) expect(new Set(unit.cells).size).toBe(SIZE);
    for (let cell = 0; cell < CELLS; cell++) {
      expect(UNITS_OF[cell]!.map((u) => UNITS[u]!.kind)).toEqual(['row', 'col', 'box']);
      for (const u of UNITS_OF[cell]!) expect(UNITS[u]!.cells).toContain(cell);
      expect(PEERS[cell]).toHaveLength(20);
      expect(PEERS[cell]).not.toContain(cell);
    }
    // box 4 is the centre: rows 4–6, columns 4–6 (1-based)
    expect(UNITS[2 * SIZE + 4]!.cells).toEqual([30, 31, 32, 39, 40, 41, 48, 49, 50]);
    expect(boxOf(cellAt(8, 0))).toBe(6);
    expect(cellName(cellAt(3, 6))).toEqual({ row: 4, col: 7 });
  });

  it('tells which cells see each other', () => {
    expect(sees(cellAt(0, 0), cellAt(0, 8))).toBe(true); // row
    expect(sees(cellAt(0, 0), cellAt(8, 0))).toBe(true); // column
    expect(sees(cellAt(0, 0), cellAt(2, 2))).toBe(true); // box
    expect(sees(cellAt(0, 0), cellAt(4, 4))).toBe(false);
    expect(sees(cellAt(4, 4), cellAt(4, 4))).toBe(false);
  });

  it('works with candidate masks', () => {
    expect(countOf(ALL)).toBe(SIZE);
    expect(digitsOf(bit(2) | bit(9))).toEqual([2, 9]);
    expect(onlyDigit(bit(7))).toBe(7);
  });

  it('reads and writes a grid as text', () => {
    const board = patternBoard();
    expect(parseGrid(formatGrid(board))).toEqual(board);
    expect(parseGrid('.'.repeat(CELLS))).toEqual(emptyGrid());
    expect(() => parseGrid('123')).toThrow();
  });

  it('finds the candidates every empty cell has left', () => {
    const board = patternBoard();
    expect(isComplete(board)).toBe(true);
    const puzzle = [...board];
    puzzle[0] = 0;
    puzzle[cellAt(4, 4)] = 0;
    const cands = candidatesOf(puzzle);
    expect(cands[0]).toBe(bit(board[0]!));
    expect(cands[cellAt(4, 4)]).toBe(bit(board[cellAt(4, 4)]!));
    expect(cands[1]).toBe(0); // a filled cell has none
    expect(isComplete(puzzle)).toBe(false);
  });

  it('marks every digit that repeats in a row, column or box', () => {
    const grid = emptyGrid();
    grid[cellAt(0, 0)] = 5;
    grid[cellAt(0, 7)] = 5; // same row
    grid[cellAt(5, 3)] = 2;
    grid[cellAt(4, 4)] = 2; // same box
    grid[cellAt(8, 8)] = 5; // alone
    expect([...conflicts(grid)].sort((a, b) => a - b)).toEqual([cellAt(0, 0), cellAt(0, 7), cellAt(4, 4), cellAt(5, 3)]);
    expect(conflicts(patternBoard()).size).toBe(0);
  });
});
