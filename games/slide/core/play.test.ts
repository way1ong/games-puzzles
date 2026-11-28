// The course of a game (docs/slide/SPEC.md, "Допомога"): slides and moves are counted, "Undo" takes the last one back
// (and its moves off), "Start again" goes to the start without counting as help, the end is noticed; a saved game is
// whole only if its moves lead from its start to where it is; statistics count solved games, help and the fewest
// moves, for every mode.
import { describe, expect, it } from 'vitest';
import { THEMES } from '../config.ts';
import { solvedTiles } from './fifteen.ts';
import { addTime, clean, countHint, moveBlock, movePiece, movesMade, newBox, newFifteen, newUnblock, perfect, slideTile, startAgain, started, undo, validPlay } from './play.ts';
import { emptyStats, longestStreak, recordLeft, recordWon } from './stats.ts';

const rows = (...r: string[]) => r.join('');
const TWO = { moves: 2, text: rows('......', '...B..', 'AA.B..', '......', '......', '......') };
/** The chest over two standing blocks: each aside, then the chest down through three rows — 3 moves. */
const CHEST = { moves: 3, text: rows('.AA.', '.AA.', '.BC.', '.BC.', '....') };

/** The end with the last row's two tiles moved left: two slides from solved. */
const nearEnd = (): number[] => [1, 2, 3, 4, 5, 6, 0, 7, 8];

describe('the fifteen', () => {
  it('counts each tile slid; "Undo" takes a slide back with its tiles; the end is noticed', () => {
    let play = newFifteen(nearEnd(), 'free', 5, 6, { difficulty: 'easy' });
    expect(play.size).toBe(3);
    expect(play.picture).toBeGreaterThanOrEqual(0);
    expect(play.picture).toBeLessThan(6);
    expect(started(play)).toBe(false);
    expect(slideTile(play, 4)).toBeNull(); // not in the gap's line
    play = slideTile(play, 8)!; // both tiles at once
    expect(play.tiles).toEqual(solvedTiles(3));
    expect(play.moves).toBe(2);
    expect(play.done).toBe(true);
    expect(undo(play)).toBeNull(); // nothing after the end
    expect(slideTile(play, 7)).toBeNull();

    play = newFifteen(nearEnd(), 'free', 5, 6, { difficulty: 'easy' });
    play = slideTile(play, 7)!;
    expect(play.moves).toBe(1);
    play = undo(play)!;
    expect(play.tiles).toEqual(nearEnd());
    expect(play.moves).toBe(0);
    expect(play.undos).toBe(1);
    expect(clean(play)).toBe(false);
    expect(undo(play)).toBeNull();
  });

  it('"Start again" goes back to the shuffle and is not help', () => {
    let play = newFifteen(nearEnd(), 'free', 5, 6, { difficulty: 'easy' });
    expect(startAgain(play)).toBeNull(); // nothing to start again
    play = slideTile(play, 7)!;
    play = startAgain(play)!;
    expect(play.tiles).toEqual(nearEnd());
    expect(play.moves).toBe(0);
    expect(play.restarts).toBe(1);
    expect(clean(play)).toBe(true);
    expect(started(play)).toBe(true);
  });

  it('a saved game is whole only if its slides lead from its start', () => {
    let play = newFifteen(nearEnd(), 'free', 5, 6, { difficulty: 'easy' });
    play = slideTile(play, 7)!; // the gap goes right
    play = slideTile(play, 1)!; // up its column: two tiles down
    expect(play.moves).toBe(3);
    expect(validPlay(play)).toBe(true);
    expect(validPlay({ ...play, moves: play.moves + 1 })).toBe(false);
    expect(validPlay({ ...play, tiles: [...play.tiles].reverse() })).toBe(false);
    expect(validPlay({ ...play, start: solvedTiles(3).map((t) => (t === 7 ? 8 : t === 8 ? 7 : t)) })).toBe(false);
    expect(validPlay({ ...play, start: solvedTiles(3) })).toBe(false); // can be solved, but the slides do not lead from it
    expect(validPlay({ ...play, history: play.history.slice(1) })).toBe(false);
  });
});

describe('"Clear the way"', () => {
  it('a move is one piece slid any distance; out — the end; "Undo" puts the piece back', () => {
    let play = newUnblock(TWO, 'level', 9, { level: 1 });
    expect(THEMES).toContain(play.theme);
    expect(play.fewest).toBe(2);
    expect(movePiece(play, { piece: 0, to: 4 })).toBeNull(); // the way is shut
    play = movePiece(play, { piece: 1, to: 4 })!; // down to the bottom in one move
    expect(movesMade(play)).toBe(1);
    play = undo(play)!;
    expect(play.places).toEqual([0, 1]);
    expect(movesMade(play)).toBe(0);
    play = movePiece(play, { piece: 1, to: 3 })!;
    play = movePiece(play, { piece: 0, to: 4 })!;
    expect(play.done).toBe(true);
    expect(movesMade(play)).toBe(3 - 1);
    expect(perfect(play)).toBe(false); // "Undo" was help
    expect(validPlay(play)).toBe(true);
  });

  it('in the fewest moves without help — perfect; a hint counts as help', () => {
    let play = newUnblock(TWO, 'free', 9, { difficulty: 'easy' });
    play = movePiece(play, { piece: 1, to: 0 })!;
    play = movePiece(play, { piece: 0, to: 4 })!;
    expect(perfect(play)).toBe(true);
    expect(perfect(countHint(play))).toBe(false);
  });

  it('"Start again" puts every piece back; a broken save is turned down', () => {
    let play = newUnblock(TWO, 'daily', 9, { daily: '2026-11-27' });
    play = movePiece(play, { piece: 1, to: 4 })!;
    play = movePiece(play, { piece: 0, to: 1 })!;
    expect(validPlay(play)).toBe(true);
    expect(validPlay({ ...play, places: [1, 1] })).toBe(false); // over one another
    expect(validPlay({ ...play, history: play.history.slice(1) })).toBe(false);
    expect(validPlay({ ...play, board: 'nonsense' })).toBe(false);
    play = startAgain(play)!;
    expect(play.places).toEqual([0, 1]);
    expect(play.restarts).toBe(1);
  });

  it('the time runs only before the end', () => {
    let play = newUnblock(TWO, 'free', 9, { difficulty: 'easy' });
    play = addTime(play, 500);
    expect(play.ms).toBe(500);
    play = movePiece(movePiece(play, { piece: 1, to: 0 })!, { piece: 0, to: 4 })!;
    expect(addTime(play, 500).ms).toBe(500);
  });
});

describe('"The chest"', () => {
  it('a move is one piece in one straight way, any number of cells; over the slot — the end; "Undo" puts it back', () => {
    let play = newBox(CHEST, 'level', 9, { level: 1 });
    expect(play.fewest).toBe(3);
    expect(play.places).toEqual([1, 9, 10]);
    expect(moveBlock(play, { piece: 0, to: 13 })).toBeNull(); // the blocks are in the way
    expect(moveBlock(play, { piece: 1, to: 4 })).toBeNull(); // not in one straight way
    play = moveBlock(play, { piece: 1, to: 8 })!;
    expect(movesMade(play)).toBe(1);
    play = undo(play)!;
    expect(play.places).toEqual([1, 9, 10]);
    expect(movesMade(play)).toBe(0);
    expect(play.undos).toBe(1);
    play = moveBlock(moveBlock(play, { piece: 1, to: 8 })!, { piece: 2, to: 11 })!;
    expect(play.done).toBe(false);
    play = moveBlock(play, { piece: 0, to: 13 })!; // down three rows at once: over the slot
    expect(play.done).toBe(true);
    expect(movesMade(play)).toBe(3);
    expect(moveBlock(play, { piece: 0, to: 12 })).toBeNull(); // nothing after the end
    expect(undo(play)).toBeNull();
    expect(perfect(play)).toBe(false); // "Undo" was help
    expect(validPlay(play)).toBe(true);
  });

  it('in the fewest moves without help — perfect; a hint counts as help', () => {
    let play = newBox(CHEST, 'free', 9, { difficulty: 'easy' });
    play = moveBlock(moveBlock(moveBlock(play, { piece: 2, to: 11 })!, { piece: 1, to: 8 })!, { piece: 0, to: 13 })!;
    expect(perfect(play)).toBe(true);
    expect(perfect(countHint(play))).toBe(false);
  });

  it('"Start again" puts every piece back; a broken save is turned down', () => {
    let play = newBox(CHEST, 'daily', 9, { daily: '2026-11-28' });
    expect(startAgain(play)).toBeNull();
    play = moveBlock(moveBlock(play, { piece: 1, to: 13 })!, { piece: 0, to: 0 })!;
    expect(validPlay(play)).toBe(true);
    expect(validPlay({ ...play, places: [0, 13, 13] })).toBe(false); // over one another
    expect(validPlay({ ...play, places: [3, 13, 10] })).toBe(false); // the chest beyond the frame
    expect(validPlay({ ...play, history: play.history.slice(1) })).toBe(false);
    expect(validPlay({ ...play, history: [{ piece: 1, from: 8 }, play.history[1]!] })).toBe(false); // not a move that was made
    expect(validPlay({ ...play, done: true })).toBe(false);
    expect(validPlay({ ...play, board: 'nonsense' })).toBe(false);
    play = startAgain(play)!;
    expect(play.places).toEqual([1, 9, 10]);
    expect(play.history).toEqual([]);
    expect(play.restarts).toBe(1);
    expect(clean(play)).toBe(true);
  });
});

describe('statistics', () => {
  it('count solved, without help, the fewest moves and perfect games; the days of the day only in their days', () => {
    let stats = emptyStats();
    let fifteen = newFifteen(nearEnd(), 'free', 5, 6, { difficulty: 'easy' });
    stats = recordLeft(stats, fifteen);
    fifteen = slideTile(fifteen, 8)!;
    stats = recordWon(stats, fifteen);
    expect(stats.fifteen.easy).toEqual({ played: 2, won: 1, clean: 1, bestMoves: 2 });

    let level = newUnblock(TWO, 'level', 9, { level: 1 });
    level = movePiece(movePiece(level, { piece: 1, to: 0 })!, { piece: 0, to: 4 })!;
    stats = recordWon(stats, level);
    expect(stats.unblock.levels).toEqual({ played: 1, won: 1, clean: 1, perfect: 1 });

    let free = newUnblock(TWO, 'free', 9, { difficulty: 'hard' });
    free = movePiece(movePiece(movePiece(free, { piece: 1, to: 4 })!, { piece: 1, to: 0 })!, { piece: 0, to: 4 })!;
    stats = recordWon(stats, free);
    expect(stats.unblock.free.hard).toEqual({ played: 1, won: 1, clean: 1, perfect: 0 });

    let day = newUnblock(TWO, 'daily', 9, { daily: '2026-11-27' });
    day = movePiece(movePiece(day, { piece: 1, to: 0 })!, { piece: 0, to: 4 })!;
    expect(recordWon(stats, day)).toEqual(stats);
  });

  it('count the chest apart: its levels, each difficulty, a free game left; its days only in their days', () => {
    let stats = emptyStats();
    const solve = (p: ReturnType<typeof newBox>) => moveBlock(moveBlock(moveBlock(p, { piece: 1, to: 8 })!, { piece: 2, to: 11 })!, { piece: 0, to: 13 })!;
    stats = recordWon(stats, solve(newBox(CHEST, 'level', 9, { level: 1 })));
    expect(stats.box.levels).toEqual({ played: 1, won: 1, clean: 1, perfect: 1 });
    expect(stats.unblock.levels).toEqual({ played: 0, won: 0, clean: 0, perfect: 0 });
    stats = recordLeft(stats, moveBlock(newBox(CHEST, 'free', 9, { difficulty: 'medium' }), { piece: 1, to: 8 })!);
    stats = recordWon(stats, countHint(solve(newBox(CHEST, 'free', 9, { difficulty: 'medium' }))));
    expect(stats.box.free.medium).toEqual({ played: 2, won: 1, clean: 0, perfect: 0 });
    expect(stats.unblock.free.medium).toEqual({ played: 0, won: 0, clean: 0, perfect: 0 });
    expect(recordWon(stats, solve(newBox(CHEST, 'daily', 9, { daily: '2026-11-28' })))).toEqual(stats);
  });

  it('the longest run of days', () => {
    expect(longestStreak(['2026-11-25', '2026-11-26', '2026-11-27', '2026-11-29'])).toBe(3);
    expect(longestStreak([])).toBe(0);
  });
});
