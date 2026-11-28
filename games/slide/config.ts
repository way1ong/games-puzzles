// Slide ("Пересувайки"): every number of the rules and the game's addresses (docs/slide/SPEC.md). (C) = Claude's
// proposal within the plan approved on 27.11; change it here, not in the logic.
import { gameAddress } from '../../shared/core/address.ts';

/** Difficulties of both modes, the easiest first (docs/slide/SPEC.md). */
export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

/**
 * The fifteen's sizes in free play (docs/slide/SPEC.md, "П’ятнашки"): the three difficulties, and two larger ones
 * (decision of 28.11: «вибір теми й більші поля п’ятнашок»).
 */
export const FIFTEEN_KINDS = [...DIFFICULTIES, 'expert', 'master'] as const;
export type FifteenKind = (typeof FIFTEEN_KINDS)[number];

/** What the tiles of the fifteen show (decision of 27.11: "Обидва опціонально?"). */
export const FACES = ['numbers', 'picture', 'both'] as const;
export type Face = (typeof FACES)[number];

/** The looks of "Clear the way", drawn at random for each puzzle (decision of 27.11: "Може рандомно всі 3?"). */
export const THEMES = ['harbour', 'room', 'box'] as const;
export type Theme = (typeof THEMES)[number];

/** The look of "Clear the way" in the menu (decision of 28.11): drawn for each puzzle, as at first, or always one. */
export const THEME_CHOICES = ['random', ...THEMES] as const;
export type ThemeChoice = (typeof THEME_CHOICES)[number];

/** Levels in a row: from level `from` on, the fewest moves of a level rise from moves[0] to moves[1]. */
export interface Stage {
  /** The first level of the stage (levels count from 1). */
  from: number;
  moves: readonly [number, number];
}

/** How a mode's set of puzzles is played: levels in a row and free play by difficulty (fewest moves from, to; null — no upper end). */
export interface PoolWays {
  stages: readonly Stage[];
  difficulties: Readonly<Record<Difficulty, readonly [number, number | null]>>;
}

/** The pieces of "The chest" (decision of 28.11): the chest, the player's own, and wooden blocks of three shapes. */
export const BOX_SHAPES = ['chest', 'single', 'lying', 'standing'] as const;
export type BoxShape = (typeof BOX_SHAPES)[number];

export const SLIDE = {
  /** The game's name where it is installed and in the shared daily result; the short name is app.name in the dictionaries. */
  name: 'way1ong Slide',
  /** The studio's site for the "Made by way1ong" line, and the game itself for the shared result; null — not public yet. */
  links: { site: null as string | null, game: gameAddress('slide') },
  fifteen: {
    /**
     * Tiles across (and down) by size (C; the two larger — decision of 28.11). 7 x 7 still gives a phone 360 px wide
     * tiles of 44 px and more held upright; the hint finds its way in about a tenth of a second (measured 28.11).
     */
    sizes: { easy: 3, medium: 4, hard: 5, expert: 6, master: 7 } satisfies Record<FifteenKind, number>,
    /** The fifteen of the day (C). */
    dailySize: 4,
    /**
     * Detective's rooms that join the pictures of the fifteen of the day from a date (the new rooms of 28.11): before it
     * the day's picture is what it was — their pictures stand at the end of art/pictures.ts.
     */
    picturesFrom: { cafe: '2026-12-01', post: '2026-12-01' } as Readonly<Partial<Record<string, string>>>,
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
  /** "The chest" (docs/slide/SPEC.md, "Скринька"; decision of 28.11: «Роби»). */
  box: {
    /** Cells across and down (decision of 28.11). */
    cols: 4,
    rows: 5,
    /** Cells across and down of each piece (decision of 28.11): the chest, a small block, a lying and a standing one. */
    shapes: { chest: [2, 2], single: [1, 1], lying: [2, 1], standing: [1, 2] } satisfies Record<BoxShape, readonly [number, number]>,
    /** The slot in the middle of the bottom side, as wide as the chest: its first column, counted from the left from 0 (decision of 28.11). */
    slot: 1,
    /**
     * Levels in a row (C): the fewest moves grow from 2; after the last stage, levels go round its range — the hardest
     * numbers of moves the set has its full share of (measured 28.11 over games/slide/levels/box.txt: 30 puzzles of
     * each number from 2 to 45, from 46 on 8 or fewer).
     */
    stages: [
      { from: 1, moves: [2, 4] },
      { from: 6, moves: [4, 7] },
      { from: 16, moves: [7, 10] },
      { from: 31, moves: [10, 14] },
      { from: 51, moves: [14, 18] },
      { from: 76, moves: [18, 23] },
      { from: 101, moves: [23, 28] },
      { from: 131, moves: [28, 34] },
      { from: 171, moves: [34, 40] },
      { from: 211, moves: [36, 45] },
    ] satisfies Stage[],
    /** Free play: the fewest moves of each difficulty, from and to; null — no upper end (C; the set holds 300, 450 and 612 of them, the most 78 moves, measured 28.11). */
    difficulties: { easy: [5, 14], medium: [15, 29], hard: [30, null] } satisfies Record<Difficulty, readonly [number, number | null]>,
    /**
     * Hard no longer than this many moves, when the player switches it on (decision of 28.11: «зроби опційно»; off by
     * default): about one Hard puzzle in eight is longer (measured 28.11).
     */
    hardCap: 50,
    /** The puzzle of the day: middling (C). */
    daily: 'medium' as Difficulty,
    /**
     * A puzzle's positions the game walks once for its hints, a position and its mirror image as one (C): the set keeps
     * only puzzles with no more, so a hint comes at once (docs/slide/SPEC.md, "Скринька", "Підказка"). Measured 28.11:
     * the largest puzzle of the set has 57 228, walked in about 0.1 s on a computer. With 30 000 the set had 39 sets of
     * blocks and 61 puzzles with both lying and standing blocks; with 60 000 — 53 and 476.
     */
    maxPositions: 60_000,
    /**
     * The set of puzzles, made in advance by scripts/slide/box-pool.ts (C): random boards from these seeds, one puzzle
     * from each (docs/slide/SPEC.md, "Скринька", "Головоломки складено заздалегідь"). Measured 28.11: 10 000 boards give
     * 1452 puzzles of 53 sets of blocks in about 2 minutes on 4 threads.
     */
    pool: {
      boards: 10_000,
      /** Every this-th board is sparse, for the first levels: few blocks, many free cells (from, to). */
      sparseEvery: 5,
      sparseFree: [10, 14] as const,
      /** The free cells of the other boards, drawn from this list (two most often: they make the longest puzzles). */
      denseFree: [2, 2, 2, 3, 4] as const,
      /** The share of two-cell blocks, drawn for each board between these. */
      pairShare: [0, 1] as const,
      /** Puzzles of at most this many moves come only from sparse boards. */
      sparseUpTo: 4,
      /**
       * A position is drawn only among at least this many of its number of moves on its board: the few farthest
       * positions of a set, where record puzzles of other makers live, are never taken.
       */
      layerAtLeast: 50,
      /**
       * The sets of the traditional puzzles, left out altogether, so none of their known starts can turn up: so many
       * small blocks and so many of two cells — 4 and 5 (Huarong Dao, Klotski), 2 and 6 (Dad's Puzzler, Pennant,
       * Daughter in the Box).
       */
      traditional: [
        [4, 5],
        [2, 6],
      ] as const,
      /** Puzzles of each number of moves the set keeps. */
      perMoves: 30,
    },
  },
  /** A short buzz when a puzzle is solved (a setting, off by default) (C). */
  vibrateMs: 12,
} as const;
