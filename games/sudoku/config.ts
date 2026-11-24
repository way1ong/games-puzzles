// Every number of the Sudoku rules lives here (docs/sudoku/SPEC.md). (C) = Claude's proposal within the
// plan approved on 24.11; change it here, not in the logic.

import { gameAddress } from '../../shared/core/address.ts';

/** Levels from the easiest (four — Claude's answer to "3 or 4?", 24.11). */
export const LEVELS = ['easy', 'medium', 'hard', 'expert'] as const;
export type Level = (typeof LEVELS)[number];

/**
 * Solving techniques from the simplest (core/techniques.ts). The solver, the grader and the hints try them
 * in this order, so a hint always shows the simplest step there is.
 */
export const TECHNIQUES = [
  'fullHouse',
  'hiddenSingle',
  'nakedSingle',
  'pointing',
  'claiming',
  'nakedPair',
  'hiddenPair',
  'nakedTriple',
  'hiddenTriple',
  'xWing',
  'xyWing',
  'swordfish',
  'xyzWing',
] as const;
export type Technique = (typeof TECHNIQUES)[number];

export interface LevelRule {
  /** Techniques this level adds to those of the levels before it. */
  adds: readonly Technique[];
  /** A puzzle must need at least one of the techniques this level adds (else it belongs to an easier level). */
  needsNew: boolean;
  /** Open digits at the start: at least / at most; null — no limit. */
  minGivens: number | null;
  maxGivens: number | null;
}

export const SUDOKU = {
  /**
   * The game's name where it is installed and in the shared daily result (decision of 24.11). The short name
   * under the icon is app.name in the dictionaries.
   */
  name: 'way1ong Sudoku',
  /**
   * Addresses: the studio's site for the "Made by way1ong" line, and the game itself for the shared daily
   * result. null — not public yet: the line has no link, the result has no address.
   */
  links: { site: null as string | null, game: gameAddress('sudoku') },
  /** Side of a box, in cells; the board side is box × box cells (classic sudoku: 3 → 9 × 9). */
  box: 3,
  /** What each level asks of the player (C; docs/sudoku/SPEC.md, "Рівні"). */
  levels: {
    easy: { adds: ['fullHouse', 'hiddenSingle', 'nakedSingle'], needsNew: false, minGivens: 36, maxGivens: null },
    medium: { adds: [], needsNew: false, minGivens: 28, maxGivens: 32 },
    hard: {
      adds: ['pointing', 'claiming', 'nakedPair', 'hiddenPair', 'nakedTriple', 'hiddenTriple'],
      needsNew: true,
      minGivens: null,
      maxGivens: null,
    },
    expert: { adds: ['xWing', 'xyWing', 'swordfish', 'xyzWing'], needsNew: true, minGivens: null, maxGivens: null },
  } satisfies Record<Level, LevelRule>,
  /** Open digits are removed in pairs symmetric about the centre of the board (C). */
  symmetric: true,
  /**
   * A puzzle is made from its seed in attempts: each attempt fills a board and removes digits. An attempt
   * that misses the level is followed by the next one; this many attempts at most (C) — tests show the
   * levels are reached long before.
   */
  maxAttempts: 1000,
  /** Puzzles of each level made in advance and kept on the device, so a new game opens at once (C). */
  readyPerLevel: 1,
} as const;
