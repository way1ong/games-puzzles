// The fifteen's board (docs/slide/SPEC.md, "П’ятнашки"): a tap slides the tile with the tiles between it and the gap;
// half of all arrangements can never be solved, and shuffles are only of the other half; the same seed — the same
// shuffle; a 3x3 shuffle is never nearly done.
import { describe, expect, it } from 'vitest';
import { nextInt } from '../../../shared/core/rng.ts';
import { canBeSolved, isSolved, lineToGap, nextToGap, shuffle, slide, solvedTiles, stepTile } from './fifteen.ts';
import { fewestMoves } from './fifteen-solve.ts';

/** Random legal slides from the end: every arrangement reached this way can be solved. */
function walked(size: number, steps: number, seed: number): number[] {
  let tiles = solvedTiles(size);
  let state = seed;
  for (let i = 0; i < steps; i++) {
    const near = nextToGap(tiles);
    const draw = nextInt(state, near.length);
    state = draw.state;
    tiles = slide(tiles, near[draw.value]!)!.tiles;
  }
  return tiles;
}

describe('the board', () => {
  it('in order: 1 … n²−1, the gap last', () => {
    expect(solvedTiles(3)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 0]);
    expect(isSolved(solvedTiles(4))).toBe(true);
    expect(isSolved([1, 2, 3, 4, 5, 6, 7, 0, 8])).toBe(false);
  });

  it('a tap in the gap’s row or column slides the line between; elsewhere — nothing', () => {
    const tiles = solvedTiles(4); // the gap at the bottom right (15)
    expect(lineToGap(tiles, 12)).toEqual([14, 13, 12]);
    expect(lineToGap(tiles, 3)).toEqual([11, 7, 3]);
    expect(lineToGap(tiles, 5)).toEqual([]);
    expect(lineToGap(tiles, 15)).toEqual([]);
    const done = slide(tiles, 12)!;
    expect(done.moved).toEqual([15, 14, 13]);
    expect(done.tiles.slice(12)).toEqual([0, 13, 14, 15]);
    expect(slide(tiles, 5)).toBeNull();
  });

  it('one step moves only a tile next to the gap', () => {
    const tiles = solvedTiles(3);
    expect(nextToGap(tiles).sort()).toEqual([5, 7]);
    expect(stepTile(tiles, 8)).toEqual([1, 2, 3, 4, 5, 6, 7, 0, 8]);
    expect(stepTile(tiles, 1)).toBeNull();
    expect(stepTile(tiles, 0)).toBeNull();
  });
});

describe('which arrangements can be solved', () => {
  it('every arrangement reached by slides from the end can — odd and even boards', () => {
    for (const size of [3, 4, 5]) for (let seed = 1; seed <= 30; seed++) expect(canBeSolved(walked(size, 60 + seed, seed))).toBe(true);
  });

  it('two tiles swapped — never (the old puzzle with 14 and 15 swapped)', () => {
    for (const size of [3, 4, 5]) {
      for (let seed = 1; seed <= 20; seed++) {
        const tiles = walked(size, 50, seed * 7);
        const [a, b] = tiles.flatMap((t, i) => (t ? [i] : [])).slice(seed % 3, (seed % 3) + 2) as [number, number];
        [tiles[a], tiles[b]] = [tiles[b]!, tiles[a]!];
        expect(canBeSolved(tiles)).toBe(false);
      }
    }
    const loyd = solvedTiles(4);
    [loyd[13], loyd[14]] = [loyd[14]!, loyd[13]!];
    expect(canBeSolved(loyd)).toBe(false);
  });
});

describe('a shuffle', () => {
  it('can be solved, is not solved, holds every tile once', () => {
    let state = 11;
    for (const size of [3, 4, 5]) {
      for (let k = 0; k < 40; k++) {
        const s = shuffle(size, state);
        state = s.state;
        expect(canBeSolved(s.tiles)).toBe(true);
        expect(isSolved(s.tiles)).toBe(false);
        expect([...s.tiles].sort((a, b) => a - b)).toEqual([...Array(size * size).keys()]);
      }
    }
  });

  it('is never the board in order, even where that would often come up (2x2: one of 12)', () => {
    let state = 8;
    const seen = new Set<string>();
    for (let k = 0; k < 300; k++) {
      const s = shuffle(2, state);
      state = s.state;
      expect(isSolved(s.tiles)).toBe(false);
      seen.add(s.tiles.join());
    }
    expect(seen.size).toBe(11);
  });

  it('the same seed — the same shuffle; another seed — another', () => {
    expect(shuffle(4, 42).tiles).toEqual(shuffle(4, 42).tiles);
    expect(shuffle(4, 42).tiles).not.toEqual(shuffle(4, 43).tiles);
  });

  it('puts the gap anywhere, not only in its corner', () => {
    const gaps = new Set<number>();
    let state = 5;
    for (let k = 0; k < 200; k++) {
      const s = shuffle(3, state);
      state = s.state;
      gaps.add(s.tiles.indexOf(0));
    }
    expect(gaps.size).toBe(9);
  });

  it('on 3x3, needs at least the fewest moves asked for', () => {
    let state = 3;
    for (let k = 0; k < 40; k++) {
      const s = shuffle(3, state, 16, fewestMoves);
      state = s.state;
      expect(fewestMoves(s.tiles)).toBeGreaterThanOrEqual(16);
    }
  });
});
