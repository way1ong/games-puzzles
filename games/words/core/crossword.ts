// Laying the words of a level out as a small crossword: every word after the first crosses one already
// placed on a shared tile; words never touch side by side, so no stray words appear; the grid stays within
// the size in the config. Choices come from the seeded random stream (the same seed — the same crossword).
import type { Word } from './dictionary.ts';

export type Dir = 'across' | 'down';

export interface Placed {
  word: Word;
  row: number;
  col: number;
  dir: Dir;
}

export interface Crossword {
  width: number;
  height: number;
  /** In the order they were placed, the first one being the longest. */
  words: Placed[];
}

export interface Pick {
  /** A whole number 0 <= n < max. */
  int(max: number): number;
}

const step = (dir: Dir): [number, number] => (dir === 'across' ? [0, 1] : [1, 0]);
const at = (row: number, col: number): string => `${row},${col}`;

/** The cells of a placed word, with their tiles. */
export function cellsOf(p: Placed): { row: number; col: number; tile: string }[] {
  const [dr, dc] = step(p.dir);
  return p.word.tiles.map((tile, i) => ({ row: p.row + dr * i, col: p.col + dc * i, tile }));
}

interface Board {
  tiles: Map<string, string>;
  /** Which directions run through a cell. */
  dirs: Map<string, Set<Dir>>;
  minRow: number;
  maxRow: number;
  minCol: number;
  maxCol: number;
}

/** How many existing tiles the word would cross there, or −1 if it cannot go there. */
function crossings(board: Board, word: Word, row: number, col: number, dir: Dir): number {
  const [dr, dc] = step(dir);
  const [pr, pc] = [dc, dr]; // perpendicular
  const n = word.tiles.length;
  if (board.tiles.has(at(row - dr, col - dc)) || board.tiles.has(at(row + dr * n, col + dc * n))) return -1;
  let crossed = 0;
  for (let i = 0; i < n; i++) {
    const r = row + dr * i;
    const c = col + dc * i;
    const here = board.tiles.get(at(r, c));
    if (here !== undefined) {
      if (here !== word.tiles[i] || board.dirs.get(at(r, c))!.has(dir)) return -1;
      crossed++;
    } else if (board.tiles.has(at(r + pr, c + pc)) || board.tiles.has(at(r - pr, c - pc))) {
      return -1; // would touch a word side by side
    }
  }
  return crossed === n ? -1 : crossed;
}

function put(board: Board, p: Placed): void {
  for (const { row, col, tile } of cellsOf(p)) {
    const key = at(row, col);
    board.tiles.set(key, tile);
    const dirs = board.dirs.get(key) ?? new Set<Dir>();
    dirs.add(p.dir);
    board.dirs.set(key, dirs);
    board.minRow = Math.min(board.minRow, row);
    board.maxRow = Math.max(board.maxRow, row);
    board.minCol = Math.min(board.minCol, col);
    board.maxCol = Math.max(board.maxCol, col);
  }
}

/**
 * Places as many of the words as it can, in their order (the first goes across at the top left); a word
 * that fits nowhere is left out. `maxSide` — the biggest width and height of the grid.
 */
export function layout(words: readonly Word[], pick: Pick, maxSide: number): Crossword {
  const board: Board = { tiles: new Map(), dirs: new Map(), minRow: 0, maxRow: 0, minCol: 0, maxCol: 0 };
  const placed: Placed[] = [];
  for (const word of words) {
    if (!placed.length) {
      if (word.tiles.length > maxSide) continue;
      const first: Placed = { word, row: 0, col: 0, dir: 'across' };
      put(board, first);
      placed.push(first);
      continue;
    }
    let best: Placed[] = [];
    let bestScore = -Infinity;
    for (const p of placed) {
      const dir: Dir = p.dir === 'across' ? 'down' : 'across';
      const [dr, dc] = step(dir);
      for (const cell of cellsOf(p)) {
        word.tiles.forEach((tile, i) => {
          if (tile !== cell.tile) return;
          const row = cell.row - dr * i;
          const col = cell.col - dc * i;
          const crossed = crossings(board, word, row, col, dir);
          if (crossed < 1) return;
          const endRow = row + dr * (word.tiles.length - 1);
          const endCol = col + dc * (word.tiles.length - 1);
          const height = Math.max(board.maxRow, endRow) - Math.min(board.minRow, row) + 1;
          const width = Math.max(board.maxCol, endCol) - Math.min(board.minCol, col) + 1;
          if (height > maxSide || width > maxSide) return;
          // More crossings, then a squarer and smaller grid.
          const score = crossed * 100 - Math.abs(width - height) * 3 - (width + height);
          const candidate: Placed = { word, row, col, dir };
          if (score > bestScore) {
            bestScore = score;
            best = [candidate];
          } else if (score === bestScore && !best.some((b) => b.row === row && b.col === col && b.dir === dir)) {
            best.push(candidate);
          }
        });
      }
    }
    if (!best.length) continue;
    const chosen = best[pick.int(best.length)]!;
    put(board, chosen);
    placed.push(chosen);
  }
  // Move the grid so it starts at row 0, column 0.
  const words2 = placed.map((p) => ({ ...p, row: p.row - board.minRow, col: p.col - board.minCol }));
  return { width: board.maxCol - board.minCol + 1, height: board.maxRow - board.minRow + 1, words: words2 };
}
