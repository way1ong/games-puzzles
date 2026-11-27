// "Clear the way" (docs/slide/SPEC.md, "Звільни шлях"): pieces move only along themselves and stop at other pieces
// and the frame; the player's piece is out at the right side of its row; boards read and write as text; random
// boards keep the rules; the count of every position gives the fewest moves (checked by a plain search from the
// start), and the hint walks the fewest moves out from anywhere.
import { describe, expect, it } from 'vitest';
import { nextInt } from '../../../shared/core/rng.ts';
import { SLIDE } from '../config.ts';
import { randomBoard } from './boards.ts';
import { boardText, canonicalText, cellsOf, isOut, keyOf, movesOf, parseBoard, placesOf, reachOf, slidePiece, type Places, type Puzzle } from './unblock.ts';
import { allPositions, fewestFrom, hardest, nextMove } from './unblock-solve.ts';

const rows = (...r: string[]) => r.join('');
/** One standing piece shuts the way: move it, then go out — 2 moves. */
const ONE = rows('......', '...B..', 'AA.B..', '......', '......', '......');
/** A long standing piece can only go down, and a lying one is under it — 3 moves. */
const THREE = rows('....B.', '....B.', 'AA..B.', '......', '......', '...CC.');

/** The fewest moves by a plain search from the start (no counting from the way out). */
function plainFewest(puzzle: Puzzle, start: Places): number {
  const seen = new Set([start.join()]);
  let layer: Places[] = [start];
  for (let depth = 0; layer.length; depth++) {
    if (layer.some((p) => isOut(puzzle, p))) return depth;
    const next: Places[] = [];
    for (const places of layer) {
      for (const move of movesOf(puzzle, places)) {
        const after = slidePiece(puzzle, places, move)!;
        if (!seen.has(after.join())) {
          seen.add(after.join());
          next.push(after);
        }
      }
    }
    layer = next;
  }
  return -1;
}

describe('a board', () => {
  it('reads pieces from text: lying or standing, their line, length and place', () => {
    const { puzzle, places } = parseBoard(THREE);
    expect(puzzle.size).toBe(SLIDE.unblock.size);
    expect(puzzle.pieces).toEqual([
      { across: true, line: SLIDE.unblock.exitRow, length: 2 },
      { across: false, line: 4, length: 3 },
      { across: true, line: 5, length: 2 },
    ]);
    expect(places).toEqual([0, 0, 3]);
    expect(boardText(puzzle, places)).toBe(THREE);
  });

  it('turns down boards that break the rules', () => {
    expect(() => parseBoard('AA.')).toThrow(); // not square
    expect(() => parseBoard(rows('......', '......', '..BB..', '......', '......', '......'))).toThrow(); // no player
    expect(() => parseBoard(rows('......', '.BB...', 'AA.B..', '......', '......', '......'))).toThrow(); // bent piece
    expect(() => parseBoard(rows('......', '......', 'AA....', '..BBBB', '......', '......'))).toThrow(); // too long
    expect(() => parseBoard(rows('......', 'A.....', 'A.....', '......', '......', '......'))).toThrow(); // standing player
    expect(() => parseBoard(rows('AA....', '......', '......', '......', '......', '......'))).toThrow(); // not in the row out
  });

  it('a piece goes along itself until a piece or the frame', () => {
    const { puzzle, places } = parseBoard(ONE);
    expect(reachOf(puzzle, places, 0)).toEqual({ least: 0, most: 1 });
    expect(reachOf(puzzle, places, 1)).toEqual({ least: 0, most: 4 });
    expect(movesOf(puzzle, places)).toEqual([
      { piece: 0, to: 1 },
      { piece: 1, to: 0 },
      { piece: 1, to: 2 },
      { piece: 1, to: 3 },
      { piece: 1, to: 4 },
    ]);
    expect(slidePiece(puzzle, places, { piece: 0, to: 4 })).toBeNull(); // through the standing piece
    expect(slidePiece(puzzle, places, { piece: 1, to: 1 })).toBeNull(); // where it is
    const cleared = slidePiece(puzzle, places, { piece: 1, to: 3 })!;
    expect(reachOf(puzzle, cleared, 0)).toEqual({ least: 0, most: 4 });
    expect(isOut(puzzle, cleared)).toBe(false);
    expect(isOut(puzzle, slidePiece(puzzle, cleared, { piece: 0, to: 4 })!)).toBe(true);
  });

  it('a position is one number and back', () => {
    const places = [3, 0, 4, 2, 1];
    expect(placesOf(keyOf(places, 6), places.length, 6)).toEqual(places);
    expect(keyOf([1, 0], 6)).not.toBe(keyOf([0, 1], 6));
  });

  it('names the pieces in reading order, the player stays "A"', () => {
    expect(canonicalText(rows('....D.', '....D.', 'AA..D.', '......', '......', '...BB.'))).toBe(THREE);
  });
});

describe('random boards', () => {
  it('keep the rules: no piece over another, no other lying piece in the row out, the player not out yet', () => {
    let state = 1;
    for (let k = 0; k < 200; k++) {
      const draw = nextInt(state, 12);
      const b = randomBoard(draw.state, 3 + draw.value, SLIDE.pool.longShare);
      state = b.state;
      expect(b.puzzle.pieces.length).toBeLessThanOrEqual(4 + draw.value);
      const cells = b.puzzle.pieces.flatMap((p, i) => cellsOf(p, b.places[i]!, b.puzzle.size));
      expect(new Set(cells).size).toBe(cells.length);
      expect(b.puzzle.pieces.slice(1).some((p) => p.across && p.line === SLIDE.unblock.exitRow)).toBe(false);
      expect(isOut(b.puzzle, b.places)).toBe(false);
      expect(parseBoard(boardText(b.puzzle, b.places)).places).toEqual(b.places);
    }
  });

  it('the same seed — the same board', () => {
    expect(randomBoard(7, 10, 0.3)).toEqual(randomBoard(7, 10, 0.3));
    expect(randomBoard(7, 10, 0.3).places).not.toEqual(randomBoard(8, 10, 0.3).places);
  });
});

describe('every position', () => {
  it('counts the fewest moves of small boards', () => {
    for (const [text, moves] of [
      [ONE, 2],
      [THREE, 3],
    ] as const) {
      const { puzzle, places } = parseBoard(text);
      expect(fewestFrom(allPositions(puzzle, places)!, places)).toBe(moves);
      expect(plainFewest(puzzle, places)).toBe(moves);
    }
  });

  it('as a plain search from the start, on random boards; the hint walks exactly that many moves out', () => {
    let state = 2;
    let checked = 0;
    while (checked < 25) {
      const b = randomBoard(state, 9, SLIDE.pool.longShare);
      state = b.state;
      const positions = allPositions(b.puzzle, b.places, 20_000);
      if (!positions) continue;
      const fewest = fewestFrom(positions, b.places);
      expect(fewest).toBe(plainFewest(b.puzzle, b.places));
      if (fewest < 0) continue;
      let places: Places = b.places;
      for (let n = 0; n < fewest; n++) places = slidePiece(b.puzzle, places, nextMove(positions, places)!)!;
      expect(isOut(b.puzzle, places)).toBe(true);
      expect(nextMove(positions, places)).toBeNull();
      checked++;
    }
  });

  it('the hardest start is the farthest from the way out, written in reading order', () => {
    const { puzzle, places } = parseBoard(THREE);
    const positions = allPositions(puzzle, places)!;
    const top = hardest(positions)!;
    expect(top.moves).toBe(Math.max(...positions.toExit));
    expect(top.text).toBe(canonicalText(top.text));
    const again = parseBoard(top.text);
    expect(plainFewest(again.puzzle, again.places)).toBe(top.moves);
  });

  it('gives up past its limit', () => {
    const { puzzle, places } = parseBoard(THREE);
    const all = allPositions(puzzle, places)!;
    expect(allPositions(puzzle, places, all.keys.length - 1)).toBeNull();
    expect(allPositions(puzzle, places, all.keys.length)).not.toBeNull();
  });
});
