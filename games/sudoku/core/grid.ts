// The board: SIZE × SIZE cells numbered row by row (cell = row × SIZE + col); a digit 1…SIZE or 0 — empty.
// Units are the rows, the columns and the boxes: every digit once in each. Candidates of a cell are a bit
// mask — bit (digit − 1) set when the digit may still go there.
import { SUDOKU } from '../config.ts';

export const BOX = SUDOKU.box;
export const SIZE = BOX * BOX;
export const CELLS = SIZE * SIZE;
/** All digits as a candidate mask. */
export const ALL = (1 << SIZE) - 1;

export type Grid = number[];

export type UnitKind = 'row' | 'col' | 'box';
export interface Unit {
  kind: UnitKind;
  /** 0-based number of the row, column or box (boxes left to right, top to bottom). */
  index: number;
  cells: readonly number[];
}

export const rowOf = (cell: number): number => Math.floor(cell / SIZE);
export const colOf = (cell: number): number => cell % SIZE;
export const boxOf = (cell: number): number => Math.floor(rowOf(cell) / BOX) * BOX + Math.floor(colOf(cell) / BOX);
export const cellAt = (row: number, col: number): number => row * SIZE + col;

const range = (n: number): number[] => Array.from({ length: n }, (_, i) => i);

/** Rows first (units 0…SIZE−1), then the columns, then the boxes. */
export const UNITS: readonly Unit[] = [
  ...range(SIZE).map((r) => ({ kind: 'row' as const, index: r, cells: range(SIZE).map((c) => cellAt(r, c)) })),
  ...range(SIZE).map((c) => ({ kind: 'col' as const, index: c, cells: range(SIZE).map((r) => cellAt(r, c)) })),
  ...range(SIZE).map((b) => ({
    kind: 'box' as const,
    index: b,
    cells: range(SIZE).map((i) =>
      cellAt(Math.floor(b / BOX) * BOX + Math.floor(i / BOX), (b % BOX) * BOX + (i % BOX)),
    ),
  })),
];

export const rowUnit = (row: number): number => row;
export const colUnit = (col: number): number => SIZE + col;
export const boxUnit = (box: number): number => 2 * SIZE + box;

/** The three units of every cell: its row, column and box. */
export const UNITS_OF: readonly (readonly number[])[] = range(CELLS).map((cell) => [
  rowUnit(rowOf(cell)),
  colUnit(colOf(cell)),
  boxUnit(boxOf(cell)),
]);

/** Every cell that shares a unit with the cell (the cell itself not included). */
export const PEERS: readonly (readonly number[])[] = range(CELLS).map((cell) => {
  const peers = new Set<number>();
  for (const u of UNITS_OF[cell]!) for (const other of UNITS[u]!.cells) if (other !== cell) peers.add(other);
  return [...peers].sort((a, b) => a - b);
});

/** Row and column of a cell counted from 1, as a person names them. */
export function cellName(cell: number): { row: number; col: number } {
  return { row: rowOf(cell) + 1, col: colOf(cell) + 1 };
}

export function sees(a: number, b: number): boolean {
  return a !== b && (rowOf(a) === rowOf(b) || colOf(a) === colOf(b) || boxOf(a) === boxOf(b));
}

export const bit = (digit: number): number => 1 << (digit - 1);

const POPCOUNT = range(ALL + 1).map((mask) => {
  let n = 0;
  for (let m = mask; m; m &= m - 1) n++;
  return n;
});

/** How many digits a candidate mask holds. */
export const countOf = (mask: number): number => POPCOUNT[mask] ?? 0;

/** The digits of a candidate mask, from the smallest. */
export function digitsOf(mask: number): number[] {
  const out: number[] = [];
  for (let d = 1; d <= SIZE; d++) if (mask & bit(d)) out.push(d);
  return out;
}

/** The only digit of a one-digit mask. */
export const onlyDigit = (mask: number): number => 32 - Math.clz32(mask);

export function emptyGrid(): Grid {
  return new Array<number>(CELLS).fill(0);
}

/** A grid from text: one character a cell, row by row; '0' or '.' — empty. */
export function parseGrid(text: string): Grid {
  const chars = text.replace(/\s+/g, '');
  if (chars.length !== CELLS) throw new Error(`A grid has ${CELLS} cells, got ${chars.length}`);
  return [...chars].map((ch) => (ch === '.' ? 0 : Number.parseInt(ch, 10)));
}

export function formatGrid(grid: readonly number[]): string {
  return grid.join('');
}

/** For every empty cell, the digits that no filled cell of its row, column or box holds; 0 for a filled cell. */
export function candidatesOf(grid: readonly number[]): number[] {
  const used = UNITS.map((unit) => unit.cells.reduce((mask, cell) => (grid[cell] ? mask | bit(grid[cell]) : mask), 0));
  return grid.map((digit, cell) => {
    if (digit) return 0;
    const [r, c, b] = UNITS_OF[cell]!;
    return ALL & ~(used[r!]! | used[c!]! | used[b!]!);
  });
}

/** Cells whose digit appears again in the same row, column or box. */
export function conflicts(grid: readonly number[]): Set<number> {
  const out = new Set<number>();
  for (const unit of UNITS) {
    const seen = new Map<number, number>();
    for (const cell of unit.cells) {
      const digit = grid[cell]!;
      if (!digit) continue;
      const first = seen.get(digit);
      if (first === undefined) seen.set(digit, cell);
      else {
        out.add(first);
        out.add(cell);
      }
    }
  }
  return out;
}

/** Whether the grid is full and every unit holds every digit once. */
export function isComplete(grid: readonly number[]): boolean {
  return grid.every((d) => d > 0) && conflicts(grid).size === 0;
}
