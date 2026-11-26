// Every number of the Words rules lives here (docs/words/SPEC.md). (C) = Claude's proposal within the plan
// approved on 24.11; change it here, not in the logic.

import { gameAddress } from '../../shared/core/address.ts';

/** Languages of the game — each has its own word lists (games/words/dict/<lang>/). */
export const WORD_LANGS = ['en', 'hu', 'uk'] as const;
export type WordLang = (typeof WORD_LANGS)[number];

export interface LevelStep {
  /** From this level number on (counted from 1). */
  from: number;
  /** Letters on the wheel. */
  letters: number;
  /** Words in the crossword: at least / at most. */
  words: { min: number; max: number };
}

/** A step of the Word Field levels (docs/words/SPEC.md, "Поле слів"). */
export interface FieldStep {
  /** From this level number on (counted from 1). */
  from: number;
  /** Columns and rows of a phone held upright (on its side the field is shown turned). */
  cols: number;
  rows: number;
  /** The shortest and the longest hidden word, in tiles. */
  word: { min: number; max: number };
}

export const WORDS = {
  /** The game's name where it is installed and in the shared daily result (decision of 24.11). */
  name: 'way1ong Words',
  /**
   * Addresses: the studio's site for the "Made by way1ong" line, and the game itself for the shared daily
   * result. null — not public yet: the line has no link, the result has no address.
   */
  links: { site: null as string | null, game: gameAddress('words') },
  /** The shortest word, in letters of the wheel (C). */
  minWord: 3,
  /** The most letters on the wheel — and so the longest word that can ever be made (C). */
  maxLetters: 7,
  /** How the levels grow, from the first (C). */
  levels: [
    { from: 1, letters: 4, words: { min: 3, max: 4 } },
    { from: 11, letters: 5, words: { min: 4, max: 6 } },
    { from: 31, letters: 6, words: { min: 5, max: 8 } },
    { from: 81, letters: 7, words: { min: 6, max: 10 } },
  ] satisfies LevelStep[],
  /** The daily puzzle (C). */
  daily: { letters: 6, words: { min: 5, max: 8 } },
  /** The crossword's biggest width and height, in cells (C). */
  maxGridSide: 9,
  /**
   * Main words of the levels (the longest word, whose letters make the wheel) go from the more common to the
   * rarer: in groups of this many, the order shuffled within each group (C).
   */
  levelGroup: 40,
  /** Tries to lay out a level's crossword with enough words before taking fewer (C). */
  layoutTries: 12,
  /**
   * Hungarian letters written with two characters that make one tile when the setting is on (as in Hungarian
   * Scrabble; decision of 24.11, to confirm with a Hungarian speaker). dz and dzs stay separate letters there.
   */
  huTiles: ['cs', 'gy', 'ly', 'ny', 'sz', 'ty', 'zs'],
  /** A missed day the daily streak forgives when the setting is on (C). */
  graceDays: 1,
  /** The second mode, "Word Field" (decision of 25.11). */
  field: {
    /**
     * How the fields grow (C). At most 6 cells in a row on a phone, so that a cell keeps 44 px even on a 320 px
     * screen; longer words on the bigger fields.
     */
    levels: [
      { from: 1, cols: 4, rows: 4, word: { min: 3, max: 5 } },
      { from: 11, cols: 5, rows: 5, word: { min: 3, max: 6 } },
      { from: 31, cols: 5, rows: 6, word: { min: 3, max: 6 } },
      { from: 81, cols: 6, rows: 7, word: { min: 4, max: 7 } },
      { from: 151, cols: 6, rows: 8, word: { min: 4, max: 7 } },
    ] satisfies FieldStep[],
    /** The daily field (C). */
    daily: { cols: 5, rows: 6, word: { min: 3, max: 6 } } satisfies Omit<FieldStep, 'from'>,
    /**
     * Hidden words come from this many of the most frequent crossword words, all lengths together (C): rarer
     * words of a length the language has few common ones of (a short coin name among the three-letter words)
     * stay out. Every length still has well over a hundred.
     */
    common: 2500,
    /** Moves that bend the field's path, per cell: the more, the less regular the words' shapes (C). */
    bends: 60,
    /**
     * How long the game may look for a way to fill the rest of the field after another real word (C): steps of
     * the search. Past it, the word counts as a bonus word — the field stays solvable.
     */
    solveSteps: 200000,
  },
  /** Which words the lists hold (scripts/words/build.ts). */
  dictionary: {
    /** Crossword words: the most frequent dictionary forms, this many per language (C). */
    answers: 8000,
    /** English (ESDB sizes: 35 small … 70 large): crossword words up to the first size, accepted up to the second (C). */
    enAnswerSize: 50,
    enAcceptedSize: 70,
  },
  /**
   * Short meanings of the crossword words (docs/words/SPEC.md, "Значення слів"; trial of 25.11): in
   * games/words/meanings/<lang>.txt, for every crossword word of the wheel's levels up to `trialLevels` (C); a
   * meaning has at most `max` characters, so it reads at a glance (C).
   */
  meanings: { trialLevels: 30, max: 100 },
} as const;
