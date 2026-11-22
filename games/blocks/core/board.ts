// The board: size × size cells, row by row; 0 — empty, otherwise the 1-based index of the shape that
// filled it (for its colour and pattern).
import type { Cells } from './shapes.ts';

export type Board = readonly number[];

export function emptyBoard(size: number): number[] {
  return new Array<number>(size * size).fill(0);
}

export function canPlace(board: Board, size: number, cells: Cells, row: number, col: number): boolean {
  return cells.every(([r, c]) => {
    const rr = row + r;
    const cc = col + c;
    return rr >= 0 && cc >= 0 && rr < size && cc < size && board[rr * size + cc] === 0;
  });
}

export function place(board: Board, size: number, cells: Cells, row: number, col: number, value: number): number[] {
  const next = [...board];
  for (const [r, c] of cells) next[(row + r) * size + (col + c)] = value;
  return next;
}

export interface FullLines {
  rows: number[];
  cols: number[];
}

export function fullLines(board: Board, size: number): FullLines {
  const rows: number[] = [];
  const cols: number[] = [];
  for (let i = 0; i < size; i++) {
    let rowFull = true;
    let colFull = true;
    for (let j = 0; j < size; j++) {
      if (board[i * size + j] === 0) rowFull = false;
      if (board[j * size + i] === 0) colFull = false;
    }
    if (rowFull) rows.push(i);
    if (colFull) cols.push(i);
  }
  return { rows, cols };
}

/** Empties the given rows and columns at once (a cell on a crossing is emptied once). */
export function clearLines(board: Board, size: number, lines: FullLines): number[] {
  const next = [...board];
  for (const r of lines.rows) for (let c = 0; c < size; c++) next[r * size + c] = 0;
  for (const c of lines.cols) for (let r = 0; r < size; r++) next[r * size + c] = 0;
  return next;
}

/** Whether these cells fit anywhere on the board. */
export function fitsAnywhere(board: Board, size: number, cells: Cells): boolean {
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (canPlace(board, size, cells, row, col)) return true;
    }
  }
  return false;
}
