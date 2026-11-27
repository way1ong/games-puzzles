// Slide ("Пересувайки"): every number of the rules and the game's addresses (docs/slide/SPEC.md). (C) = Claude's
// proposal within the plan approved on 27.11; change it here, not in the logic.
import { gameAddress } from '../../shared/core/address.ts';

/** Difficulties of both modes, the easiest first (docs/slide/SPEC.md). */
export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

/** What the tiles of the fifteen show (decision of 27.11: "Обидва опціонально?"). */
export const FACES = ['numbers', 'picture', 'both'] as const;
export type Face = (typeof FACES)[number];

/** The looks of "Clear the way", drawn at random for each puzzle (decision of 27.11: "Може рандомно всі 3?"). */
export const THEMES = ['harbour', 'room', 'box'] as const;
export type Theme = (typeof THEMES)[number];

/** Levels in a row: from level `from` on, the fewest moves of a level rise from moves[0] to moves[1]. */
export interface Stage {
  /** The first level of the stage (levels count from 1). */
  from: number;
  moves: readonly [number, number];
}

export const SLIDE = {
  /** The game's name where it is installed and in the shared daily result; the short name is app.name in the dictionaries. */
  name: 'way1ong Slide',
  /** The studio's site for the "Made by way1ong" line, and the game itself for the shared result; null — not public yet. */
  links: { site: null as string | null, game: gameAddress('slide') },
  fifteen: {
    /** Tiles across (and down) by difficulty (C). */
    sizes: { easy: 3, medium: 4, hard: 5 } satisfies Record<Difficulty, number>,
    /** The fifteen of the day (C). */
    dailySize: 4,
    /**
     * The fewest moves a shuffle may need, where the game can count them exactly (C): measured 27.11 over all 181 440
     * arrangements of 3x3, 4 % need fewer than 16 and would look nearly done.
     */
    leastMoves: { 3: 16 } as Partial<Record<number, number>>,
    /** What the tiles show until the player chooses (decision of 27.11: both in the menu; numbers first — C). */
    defaultFace: 'numbers' as Face,
  },
  unblock: {
    /** Cells across and down (C: the genre's usual). */
    size: 6,
    /** The row of the way out, counted from the top from 0, in the right side of the frame (C). */
    exitRow: 2,
    /** The player's own piece lies in the exit row; its length in cells (C). */
    heroLength: 2,
    /** Lengths of the other pieces (C). */
    lengths: [2, 3] as const,
    /**
     * Levels in a row (C): the fewest moves grow from 2; a stage starts where the one before ended. After the last
     * stage, levels go round its range — it holds the hardest numbers of moves the set has plenty of (measured 27.11
     * over 200 000 random boards: from 31 moves on, fewer than 20 puzzles of each).
     */
    stages: [
      { from: 1, moves: [2, 4] },
      { from: 6, moves: [4, 7] },
      { from: 16, moves: [7, 10] },
      { from: 31, moves: [10, 13] },
      { from: 51, moves: [13, 16] },
      { from: 76, moves: [16, 19] },
      { from: 101, moves: [19, 22] },
      { from: 131, moves: [22, 26] },
      { from: 171, moves: [24, 30] },
    ] satisfies Stage[],
    /** Free play: the fewest moves of each difficulty, from and to; null — no upper end (C). */
    difficulties: { easy: [4, 8], medium: [9, 15], hard: [16, null] } satisfies Record<Difficulty, readonly [number, number | null]>,
    /** The puzzle of the day: middling (C). */
    daily: 'medium' as Difficulty,
    /**
     * A puzzle's positions the game walks once for its hints (C): the set keeps only puzzles with no more, so a hint is
     * at once (docs/slide/SPEC.md, "Підказка").
     */
    maxPositions: 30_000,
  },
  /**
   * The set of puzzles of "Clear the way", made in advance by scripts/slide/ (C): random boards from these seeds,
   * pieces on a board, how often a piece is long, and how many puzzles of each number of moves the set keeps.
   */
  pool: {
    boards: 200_000,
    /** Every this-th board is sparse, for the first levels (few pieces, easy to read). */
    sparseEvery: 5,
    sparsePieces: [3, 8] as const,
    densePieces: [9, 13] as const,
    /** Puzzles of at most this many moves come only from sparse boards. */
    sparseUpTo: 4,
    longShare: 0.3,
    perMoves: 40,
  },
  /** A short buzz when a puzzle is solved (a setting, off by default) (C). */
  vibrateMs: 12,
} as const;
