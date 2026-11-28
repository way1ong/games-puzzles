// Every position of a puzzle of "The chest" (docs/slide/SPEC.md, "Скринька", "Підказка"): all positions the pieces
// can reach from the start, and for each, the fewest moves until the chest stands over the slot. Alike blocks are not
// told apart, nor a position and its mirror image (box.ts, keyOf): they need the same moves. Every move can be taken
// back, so from any position the player reaches, the hint is a move one step nearer, and a way out exists from every
// position if it exists from the start. Pure.
import { BOX_SHAPES } from '../config.ts';
import { digitsOf, exitSpot, keyOf, keyTable, mirrorsAlike, movesOf, plainText, shapeIndex, sizeOf, textOfKey, type BoxMove, type BoxPuzzle, type Spots } from './box.ts';

export interface BoxPositions {
  puzzle: BoxPuzzle;
  /** Each position's key (box.ts, keyOf) and its number. */
  index: Map<number, number>;
  keys: number[];
  /** The fewest moves from each position until the chest is out; -1 — no way out from it. */
  toExit: Int16Array;
}

/** The digit of the chest's top left corner in a key (box.ts). */
const CHEST_DIGIT = 2 + shapeIndex('chest');
const SIZES = BOX_SHAPES.map(sizeOf);

/** All positions reachable from `spots` (a position and its mirror image as one); null when there are more than `limit`. */
export function allPositions(puzzle: BoxPuzzle, spots: Spots, limit = Infinity): BoxPositions | null {
  const { cols, rows } = puzzle;
  const { footprint, mirror } = keyTable(cols, rows);
  const alike = mirrorsAlike();
  const exit = exitSpot(puzzle);
  const digits = new Uint8Array(cols * rows);
  const index = new Map<number, number>();
  const keys = [keyOf(puzzle, spots)];
  index.set(keys[0]!, 0);
  const edges: number[] = [];
  const edgeStart = [0];
  const out: number[] = [];
  /** One more edge from the current position: to the one with these keys (its own and its mirror image's). */
  const reach = (own: number, mirrored: number) => {
    const key = alike && mirrored < own ? mirrored : own;
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
    digitsOf(key, digits);
    if (digits[exit] === CHEST_DIGIT) out.push(s);
    let mirrored = 0;
    for (let cell = 0; cell < digits.length; cell++) if (digits[cell]! >= 2) mirrored += mirror[digits[cell]! - 2]![cell]!;
    for (let cell = 0; cell < digits.length; cell++) {
      if (digits[cell]! < 2) continue;
      const shape = digits[cell]! - 2;
      const [w, h] = SIZES[shape]!;
      const fp = footprint[shape]!;
      const mp = mirror[shape]!;
      const rest = key - fp[cell]!;
      const restMirrored = mirrored - mp[cell]!;
      const x = cell % cols;
      const y = (cell - x) / cols;
      // each way, cell by cell, while the column or row the piece's leading side enters is free
      for (let k = 1; x - k >= 0; k++) {
        let free = true;
        for (let r = y; r < y + h && free; r++) free = digits[r * cols + x - k] === 0;
        if (!free) break;
        reach(rest + fp[cell - k]!, restMirrored + mp[cell - k]!);
      }
      for (let k = 1; x + w - 1 + k < cols; k++) {
        let free = true;
        for (let r = y; r < y + h && free; r++) free = digits[r * cols + x + w - 1 + k] === 0;
        if (!free) break;
        reach(rest + fp[cell + k]!, restMirrored + mp[cell + k]!);
      }
      for (let k = 1; y - k >= 0; k++) {
        let free = true;
        for (let c = x; c < x + w && free; c++) free = digits[(y - k) * cols + c] === 0;
        if (!free) break;
        reach(rest + fp[cell - k * cols]!, restMirrored + mp[cell - k * cols]!);
      }
      for (let k = 1; y + h - 1 + k < rows; k++) {
        let free = true;
        for (let c = x; c < x + w && free; c++) free = digits[(y + h - 1 + k) * cols + c] === 0;
        if (!free) break;
        reach(rest + fp[cell + k * cols]!, restMirrored + mp[cell + k * cols]!);
      }
    }
    edgeStart.push(edges.length);
  }
  const toExit = new Int16Array(keys.length).fill(-1);
  for (const s of out) toExit[s] = 0;
  for (let q = 0; q < out.length; q++) {
    const s = out[q]!;
    for (let e = edgeStart[s]!; e < edgeStart[s + 1]!; e++) {
      const j = edges[e]!;
      if (toExit[j]! < 0) {
        toExit[j] = toExit[s]! + 1;
        out.push(j);
      }
    }
  }
  return { puzzle, index, keys, toExit };
}

/** The fewest moves until the chest is out from these spots; -1 — none (or not a position of this puzzle). */
export function fewestFrom(positions: BoxPositions, spots: Spots): number {
  const at = positions.index.get(keyOf(positions.puzzle, spots));
  return at === undefined ? -1 : positions.toExit[at]!;
}

/** The hint: the first move (in the order of movesOf) one step nearer the end; null at the end or with no way out. */
export function nextMove(positions: BoxPositions, spots: Spots): BoxMove | null {
  const now = fewestFrom(positions, spots);
  if (now <= 0) return null;
  for (const move of movesOf(positions.puzzle, spots)) {
    const next = spots.slice();
    next[move.piece] = move.to;
    if (fewestFrom(positions, next) === now - 1) return move;
  }
  return null;
}

/** The positions at each number of moves from the end: their numbers (in `keys`), the farthest last. */
export function layersOf(positions: BoxPositions): number[][] {
  const layers: number[][] = [];
  positions.toExit.forEach((d, s) => {
    if (d < 0) return;
    while (layers.length <= d) layers.push([]);
    layers[d]!.push(s);
  });
  return layers;
}

/** The text of a position by its number: of it or of its mirror image, whichever is first in order (box.ts, plainText). */
export function textAt(positions: BoxPositions, s: number): string {
  return plainText(textOfKey(positions.keys[s]!, positions.puzzle.cols, positions.puzzle.rows));
}

/** The hardest start of these positions: the farthest from the end (its text the first in order on a tie). */
export function hardest(positions: BoxPositions): { moves: number; text: string } | null {
  const layers = layersOf(positions);
  const most = layers.length - 1;
  if (most < 1) return null;
  const texts = layers[most]!.map((s) => textAt(positions, s)).sort();
  return { moves: most, text: texts[0]! };
}
