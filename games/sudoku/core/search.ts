// Search by trial: how many solutions a grid has, the solution itself, and a random full board from a seed.
// Bit masks of the digits used in every row, column and box; the next cell is always the one with the fewest
// digits left. Only for checking and making boards — a player is never asked to guess (core/logic.ts).
import { ALL, SIZE, bit, boxOf, colOf, countOf, onlyDigit, rowOf, type Grid } from './grid.ts';
import { shuffled, type Rand } from './rand.ts';

interface Search {
  grid: Grid;
  rows: number[];
  cols: number[];
  boxes: number[];
  /** Empty cells; those before the current depth are already filled by the search. */
  empty: number[];
}

function begin(grid: readonly number[]): Search | null {
  const s: Search = {
    grid: [...grid],
    rows: new Array<number>(SIZE).fill(0),
    cols: new Array<number>(SIZE).fill(0),
    boxes: new Array<number>(SIZE).fill(0),
    empty: [],
  };
  for (let cell = 0; cell < s.grid.length; cell++) {
    const digit = s.grid[cell]!;
    if (!digit) {
      s.empty.push(cell);
      continue;
    }
    const b = bit(digit);
    const r = rowOf(cell);
    const c = colOf(cell);
    const x = boxOf(cell);
    if ((s.rows[r]! | s.cols[c]! | s.boxes[x]!) & b) return null; // the digit repeats
    s.rows[r]! |= b;
    s.cols[c]! |= b;
    s.boxes[x]! |= b;
  }
  return s;
}

const free = (s: Search, cell: number): number =>
  ALL & ~(s.rows[rowOf(cell)]! | s.cols[colOf(cell)]! | s.boxes[boxOf(cell)]!);

function put(s: Search, cell: number, digit: number): void {
  const b = bit(digit);
  s.grid[cell] = digit;
  s.rows[rowOf(cell)]! |= b;
  s.cols[colOf(cell)]! |= b;
  s.boxes[boxOf(cell)]! |= b;
}

function take(s: Search, cell: number, digit: number): void {
  const b = ~bit(digit);
  s.grid[cell] = 0;
  s.rows[rowOf(cell)]! &= b;
  s.cols[colOf(cell)]! &= b;
  s.boxes[boxOf(cell)]! &= b;
}

/** Moves the empty cell with the fewest digits left to position `depth`; returns its mask (0 — dead end). */
function pick(s: Search, depth: number): number {
  let best = depth;
  let bestMask = 0;
  let bestCount = SIZE + 1;
  for (let i = depth; i < s.empty.length; i++) {
    const mask = free(s, s.empty[i]!);
    const n = countOf(mask);
    if (n < bestCount) {
      best = i;
      bestMask = mask;
      bestCount = n;
      if (n <= 1) break;
    }
  }
  [s.empty[depth], s.empty[best]] = [s.empty[best]!, s.empty[depth]!];
  return bestMask;
}

/**
 * Walks the solutions depth first; `order` gives the digits to try in a cell. Stops when `found` says so.
 */
function walk(s: Search, depth: number, order: (mask: number) => number[], found: () => boolean): boolean {
  if (depth === s.empty.length) return found();
  const mask = pick(s, depth);
  if (!mask) return false;
  const cell = s.empty[depth]!;
  for (const digit of order(mask)) {
    put(s, cell, digit);
    if (walk(s, depth + 1, order, found)) return true;
    take(s, cell, digit);
  }
  return false;
}

function ascending(mask: number): number[] {
  const out: number[] = [];
  for (let m = mask; m; m &= m - 1) out.push(onlyDigit(m & -m));
  return out;
}

/** How many solutions the grid has, counting no further than `limit`. */
export function countSolutions(grid: readonly number[], limit = 2): number {
  const s = begin(grid);
  if (!s) return 0;
  let count = 0;
  walk(s, 0, ascending, () => ++count >= limit);
  return count;
}

/** The first solution found, or null when there is none. */
export function solveOne(grid: readonly number[]): Grid | null {
  const s = begin(grid);
  if (!s) return null;
  return walk(s, 0, ascending, () => true) ? s.grid : null;
}

/** A full, valid board drawn from the random stream. */
export function randomFull(rand: Rand): Grid {
  const s = begin(new Array<number>(SIZE * SIZE).fill(0))!;
  if (!walk(s, 0, (mask) => shuffled(rand, ascending(mask)), () => true)) throw new Error('No full board');
  return s.grid;
}
