// Ways to put the tiles of the fifteen in order (docs/slide/SPEC.md, "Підказка"). On 3x3 — the shortest way. On a
// larger board — as people do: tile by tile, the top row and the left column, then again on the smaller board, and
// the last 3x3 by the shortest way; a tile once placed is never moved again, so following the way never undoes what
// is done. Every step of a way moves one tile next to the gap onto it. Pure.
import { homeOf, isSolved, sizeOf, tilesKey, type Tiles } from './fifteen.ts';

/** A heap of search nodes by their estimate (fewer first; on a tie the deeper one first). */
class Heap {
  private items: { f: number; g: number; id: number }[] = [];
  get size(): number {
    return this.items.length;
  }
  push(item: { f: number; g: number; id: number }): void {
    const a = this.items;
    a.push(item);
    for (let i = a.length - 1; i > 0; ) {
      const p = (i - 1) >> 1;
      if (!before(a[i]!, a[p]!)) break;
      [a[i], a[p]] = [a[p]!, a[i]!];
      i = p;
    }
  }
  pop(): { f: number; g: number; id: number } {
    const a = this.items;
    const top = a[0]!;
    const last = a.pop()!;
    if (a.length) {
      a[0] = last;
      for (let i = 0; ; ) {
        const [l, r] = [2 * i + 1, 2 * i + 2];
        let m = i;
        if (l < a.length && before(a[l]!, a[m]!)) m = l;
        if (r < a.length && before(a[r]!, a[m]!)) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m]!, a[i]!];
        i = m;
      }
    }
    return top;
  }
}

function before(x: { f: number; g: number }, y: { f: number; g: number }): boolean {
  return x.f < y.f || (x.f === y.f && x.g > y.g);
}

/**
 * The shortest way to bring `targets` home without touching the `fixed` cells; other tiles may move anywhere. The
 * search looks only at where the targets and the gap are (so other tiles are all alike to it), with the sum of the
 * targets' distances home as its estimate — never more than the moves still needed, so the way found is the
 * shortest. Returns the cells the gap moves to, in order; null when there is no way.
 */
function gapWalk(tiles: Tiles, size: number, targets: readonly number[], fixed: readonly boolean[]): number[] | null {
  const n = size * size;
  const home = targets.map((t) => homeOf(t, size));
  const start = [...targets.map((t) => tiles.indexOf(t)), tiles.indexOf(0)];
  const distance = (at: number, goal: number) => Math.abs(Math.floor(at / size) - Math.floor(goal / size)) + Math.abs((at % size) - (goal % size));
  const estimate = (places: readonly number[]) => {
    let h = 0;
    for (let i = 0; i < home.length; i++) h += distance(places[i]!, home[i]!);
    return h;
  };
  const keyOf = (places: readonly number[]) => {
    let key = 0;
    for (const at of places) key = key * n + at;
    return key;
  };
  const nodes: { places: number[]; parent: number; g: number; key: number }[] = [{ places: start, parent: -1, g: 0, key: keyOf(start) }];
  const seen = new Map<number, number>([[nodes[0]!.key, 0]]);
  const heap = new Heap();
  heap.push({ f: estimate(start), g: 0, id: 0 });
  while (heap.size) {
    const { id, g } = heap.pop();
    const node = nodes[id]!;
    if (seen.get(node.key) !== id) continue; // found again since, by a shorter way
    if (estimate(node.places) === 0) {
      const walk: number[] = [];
      for (let at = id; nodes[at]!.parent >= 0; at = nodes[at]!.parent) walk.push(nodes[at]!.places[targets.length]!);
      return walk.reverse();
    }
    const gap = node.places[targets.length]!;
    const [r, c] = [Math.floor(gap / size), gap % size];
    for (const to of [r > 0 ? gap - size : -1, r < size - 1 ? gap + size : -1, c > 0 ? gap - 1 : -1, c < size - 1 ? gap + 1 : -1]) {
      if (to < 0 || fixed[to]) continue;
      const places = node.places.slice();
      const moved = places.indexOf(to);
      if (moved >= 0 && moved < targets.length) places[moved] = gap;
      places[targets.length] = to;
      const key = keyOf(places);
      const known = seen.get(key);
      if (known !== undefined && nodes[known]!.g <= g + 1) continue;
      const next = nodes.length;
      nodes.push({ places, parent: id, g: g + 1, key });
      seen.set(key, next);
      heap.push({ f: g + 1 + estimate(places), g: g + 1, id: next });
    }
  }
  return null;
}

/** Plays a walk of the gap on real tiles: the tiles moved, in order, and the tiles after. */
function play(tiles: Tiles, walk: readonly number[]): { steps: number[]; tiles: number[] } {
  const out = tiles.slice();
  const steps: number[] = [];
  let gap = out.indexOf(0);
  for (const to of walk) {
    steps.push(out[to]!);
    out[gap] = out[to]!;
    out[to] = 0;
    gap = to;
  }
  return { steps, tiles: out };
}

/** The groups of tiles in the order they are placed: one by one, the last two of a line together, the last 3x3 at once. */
export function placingOrder(size: number): number[][] {
  const groups: number[][] = [];
  const line = (cells: number[]) => {
    for (let i = 0; i < cells.length - 2; i++) groups.push([cells[i]! + 1]);
    groups.push(cells.slice(-2).map((c) => c + 1));
  };
  for (let k = 0; k < size - 3; k++) {
    line(Array.from({ length: size - k }, (_, i) => k * size + k + i));
    line(Array.from({ length: size - k - 1 }, (_, i) => (k + 1 + i) * size + k));
  }
  const start = size - 3;
  const rest: number[] = [];
  for (let r = start; r < size; r++) for (let c = start; c < size; c++) if (r * size + c !== size * size - 1) rest.push(r * size + c + 1);
  groups.push(rest);
  return groups;
}

/** A way to the end from these tiles: the tile to move at each step. */
export function solveTiles(tiles: Tiles): number[] {
  const size = sizeOf(tiles);
  const fixed = new Array<boolean>(size * size).fill(false);
  let now = tiles.slice();
  const steps: number[] = [];
  for (const group of placingOrder(size)) {
    const walk = gapWalk(now, size, group, fixed);
    if (!walk) throw new Error('These tiles cannot be put in order');
    const done = play(now, walk);
    steps.push(...done.steps);
    now = done.tiles;
    for (const t of group) fixed[homeOf(t, size)] = true;
  }
  if (!isSolved(now)) throw new Error('The way does not end in order');
  return steps;
}

/** The fewest moves to put a 3x3 in order (the shortest way); on larger boards use solveTiles. */
export function fewestMoves(tiles: Tiles): number {
  if (sizeOf(tiles) !== 3) throw new Error('Counted exactly only on 3x3');
  return solveTiles(tiles).length;
}

/** The positions of a way: keys[i] is before steps[i]; the last key is the end. */
export interface TileWay {
  keys: string[];
  steps: number[];
}

export function wayFrom(tiles: Tiles): TileWay {
  const steps = solveTiles(tiles);
  const keys = [tilesKey(tiles)];
  let now = tiles.slice();
  for (const tile of steps) {
    const at = now.indexOf(tile);
    const gap = now.indexOf(0);
    now[gap] = tile;
    now[at] = 0;
    keys.push(tilesKey(now));
  }
  return { keys, steps };
}

/** The next tile on a kept way from these tiles; null when the tiles are off the way (or at its end). */
export function nextOnWay(way: TileWay, tiles: Tiles): number | null {
  const at = way.keys.indexOf(tilesKey(tiles));
  return at >= 0 && at < way.steps.length ? way.steps[at]! : null;
}

/** A hint: the tile to move next, keeping to the way while the player follows it, a new way when they leave it. */
export function findHint(tiles: Tiles, kept: TileWay | null): { tile: number; way: TileWay } | null {
  if (isSolved(tiles)) return null;
  const onWay = kept ? nextOnWay(kept, tiles) : null;
  if (kept && onWay !== null) return { tile: onWay, way: kept };
  const way = wayFrom(tiles);
  return { tile: way.steps[0]!, way };
}
