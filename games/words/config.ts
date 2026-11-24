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
  /**
   * Hungarian letters written with two characters that make one tile when the setting is on (as in Hungarian
   * Scrabble; decision of 24.11, to confirm with a Hungarian speaker). dz and dzs stay separate letters there.
   */
  huTiles: ['cs', 'gy', 'ly', 'ny', 'sz', 'ty', 'zs'],
  /** A missed day the daily streak forgives when the setting is on (C). */
  graceDays: 1,
  /** Which words the lists hold (scripts/words/build.ts). */
  dictionary: {
    /** Crossword words: the most frequent dictionary forms, this many per language (C). */
    answers: 8000,
    /** English (ESDB sizes: 35 small … 70 large): crossword words up to the first size, accepted up to the second (C). */
    enAnswerSize: 50,
    enAcceptedSize: 70,
  },
} as const;
