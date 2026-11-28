// Pour ("Переливанка"): every number of the rules and the game's addresses (docs/pour/SPEC.md). (C) = Claude's
// proposal within the plan approved on 27.11; change it here, not in the logic.
import { gameAddress } from '../../shared/core/address.ts';

/** Free play's difficulties, the easiest first (docs/pour/SPEC.md, "Три шляхи"). */
export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

/** Free play's choices: the difficulties and the player's own size (decision of 28.11). */
export const KINDS = [...DIFFICULTIES, 'custom'] as const;
export type Kind = (typeof KINDS)[number];

/** How much help a level allows (decision of 27.11: without limits by default, limited in the menu). */
export const HELPS = ['free', 'some', 'none'] as const;
export type Help = (typeof HELPS)[number];

export interface HelpRule {
  /** Pours taken back in one level; null — any number. */
  undo: number | null;
  /** Hints in one level; null — any number. */
  hints: number | null;
  /** Empty bottles the player may add in one level. */
  extra: number;
}

/** Levels in a row: from which level a number of colours starts. */
export interface Stage {
  /** The first level with these colours (levels count from 1). */
  from: number;
  colours: number;
}

export const POUR = {
  /** The game's name where it is installed and in the shared daily result; the short name is app.name in the dictionaries. */
  name: 'way1ong Pour',
  /** The studio's site for the "Made by way1ong" line, and the game itself for the shared result; null — not public yet. */
  links: { site: null as string | null, game: gameAddress('pour') },
  /** Layers of water a bottle holds; there are as many layers of each colour (C). */
  capacity: 4,
  /**
   * Paints in the box (art/palette.ts: each with its pattern and name); a deal draws its colours from them, so the
   * most colours of a level is at most this (C).
   */
  paints: 11,
  /** Empty bottles at the start of every level (C: with two, every deal of the prototype could be solved). */
  empty: 2,
  /**
   * Levels in a row (decision of 27.11: the player chooses the way): from 3 colours to 11 (C). Within one number of
   * colours a later level takes a harder deal.
   */
  stages: [
    { from: 1, colours: 3 },
    { from: 3, colours: 4 },
    { from: 6, colours: 5 },
    { from: 10, colours: 6 },
    { from: 15, colours: 7 },
    { from: 21, colours: 8 },
    { from: 28, colours: 9 },
    { from: 36, colours: 10 },
    { from: 45, colours: 11 },
  ] satisfies Stage[],
  /** Free play: the colours of each difficulty (C). */
  difficulties: { easy: 5, medium: 8, hard: 11 } satisfies Record<Difficulty, number>,
  /**
   * Free play, the player's own size (decision of 28.11: "Роби"; docs/pour/SPEC.md, "Свій розмір"): colours and empty
   * bottles with − and +, within these bounds (C); the most colours are the paints in the box. Every deal is solved
   * before it is given, as everywhere. With one empty bottle a solvable deal is rare when there are many colours —
   * measured 28.11 over 300 seeds: with 8 colours the first solvable one came within 179 deals and 48 ms on a
   * computer, with 9 — within 592 and 212 ms, with 11 one seed of 50 found none in 4 000; with two or three empty
   * bottles every deal of the sample (20 for each count of colours, 2–11) was solvable. So one empty bottle goes up to
   * 8 colours; more colours have two at least.
   */
  custom: {
    colours: { least: 3, most: 11 },
    empty: { least: 1, most: 3 },
    /** More colours than `above` need `empty` empty bottles at least. */
    manyColours: { above: 8, empty: 2 },
    /** Until the player chooses: as the medium difficulty. */
    first: { colours: 8, empty: 2 },
  },
  /** The level of the day: middling (C). */
  dailyColours: 8,
  /** Help in one level by the menu's choice (decision of 27.11: without limits by default) (C). */
  helps: {
    free: { undo: null, hints: null, extra: 1 },
    some: { undo: 3, hints: 1, extra: 0 },
    none: { undo: 0, hints: 0, extra: 0 },
  } satisfies Record<Help, HelpRule>,
  defaultHelp: 'free' as Help,
  /**
   * The solver's limit: positions it looks at before it gives up not knowing (C). Measured 27.11: 200 fresh deals of
   * 11 colours needed at most 1 844, a position with no way left at most 15 (docs/STATUS.md, Pour).
   */
  solveLimit: 20_000,
  /**
   * Levels in a row: deals compared to pick one that suits the level (the easiest first in a stage, harder later),
   * and the random players that tell how hard a deal is (core/difficulty.ts) (C).
   */
  pick: { deals: 6, players: 20, maxMoves: 400 },
  /** A short buzz when a bottle is closed (a setting, off by default) (C). */
  vibrateMs: 12,
} as const;
