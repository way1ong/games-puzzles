// "The chest" (docs/slide/SPEC.md, "Скринька"): every piece moves up, down, left or right as far as the cells are
// free — one piece, one straight way, any number of cells is one move — and stops at blocks and the frame; no piece
// leaves the frame, and the chest is out as soon as it stands over the slot; boards read and write as text; a
// position and the same with two alike blocks swapped, or seen in a mirror, are one; random boards keep the rules;
// the count of every position gives the fewest moves (checked by a plain search from the start), and the hint walks
// the fewest moves out from anywhere.
import { describe, expect, it } from 'vitest';
import { nextInt, seedFromText } from '../../../shared/core/rng.ts';
import { SLIDE } from '../config.ts';
import { boxText, cellsOf, exitSpot, isOut, keyOf, mirrorText, movesOf, parseBox, plainText, reachOf, slideBlock, textOfKey, wayOf, type Spots } from './box.ts';
import { randomBox } from './box-boards.ts';
import { allPositions, fewestFrom, hardest, layersOf, nextMove, textAt } from './box-solve.ts';
import { canonicalText } from './unblock.ts';

const rows = (...r: string[]) => r.join('');
/** The chest right over the slot but a row up: one move down. */
const ONE = rows('....', '....', '.AA.', '.AA.', '....');
/** The chest in the top left corner of an empty frame: down and right are two moves, in either order. */
const CORNER = rows('AA..', 'AA..', '....', '....', '....');
/** A small block under the slot: aside first, then the chest down — 2 moves. */
const UNDER = rows('.AA.', '.AA.', '....', '....', '.B..');
/** Two standing blocks under the chest: each aside, then the chest down — 3 moves. */
const THREE = rows('.AA.', '.AA.', '.BC.', '.BC.', '....');
/** Fourteen small blocks and two free cells: a long way, and few enough positions for the plain search. */
const CROWD = rows('BAAC', 'DAAE', 'F.G.', 'HIJK', 'LMNO');

/** The fewest moves by a plain search from the start over boards as text (no keys, no counting from the end). */
function plainFewest(text: string): number {
  const start = canonicalText(text);
  const seen = new Set([start]);
  let layer = [start];
  for (let depth = 0; layer.length; depth++) {
    const next: string[] = [];
    for (const board of layer) {
      const { puzzle, spots } = parseBox(board);
      if (isOut(puzzle, spots)) return depth;
      for (const move of movesOf(puzzle, spots)) {
        const after = canonicalText(boxText(puzzle, slideBlock(puzzle, spots, move)!));
        if (!seen.has(after)) {
          seen.add(after);
          next.push(after);
        }
      }
    }
    layer = next;
  }
  return -1;
}

describe('a board', () => {
  it('reads the chest and the blocks from text: their shapes and top left cells', () => {
    const { puzzle, spots } = parseBox(rows('BAAC', 'DAAC', 'EE.F', '...F', 'G...'));
    expect([puzzle.cols, puzzle.rows]).toEqual([SLIDE.box.cols, SLIDE.box.rows]);
    expect(puzzle.shapes).toEqual(['chest', 'single', 'standing', 'single', 'lying', 'standing', 'single']);
    expect(spots).toEqual([1, 0, 3, 4, 8, 11, 16]);
    expect(boxText(puzzle, spots)).toBe(rows('BAAC', 'DAAC', 'EE.F', '...F', 'G...'));
  });

  it('turns down boards that break the rules', () => {
    expect(() => parseBox('AA..')).toThrow(); // not 4 × 5
    expect(() => parseBox(rows('....', '.BB.', '....', '....', '....'))).toThrow(); // no chest
    expect(() => parseBox(rows('AAA.', 'AA..', '....', '....', '....'))).toThrow(); // the chest not a square of 2 × 2
    expect(() => parseBox(rows('AA..', 'AA..', 'BBB.', '....', '....'))).toThrow(); // a block of three
    expect(() => parseBox(rows('AA..', 'AA..', 'BB..', 'BB..', '....'))).toThrow(); // a second big piece
    expect(() => parseBox(rows('AA..', 'AA.B', 'B...', '....', '....'))).toThrow(); // a block across two rows' ends
    expect(() => parseBox(rows('AA..', 'AA..', 'B.B.', '....', '....'))).toThrow(); // a block in two parts
    expect(() => parseBox(rows('AA..', 'AA..', 'b...', '....', '....'))).toThrow(); // not a letter of a piece
  });

  it('writes a board and its mirror image in reading order; one text for both', () => {
    const text = rows('BAA.', 'CAA.', 'CDD.', '....', '...E');
    const mirror = mirrorText(text);
    expect(mirror).toBe(rows('.AAB', '.AAC', '.DDC', '....', 'E...'));
    expect(mirrorText(mirror)).toBe(text);
    expect(plainText(text)).toBe(plainText(mirror));
    expect([text, mirror]).toContain(plainText(text));
  });
});

describe('moves', () => {
  it('a piece goes up, down, left or right until a block or the frame', () => {
    const { puzzle, spots } = parseBox(THREE);
    expect(reachOf(puzzle, spots, 0)).toEqual({ left: 1, right: 1, up: 0, down: 0 });
    expect(reachOf(puzzle, spots, 1)).toEqual({ left: 1, right: 0, up: 0, down: 1 });
    expect(reachOf(puzzle, spots, 2)).toEqual({ left: 0, right: 1, up: 0, down: 1 });
    expect(movesOf(puzzle, spots)).toEqual([
      { piece: 0, to: 0 },
      { piece: 0, to: 2 },
      { piece: 1, to: 8 },
      { piece: 1, to: 13 },
      { piece: 2, to: 11 },
      { piece: 2, to: 14 },
    ]);
  });

  it('a move is one piece in one straight way, any number of cells; not across, through a block or beyond the frame', () => {
    const corner = parseBox(CORNER);
    expect(wayOf(corner.puzzle, corner.spots, { piece: 0, to: 12 })).toEqual({ way: 'down', cells: 3 });
    expect(slideBlock(corner.puzzle, corner.spots, { piece: 0, to: 12 })).toEqual([12]); // three cells at once
    expect(slideBlock(corner.puzzle, corner.spots, { piece: 0, to: 13 })).toBeNull(); // down and right: two moves
    expect(slideBlock(corner.puzzle, corner.spots, { piece: 0, to: 0 })).toBeNull(); // where it is
    expect(slideBlock(corner.puzzle, corner.spots, { piece: 0, to: 3 })).toBeNull(); // beyond the frame on the right
    expect(slideBlock(corner.puzzle, corner.spots, { piece: 0, to: 16 })).toBeNull(); // beyond the frame below
    const three = parseBox(THREE);
    expect(slideBlock(three.puzzle, three.spots, { piece: 0, to: 9 })).toBeNull(); // through the blocks under it
    expect(slideBlock(three.puzzle, three.spots, { piece: 1, to: 10 })).toBeNull(); // into the other block
    expect(slideBlock(three.puzzle, three.spots, { piece: 1, to: 8 })).toEqual([1, 8, 10]);
  });

  it('the slot lets only the chest out: a block under it stays in the frame; the chest over it is out', () => {
    const under = parseBox(UNDER);
    expect(reachOf(under.puzzle, under.spots, 1)).toEqual({ left: 1, right: 2, up: 2, down: 0 });
    expect(movesOf(under.puzzle, under.spots).every((m) => cellsOf(under.puzzle, under.puzzle.shapes[m.piece]!, m.to).every((c) => c < 20))).toBe(true);
    const { puzzle, spots } = parseBox(ONE);
    expect(isOut(puzzle, spots)).toBe(false);
    expect(reachOf(puzzle, spots, 0).down).toBe(1); // to the bottom row, not beyond
    const out = slideBlock(puzzle, spots, { piece: 0, to: exitSpot(puzzle) })!;
    expect(isOut(puzzle, out)).toBe(true);
    expect(isOut(puzzle, slideBlock(puzzle, out, { piece: 0, to: exitSpot(puzzle) - 1 })!)).toBe(false); // at the bottom, beside the slot
  });
});

describe('a position as one number', () => {
  it('is the same when two alike blocks swap places, or for the mirror image; another position, another number', () => {
    const { puzzle, spots } = parseBox(rows('BAAC', '.AA.', 'DEEF', 'D..F', '.GG.'));
    const swapped = spots.slice();
    [swapped[1], swapped[2]] = [swapped[2]!, swapped[1]!]; // the two small blocks
    expect(boxText(puzzle, swapped)).not.toBe(boxText(puzzle, spots));
    expect(keyOf(puzzle, swapped)).toBe(keyOf(puzzle, spots));
    const mirror = parseBox(mirrorText(boxText(puzzle, spots)));
    expect(keyOf(mirror.puzzle, mirror.spots)).toBe(keyOf(puzzle, spots));
    expect(keyOf(puzzle, slideBlock(puzzle, spots, { piece: 6, to: 16 })!)).not.toBe(keyOf(puzzle, spots));
  });

  it('gives the board back: the text of the position or of its mirror image', () => {
    const text = rows('B..C', 'AAD.', 'AAD.', 'EE..', '.FF.');
    const { puzzle, spots } = parseBox(text);
    const back = textOfKey(keyOf(puzzle, spots), puzzle.cols, puzzle.rows);
    expect([text, mirrorText(text)]).toContain(back);
  });
});

describe('random boards', () => {
  it('keep the rules: no piece over another or beyond the frame, so many cells free, the chest not out yet', () => {
    let state = seedFromText('box-boards');
    for (let k = 0; k < 200; k++) {
      const draw = nextInt(state, 13);
      const free = 2 + draw.value;
      const b = randomBox(draw.state, free, (k % 10) / 10);
      state = b.state;
      const cells = b.puzzle.shapes.flatMap((s, i) => cellsOf(b.puzzle, s, b.spots[i]!));
      expect(new Set(cells).size).toBe(cells.length);
      expect(cells.length).toBe(b.puzzle.cols * b.puzzle.rows - free);
      expect(b.puzzle.shapes[0]).toBe('chest');
      expect(isOut(b.puzzle, b.spots)).toBe(false);
      expect(parseBox(boxText(b.puzzle, b.spots)).spots).toEqual(b.spots);
    }
  });

  it('the same seed — the same board', () => {
    expect(randomBox(7, 3, 0.5)).toEqual(randomBox(7, 3, 0.5));
    expect(randomBox(7, 3, 0.5).spots).not.toEqual(randomBox(8, 3, 0.5).spots);
  });
});

describe('every position', () => {
  it('counts the fewest moves of small boards', () => {
    for (const [text, moves] of [
      [ONE, 1],
      [CORNER, 2],
      [UNDER, 2],
      [THREE, 3],
    ] as const) {
      const { puzzle, spots } = parseBox(text);
      expect(fewestFrom(allPositions(puzzle, spots)!, spots), text).toBe(moves);
      expect(plainFewest(text), text).toBe(moves);
    }
  });

  it('as a plain search from the start, on random boards; the hint walks exactly that many moves out', () => {
    let checked = 0;
    for (let seed = 1; checked < 20; seed++) {
      const b = randomBox(seedFromText(`box-solve:${seed}`), 2 + (seed % 12), 0.4);
      const positions = allPositions(b.puzzle, b.spots, 4000);
      if (!positions) continue;
      const fewest = fewestFrom(positions, b.spots);
      expect(fewest).toBe(plainFewest(boxText(b.puzzle, b.spots)));
      if (fewest < 0) continue;
      let spots: Spots = b.spots;
      for (let n = 0; n < fewest; n++) spots = slideBlock(b.puzzle, spots, nextMove(positions, spots)!)!;
      expect(isOut(b.puzzle, spots)).toBe(true);
      expect(nextMove(positions, spots)).toBeNull();
      checked++;
    }
  });

  it('the hint leads out from any position the player reaches, in the fewest moves from there', () => {
    const { puzzle, spots: start } = parseBox(CROWD);
    const positions = allPositions(puzzle, start)!;
    let state = seedFromText('box-wander');
    for (let walk = 0; walk < 15; walk++) {
      // wander off by random moves, then follow the hints
      let spots: Spots = start;
      for (let k = 0; k < 12; k++) {
        const moves = movesOf(puzzle, spots);
        const draw = nextInt(state, moves.length);
        state = draw.state;
        spots = slideBlock(puzzle, spots, moves[draw.value]!)!;
      }
      const fewest = fewestFrom(positions, spots);
      expect(fewest).toBe(plainFewest(boxText(puzzle, spots)));
      for (let n = 0; n < fewest; n++) spots = slideBlock(puzzle, spots, nextMove(positions, spots)!)!;
      expect(isOut(puzzle, spots)).toBe(true);
    }
  });

  it('a board and its mirror image need the same moves', () => {
    const own = parseBox(CROWD);
    const mirror = parseBox(mirrorText(CROWD));
    const fewest = fewestFrom(allPositions(own.puzzle, own.spots)!, own.spots);
    expect(fewest).toBeGreaterThan(2);
    expect(fewestFrom(allPositions(mirror.puzzle, mirror.spots)!, mirror.spots)).toBe(fewest);
    expect(plainFewest(mirrorText(CROWD))).toBe(fewest);
  });

  it('lays the positions out by their moves to the end; the hardest start is the farthest, written in reading order', () => {
    const { puzzle, spots } = parseBox(THREE);
    const positions = allPositions(puzzle, spots)!;
    const layers = layersOf(positions);
    expect(layers.flat().length).toBe(positions.toExit.filter((d) => d >= 0).length);
    layers.forEach((layer, d) => layer.forEach((s) => expect(positions.toExit[s]).toBe(d)));
    expect(layers[0]!.every((s) => isOut(puzzle, parseBox(textAt(positions, s)).spots))).toBe(true);
    const top = hardest(positions)!;
    expect(top.moves).toBe(layers.length - 1);
    expect(top.text).toBe(plainText(top.text));
    expect(plainFewest(top.text)).toBe(top.moves);
  });

  it('gives up past its limit', () => {
    const { puzzle, spots } = parseBox(THREE);
    const all = allPositions(puzzle, spots)!;
    expect(allPositions(puzzle, spots, all.keys.length - 1)).toBeNull();
    expect(allPositions(puzzle, spots, all.keys.length)).not.toBeNull();
  });
});
