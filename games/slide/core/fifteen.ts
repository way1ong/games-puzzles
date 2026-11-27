// The fifteen (docs/slide/SPEC.md, "П’ятнашки"): a square of tiles 1 … n²−1 and one gap. A tap on a tile in the
// gap's row or column slides it, and the tiles between, onto the gap; each tile slid is a move. Shuffles come from a
// seed and can always be solved. Pure.
import { nextInt } from '../../../shared/core/rng.ts';

/** Tiles row by row from the top left; 0 is the gap. */
export type Tiles = readonly number[];

/** Tiles across (and down) of a board. */
export function sizeOf(tiles: Tiles): number {
  return Math.round(Math.sqrt(tiles.length));
}

/** The board put in order: 1, 2, 3 … and the gap last. */
export function solvedTiles(size: number): number[] {
  return Array.from({ length: size * size }, (_, i) => (i + 1) % (size * size));
}

export function isSolved(tiles: Tiles): boolean {
  return tiles.every((t, i) => t === (i + 1) % tiles.length);
}

/** The cell where a tile belongs. */
export function homeOf(tile: number, size: number): number {
  return tile === 0 ? size * size - 1 : tile - 1;
}

/**
 * Whether the tiles can be put in order. Half of all arrangements never can: the tiles out of order (pairs) and, on
 * an even board, the gap's row from the bottom must add up to the parity of the goal.
 */
export function canBeSolved(tiles: Tiles): boolean {
  const size = sizeOf(tiles);
  const order = tiles.filter((t) => t !== 0);
  let inversions = 0;
  for (let i = 0; i < order.length; i++) for (let j = i + 1; j < order.length; j++) if (order[i]! > order[j]!) inversions++;
  if (size % 2 === 1) return inversions % 2 === 0;
  const gapRowFromBottom = size - Math.floor(tiles.indexOf(0) / size);
  return (inversions + gapRowFromBottom) % 2 === 1;
}

/**
 * The cells whose tiles slide when the tile at `cell` is tapped, the one next to the gap first; empty when the cell
 * is the gap or not in its row or column.
 */
export function lineToGap(tiles: Tiles, cell: number): number[] {
  const size = sizeOf(tiles);
  const gap = tiles.indexOf(0);
  if (cell === gap || cell < 0 || cell >= tiles.length) return [];
  const [gr, gc, r, c] = [Math.floor(gap / size), gap % size, Math.floor(cell / size), cell % size];
  if (gr !== r && gc !== c) return [];
  const step = gr === r ? Math.sign(c - gc) : size * Math.sign(r - gr);
  const out: number[] = [];
  for (let at = gap + step; ; at += step) {
    out.push(at);
    if (at === cell) return out;
  }
}

/** The tiles that may slide one step: the gap's neighbours. */
export function nextToGap(tiles: Tiles): number[] {
  const size = sizeOf(tiles);
  const gap = tiles.indexOf(0);
  const [r, c] = [Math.floor(gap / size), gap % size];
  const out: number[] = [];
  if (r > 0) out.push(gap - size);
  if (r < size - 1) out.push(gap + size);
  if (c > 0) out.push(gap - 1);
  if (c < size - 1) out.push(gap + 1);
  return out;
}

/** Slides the tile at `cell` (with the tiles between it and the gap); null when it cannot slide. */
export function slide(tiles: Tiles, cell: number): { tiles: number[]; moved: number[] } | null {
  const line = lineToGap(tiles, cell);
  if (!line.length) return null;
  const next = tiles.slice();
  let gap = tiles.indexOf(0);
  const moved: number[] = [];
  for (const at of line) {
    moved.push(next[at]!);
    next[gap] = next[at]!;
    next[at] = 0;
    gap = at;
  }
  return { tiles: next, moved };
}

/** Moves one tile (a neighbour of the gap, by its number) onto the gap; null when it is not next to the gap. */
export function stepTile(tiles: Tiles, tile: number): number[] | null {
  const at = tiles.indexOf(tile);
  if (tile === 0 || !nextToGap(tiles).includes(at)) return null;
  return slide(tiles, at)!.tiles;
}

/**
 * A shuffle from a seed: every arrangement that can be solved is equally likely; never solved already. `least`
 * (where the game can count it) — the fewest moves the shuffle may need; `fewest` counts them.
 */
export function shuffle(
  size: number,
  state: number,
  least = 0,
  fewest: (tiles: Tiles) => number = () => Infinity,
): { tiles: number[]; state: number } {
  for (;;) {
    const tiles = solvedTiles(size);
    for (let i = tiles.length - 1; i > 0; i--) {
      const draw = nextInt(state, i + 1);
      state = draw.state;
      [tiles[i], tiles[draw.value]] = [tiles[draw.value]!, tiles[i]!];
    }
    if (!canBeSolved(tiles)) {
      // swapping the first two tiles (not the gap) flips the parity: one to one onto the half that can be solved
      const [a, b] = tiles.flatMap((t, i) => (t ? [i] : [])).slice(0, 2) as [number, number];
      [tiles[a], tiles[b]] = [tiles[b]!, tiles[a]!];
    }
    if (!isSolved(tiles) && (least <= 0 || fewest(tiles) >= least)) return { tiles, state };
  }
}

/** The arrangement as text: a key for positions on a way. */
export function tilesKey(tiles: Tiles): string {
  return tiles.join(',');
}
