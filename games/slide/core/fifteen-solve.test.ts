// Ways to put the tiles in order (docs/slide/SPEC.md, "Підказка"): every way ends in order, each step moves a tile
// next to the gap; on 3x3 the way is the shortest (checked against every position); on larger boards a tile once
// placed is never moved again; a hint keeps to its way while the player follows it.
import { describe, expect, it } from 'vitest';
import { canBeSolved, isSolved, shuffle, slide, solvedTiles, stepTile, tilesKey } from './fifteen.ts';
import { fewestMoves, findHint, nextOnWay, placingOrder, solveTiles, wayFrom, type TileWay } from './fifteen-solve.ts';

/** The moves of every 3x3 position from the end (all 181 440). */
function allOf3x3(): Map<string, number> {
  const start = solvedTiles(3);
  const dist = new Map([[tilesKey(start), 0]]);
  const queue = [start];
  for (let i = 0; i < queue.length; i++) {
    const tiles = queue[i]!;
    const gap = tiles.indexOf(0);
    for (const cell of [gap - 3, gap + 3, gap % 3 > 0 ? gap - 1 : -1, gap % 3 < 2 ? gap + 1 : -1]) {
      if (cell < 0 || cell > 8) continue;
      const next = slide(tiles, cell)!.tiles;
      const key = tilesKey(next);
      if (!dist.has(key)) {
        dist.set(key, dist.get(tilesKey(tiles))! + 1);
        queue.push(next);
      }
    }
  }
  return dist;
}

const play = (tiles: readonly number[], steps: readonly number[]) => {
  let now: number[] | null = tiles.slice();
  for (const tile of steps) {
    now = stepTile(now, tile);
    if (!now) return null;
  }
  return now;
};

describe('a way to the end', () => {
  it('ends in order on every size, each step a tile next to the gap', () => {
    let state = 9;
    for (const size of [3, 4, 5, 6, 7]) {
      for (let k = 0; k < (size > 5 ? 3 : 12); k++) {
        const s = shuffle(size, state);
        state = s.state;
        const end = play(s.tiles, solveTiles(s.tiles));
        expect(end && isSolved(end)).toBe(true);
      }
    }
  });

  it('on 3x3 is the shortest — as the count over all positions', () => {
    const dist = allOf3x3();
    expect(dist.size).toBe(181_440);
    let state = 21;
    for (let k = 0; k < 150; k++) {
      const s = shuffle(3, state);
      state = s.state;
      expect(fewestMoves(s.tiles)).toBe(dist.get(tilesKey(s.tiles)));
    }
    expect([...dist.values()].reduce((a, b) => Math.max(a, b), 0)).toBe(31);
  });

  it('on larger boards never moves a tile again once its group is placed', () => {
    let state = 33;
    for (const size of [4, 5]) {
      const groups = placingOrder(size);
      expect(groups.flat().sort((a, b) => a - b)).toEqual([...Array(size * size - 1).keys()].map((i) => i + 1));
      for (let k = 0; k < 8; k++) {
        const s = shuffle(size, state);
        state = s.state;
        const steps = solveTiles(s.tiles);
        let now = s.tiles.slice();
        const placed = new Set<number>();
        let g = 0;
        for (const tile of steps) {
          expect(placed.has(tile)).toBe(false);
          now = stepTile(now, tile)!;
          // a group counts as placed once it and every group before it are home together
          while (g < groups.length - 1 && groups.slice(0, g + 1).flat().every((t) => now[t - 1] === t)) {
            for (const t of groups[g]!) placed.add(t);
            g++;
          }
        }
        expect(isSolved(now)).toBe(true);
      }
    }
  });

  it('counts exactly only on 3x3', () => {
    expect(() => fewestMoves(solvedTiles(4))).toThrow();
    expect(fewestMoves(solvedTiles(3))).toBe(0);
  });
});

describe('a hint', () => {
  it('followed to the end, stays on one way and ends in order', () => {
    let tiles = shuffle(4, 77).tiles;
    let kept: TileWay | null = null;
    let first: TileWay | null = null;
    for (let n = 0; n < 400 && !isSolved(tiles); n++) {
      const hint: { tile: number; way: TileWay } = findHint(tiles, kept)!;
      first ??= hint.way;
      expect(hint.way).toBe(first);
      tiles = stepTile(tiles, hint.tile)!;
      kept = hint.way;
    }
    expect(isSolved(tiles)).toBe(true);
    expect(findHint(tiles, kept)).toBeNull();
  });

  it('after the player leaves the way, starts a new way from where they are', () => {
    const tiles = shuffle(4, 78).tiles;
    const way = wayFrom(tiles);
    const off = tiles.slice();
    // a step that is not the way's first
    const other = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].find((t) => t !== way.steps[0] && stepTile(off, t))!;
    const moved = stepTile(off, other)!;
    expect(nextOnWay(way, moved)).toBeNull();
    const hint = findHint(moved, way)!;
    expect(hint.way).not.toBe(way);
    expect(hint.way.keys[0]).toBe(tilesKey(moved));
    expect(canBeSolved(moved)).toBe(true);
  });
});
