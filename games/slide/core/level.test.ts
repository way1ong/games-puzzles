// The ways to play (docs/slide/SPEC.md): levels grow in fewest moves stage by stage and never share a puzzle while the
// set has enough; free play keeps to its difficulty; the same seed (and the same day) — the same puzzle and look; a
// fifteen's shuffle of 3x3 is never nearly done; "The chest" keeps to its own stages, difficulties and days.
import { describe, expect, it } from 'vitest';
import { SLIDE, THEMES } from '../config.ts';
import { fewestMoves } from './fifteen-solve.ts';
import { dailySeed, fifteenTiles, freePuzzle, levelMoves, levelPuzzle, levelSeed, puzzlesOf, themeOf } from './level.ts';
import type { PoolPuzzle } from './pool.ts';

/** A made-up set: 20 puzzles of every number of moves from 2 to 40 (the boards do not matter here). */
const POOL: PoolPuzzle[] = Array.from({ length: 39 * 20 }, (_, i) => ({ moves: 2 + Math.floor(i / 20), text: `board-${i}` }));

describe('levels in a row', () => {
  it('start at the first stage’s fewest moves and grow, stage by stage, never back', () => {
    const stages = SLIDE.unblock.stages;
    expect(levelMoves(1)).toBe(stages[0]!.moves[0]);
    for (let i = 0; i < stages.length - 1; i++) {
      expect(levelMoves(stages[i]!.from)).toBe(stages[i]!.moves[0]);
      expect(levelMoves(stages[i + 1]!.from - 1)).toBe(stages[i]!.moves[1]);
    }
    const last = stages[stages.length - 1]!;
    for (let level = 2; level < last.from; level++) expect(levelMoves(level)).toBeGreaterThanOrEqual(levelMoves(level - 1));
  });

  it('after the last stage, go round its range', () => {
    const last = SLIDE.unblock.stages[SLIDE.unblock.stages.length - 1]!;
    const seen = new Set<number>();
    for (let level = last.from; level < last.from + 50; level++) {
      const moves = levelMoves(level);
      expect(moves).toBeGreaterThanOrEqual(last.moves[0]);
      expect(moves).toBeLessThanOrEqual(last.moves[1]);
      seen.add(moves);
    }
    expect(seen.size).toBe(last.moves[1] - last.moves[0] + 1);
  });

  it('take a puzzle of their fewest moves, a different one for every level while the set has enough', () => {
    const used = new Set<string>();
    for (let level = 1; level <= 60; level++) {
      const p = levelPuzzle(POOL, level);
      expect(p.moves).toBe(levelMoves(level));
      expect(used.has(p.text)).toBe(false);
      used.add(p.text);
    }
  });

  it('when the set has no puzzle of a number of moves, take the nearest fewer', () => {
    const gappy = POOL.filter((p) => p.moves !== 3);
    expect(levelPuzzle(gappy, 3).moves).toBe(2); // level 3 asks for 3 moves
  });
});

describe('levels, free play and days of the chest', () => {
  const stages = SLIDE.box.stages;

  it('follow its own stages: from the first stage’s fewest moves, growing, never back; then round the last range', () => {
    expect(levelMoves(1, SLIDE.box)).toBe(stages[0]!.moves[0]);
    for (let i = 0; i < stages.length - 1; i++) {
      expect(levelMoves(stages[i]!.from, SLIDE.box)).toBe(stages[i]!.moves[0]);
      expect(levelMoves(stages[i + 1]!.from - 1, SLIDE.box)).toBe(stages[i]!.moves[1]);
    }
    const last = stages[stages.length - 1]!;
    for (let level = 2; level < last.from; level++) expect(levelMoves(level, SLIDE.box)).toBeGreaterThanOrEqual(levelMoves(level - 1, SLIDE.box));
    const seen = new Set<number>();
    for (let level = last.from; level < last.from + 40; level++) seen.add(levelMoves(level, SLIDE.box));
    expect(seen.size).toBe(last.moves[1] - last.moves[0] + 1);
    expect(Math.min(...seen)).toBe(last.moves[0]);
  });

  it('take a puzzle of their fewest moves, a different one for every level while the set has enough', () => {
    const used = new Set<string>();
    for (let level = 1; level <= 60; level++) {
      const p = levelPuzzle(POOL, level, SLIDE.box);
      expect(p.moves).toBe(levelMoves(level, SLIDE.box));
      expect(used.has(p.text)).toBe(false);
      used.add(p.text);
    }
  });

  it('free play keeps to the chest’s ranges of moves; the same seed — the same puzzle', () => {
    for (const difficulty of ['easy', 'medium', 'hard'] as const) {
      const [least, most] = SLIDE.box.difficulties[difficulty];
      expect(puzzlesOf(POOL, difficulty, SLIDE.box).every((p) => p.moves >= least && p.moves <= (most ?? Infinity))).toBe(true);
      for (let seed = 1; seed <= 30; seed++) {
        const p = freePuzzle(POOL, difficulty, seed, SLIDE.box);
        expect(p.moves).toBeGreaterThanOrEqual(least);
        expect(p.moves).toBeLessThanOrEqual(most ?? Infinity);
        expect(freePuzzle(POOL, difficulty, seed, SLIDE.box)).toBe(p);
      }
    }
  });

  it('the day: the same puzzle for everybody on that date, its own seed apart from the other modes', () => {
    const day = (date: string) => freePuzzle(POOL, SLIDE.box.daily, dailySeed('box', date), SLIDE.box);
    expect(day('2026-11-28')).toBe(day('2026-11-28'));
    expect(dailySeed('box', '2026-11-28')).not.toBe(dailySeed('box', '2026-11-29'));
    expect(dailySeed('box', '2026-11-28')).not.toBe(dailySeed('unblock', '2026-11-28'));
    expect(levelSeed(3, 'box')).not.toBe(levelSeed(3));
    expect(levelSeed(3, 'box')).toBe(levelSeed(3, 'box'));
  });
});

describe('free play and the day', () => {
  it('keep to the difficulty’s range of moves (the hardest has no upper end), the same seed — the same puzzle', () => {
    expect(puzzlesOf(POOL, 'hard').some((p) => p.moves === 40)).toBe(true);
    for (const difficulty of ['easy', 'medium', 'hard'] as const) {
      const [least, most] = SLIDE.unblock.difficulties[difficulty];
      expect(puzzlesOf(POOL, difficulty).every((p) => p.moves >= least && p.moves <= (most ?? Infinity))).toBe(true);
      for (let seed = 1; seed <= 30; seed++) {
        const p = freePuzzle(POOL, difficulty, seed);
        expect(p.moves).toBeGreaterThanOrEqual(least);
        expect(p.moves).toBeLessThanOrEqual(most ?? Infinity);
        expect(freePuzzle(POOL, difficulty, seed)).toBe(p);
      }
    }
  });

  it('the day: the same seed for everybody on that date, another the next day, another for each mode', () => {
    expect(dailySeed('unblock', '2026-11-27')).toBe(dailySeed('unblock', '2026-11-27'));
    expect(dailySeed('unblock', '2026-11-27')).not.toBe(dailySeed('unblock', '2026-11-28'));
    expect(dailySeed('unblock', '2026-11-27')).not.toBe(dailySeed('fifteen', '2026-11-27'));
  });

  it('every look turns up, each from its seed', () => {
    const looks = new Set(Array.from({ length: 60 }, (_, level) => themeOf(levelSeed(level + 1))));
    expect([...looks].sort()).toEqual([...THEMES].sort());
    expect(themeOf(levelSeed(5))).toBe(themeOf(levelSeed(5)));
  });

  it('a fifteen of 3x3 is never nearly done; of 4x4 — the same from the same seed', () => {
    const least = SLIDE.fifteen.leastMoves[3]!;
    for (let seed = 1; seed <= 20; seed++) expect(fewestMoves(fifteenTiles(3, seed))).toBeGreaterThanOrEqual(least);
    expect(fifteenTiles(4, 9)).toEqual(fifteenTiles(4, 9));
  });
});
