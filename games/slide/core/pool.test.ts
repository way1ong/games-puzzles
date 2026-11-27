// The set of "Clear the way" puzzles (docs/slide/SPEC.md, "Головоломки складено заздалегідь"): every line is a board
// by the rules, its letters in reading order, met once; the set keeps to its limits; every number of moves the levels
// and difficulties ask for is there; and for puzzles spread over the whole set, counting every position again gives
// the same fewest moves, within the positions' limit.
import { describe, expect, it } from 'vitest';
import { DIFFICULTIES, SLIDE } from '../config.ts';
import text from '../levels/unblock.txt?raw';
import { levelMoves, levelPuzzle, puzzlesOf } from './level.ts';
import { parsePool, poolLine } from './pool.ts';
import { canonicalText, parseBoard } from './unblock.ts';
import { allPositions, fewestFrom } from './unblock-solve.ts';

const POOL = parsePool(text);
/** Puzzles counted again from scratch: every this-th line of the set. */
const SAMPLE_EVERY = 15;

describe('the set of puzzles', () => {
  it('holds boards by the rules, each once, written in reading order, one a line', () => {
    expect(POOL.length).toBeGreaterThan(0);
    expect(new Set(POOL.map((p) => p.text)).size).toBe(POOL.length);
    for (const p of POOL) {
      expect(() => parseBoard(p.text)).not.toThrow();
      expect(canonicalText(p.text)).toBe(p.text);
    }
    expect(POOL.map(poolLine).join('\n') + '\n').toBe(text);
  });

  it('reads only lines of a number of moves and a board', () => {
    expect(parsePool('7 AB\n\n12 CD\n')).toEqual([
      { moves: 7, text: 'AB' },
      { moves: 12, text: 'CD' },
    ]);
    expect(() => parsePool('seven AB')).toThrow();
    expect(() => parsePool('7')).toThrow();
  });

  it('keeps to its limits: fewest moves at least the first level’s, so many of each, few pieces on the easiest', () => {
    const count = new Map<number, number>();
    for (const p of POOL) count.set(p.moves, (count.get(p.moves) ?? 0) + 1);
    expect(Math.min(...count.keys())).toBe(SLIDE.unblock.stages[0]!.moves[0]);
    expect(Math.max(...count.values())).toBeLessThanOrEqual(SLIDE.pool.perMoves);
    for (const p of POOL.filter((q) => q.moves <= SLIDE.pool.sparseUpTo)) {
      expect(parseBoard(p.text).puzzle.pieces.length).toBeLessThanOrEqual(SLIDE.pool.sparsePieces[1] + 1);
    }
  });

  it('has every number of moves the levels ask for, and plenty for each difficulty', () => {
    const last = SLIDE.unblock.stages[SLIDE.unblock.stages.length - 1]!;
    for (let level = 1; level < last.from + 2 * (last.moves[1] - last.moves[0] + 1); level++) {
      expect(levelPuzzle(POOL, level).moves).toBe(levelMoves(level));
    }
    for (const difficulty of DIFFICULTIES) expect(puzzlesOf(POOL, difficulty).length).toBeGreaterThanOrEqual(SLIDE.pool.perMoves);
  });

  it('counted again, puzzles over the whole set have the fewest moves written, within the positions’ limit', () => {
    for (let i = 0; i < POOL.length; i += SAMPLE_EVERY) {
      const { moves, text: board } = POOL[i]!;
      const { puzzle, places } = parseBoard(board);
      const positions = allPositions(puzzle, places, SLIDE.unblock.maxPositions);
      expect(positions).not.toBeNull();
      expect(fewestFrom(positions!, places)).toBe(moves);
    }
  });
});
