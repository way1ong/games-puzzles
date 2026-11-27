// Every position of a "Clear the way" puzzle (docs/slide/SPEC.md, "Підказка", "Головоломки складено заздалегідь"):
// all places the pieces can reach from the start, and for each, the fewest moves to the way out. Moves can always be
// taken back, so from any position the player reaches, the hint is a move one step nearer, and a way out always
// exists if it exists from the start. Pure.
import { boardText, canonicalText, keyOf, movesOf, placesOf, type Move, type Places, type Puzzle } from './unblock.ts';

export interface Positions {
  puzzle: Puzzle;
  /** Each position's key (unblock.ts, keyOf) and its number. */
  index: Map<number, number>;
  keys: number[];
  /** The fewest moves from each position to the way out; -1 — no way out from it. */
  toExit: Int16Array;
}

/** All positions reachable from `places`; null when there are more than `limit`. */
export function allPositions(puzzle: Puzzle, places: Places, limit = Infinity): Positions | null {
  const { size, pieces } = puzzle;
  const count = pieces.length;
  const exitAt = size - pieces[0]!.length;
  // a piece's cells: first + (place + k) * step; a key changes by power when a piece moves one place
  const first = pieces.map((p) => (p.across ? p.line * size : p.line));
  const step = pieces.map((p) => (p.across ? 1 : size));
  const power = pieces.map((_, i) => size ** i);
  const index = new Map<number, number>();
  const keys = [keyOf(places, size)];
  index.set(keys[0]!, 0);
  const edges: number[] = [];
  const edgeStart = [0];
  const at = new Int8Array(count);
  const grid = new Uint8Array(size * size);
  const reach = (key: number) => {
    let j = index.get(key);
    if (j === undefined) {
      j = keys.length;
      index.set(key, j);
      keys.push(key);
    }
    edges.push(j);
  };
  for (let s = 0; s < keys.length; s++) {
    if (keys.length > limit) return null;
    const key = keys[s]!;
    let rest = key;
    for (let i = 0; i < count; i++) {
      at[i] = rest % size;
      rest = Math.floor(rest / size);
    }
    grid.fill(0);
    for (let i = 0; i < count; i++) for (let k = 0; k < pieces[i]!.length; k++) grid[first[i]! + (at[i]! + k) * step[i]!] = 1;
    for (let i = 0; i < count; i++) {
      const [a, length, f, st, pw] = [at[i]!, pieces[i]!.length, first[i]!, step[i]!, power[i]!];
      for (let x = a - 1; x >= 0 && !grid[f + x * st]; x--) reach(key + (x - a) * pw);
      for (let x = a + length; x < size && !grid[f + x * st]; x++) reach(key + (x - length + 1 - a) * pw);
    }
    edgeStart.push(edges.length);
  }
  const toExit = new Int16Array(keys.length).fill(-1);
  const queue: number[] = [];
  keys.forEach((key, s) => {
    if (key % size === exitAt) {
      toExit[s] = 0;
      queue.push(s);
    }
  });
  for (let q = 0; q < queue.length; q++) {
    const s = queue[q]!;
    for (let e = edgeStart[s]!; e < edgeStart[s + 1]!; e++) {
      const j = edges[e]!;
      if (toExit[j]! < 0) {
        toExit[j] = toExit[s]! + 1;
        queue.push(j);
      }
    }
  }
  return { puzzle, index, keys, toExit };
}

/** The fewest moves to the way out from these places; -1 — none (or not a position of this puzzle). */
export function fewestFrom(positions: Positions, places: Places): number {
  const at = positions.index.get(keyOf(places, positions.puzzle.size));
  return at === undefined ? -1 : positions.toExit[at]!;
}

/** The hint: the first move (in the order of movesOf) one step nearer the way out; null at the way out or with none. */
export function nextMove(positions: Positions, places: Places): Move | null {
  const now = fewestFrom(positions, places);
  if (now <= 0) return null;
  for (const move of movesOf(positions.puzzle, places)) {
    const next = places.slice();
    next[move.piece] = move.to;
    if (fewestFrom(positions, next) === now - 1) return move;
  }
  return null;
}

/** The hardest start of these positions: the farthest from the way out (its text the first in order on a tie). */
export function hardest(positions: Positions): { moves: number; text: string } | null {
  let most = 0;
  for (const d of positions.toExit) if (d > most) most = d;
  if (most < 1) return null;
  let text: string | null = null;
  positions.toExit.forEach((d, s) => {
    if (d !== most) return;
    const t = canonicalText(boardText(positions.puzzle, placesOf(positions.keys[s]!, positions.puzzle.pieces.length, positions.puzzle.size)));
    if (text === null || t < text) text = t;
  });
  return { moves: most, text: text! };
}
