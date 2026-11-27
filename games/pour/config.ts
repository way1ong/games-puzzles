// Pour ("Переливанка"): every number of the rules and the game's addresses (docs/pour/SPEC.md). (C) = Claude's
// proposal within the plan approved on 27.11; change it here, not in the logic.
import { gameAddress } from '../../shared/core/address.ts';

/** Free play's difficulties, the easiest first (docs/pour/SPEC.md, "Три шляхи"). */
export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

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
  /** The level of the day: middling (C). */
  dailyColours: 8,
  /** Help in one level by the menu's choice (decision of 27.11: without limits by default) (C). */
  helps: {
    free: { undo: null, hints: null, extra: 1 },
    some: { undo: 3, hints: 1, extra: 0 },
    none: { undo: 0, hints: 0, extra: 0 },
  } satisfies Record<Help, HelpRule>,
  defaultHelp: 'free' as Help,
  /** A short buzz when a bottle is closed (a setting, off by default) (C). */
  vibrateMs: 12,
} as const;
