// Every number of the Pairs rules lives here (docs/pairs/SPEC.md). (C) = Claude's proposal within the plan
// approved on 25.11 ("Давай згідно плану"); change it here, not in the logic. The layouts themselves — the
// shapes the tiles are stacked in — are in core/layouts.ts.

import { gameAddress } from '../../shared/core/address.ts';

/** The pictures on the tiles (decision of 25.11: fruit, vegetables and everyday things), drawn in art/tiles.ts. */
export const PICTURES = [
  'apple',
  'pear',
  'cherries',
  'lemon',
  'grapes',
  'strawberry',
  'carrot',
  'mushroom',
  'cucumber',
  'key',
  'bell',
  'cup',
  'umbrella',
  'house',
  'boat',
  'star',
  'moon',
  'sun',
  'heart',
  'fish',
  'flower',
  'leaf',
  'tree',
  'drop',
] as const;
export type Picture = (typeof PICTURES)[number];

/**
 * A step of the levels: from this level on, one of these layouts (chosen by the level's seed), dealt as hard as `rate`
 * says — the share of random players who would clear the table (see PAIRS.difficulty).
 */
export interface LevelStep {
  from: number;
  layouts: readonly string[];
  rate: number;
}

export const PAIRS = {
  /** The game's name where it is installed and in the shared daily result (working name, decision of 25.11). */
  name: 'way1ong Pairs',
  /**
   * Addresses: the studio's site for the "Made by way1ong" line, and the game itself for the shared daily
   * result. null — not public yet: the line has no link, the result has no address.
   */
  links: { site: null as string | null, game: gameAddress('pairs') },
  /** A tile's width and height — proportions only (C). */
  tile: { width: 4, height: 5 },
  /**
   * The biggest layout (C): whole tiles across and down, and layers — so that a tile keeps 44 px on a phone
   * held upright and on its side (docs/pairs/SPEC.md, "Розклади й рівні").
   */
  max: { columns: 6, rows: 6, layers: 4 },
  /** Each picture comes this many times at most: two pairs (C). */
  copies: 4,
  /**
   * How the layouts grow, from the first level, and how hard their deals are (decision of 25.11, «Пари дуже прості,
   * ніякої важкості»: small layouts only to learn, then quickly bigger and harder) (C: the numbers).
   */
  levels: [
    { from: 1, layouts: ['cross', 'square', 'frame', 'bridge'], rate: 0.8 },
    { from: 4, layouts: ['steps', 'gate', 'pyramid', 'flower', 'rings'], rate: 0.5 },
    { from: 11, layouts: ['diamond', 'terrace', 'dome', 'slope', 'ridge'], rate: 0.35 },
    { from: 31, layouts: ['ziggurat', 'mountain', 'peak'], rate: 0.25 },
  ] satisfies LevelStep[],
  /** The layout of the day: one of these, chosen by the date, and among the hardest deals (C). */
  daily: { layouts: ['diamond', 'terrace', 'dome', 'slope'], rate: 0.2 },
  /**
   * Choosing a deal by how hard it is (decision of 25.11): of `candidates` deals in a row from the level's seed, the
   * one whose clear rate — how often a player who takes any matching pair at random clears the table, out of `plays`
   * such plays — is nearest the step's `rate` (C).
   */
  difficulty: { candidates: 8, plays: 60 },
  /** Attempts at a way to an empty table before taking the next seed (C) — tests show far fewer are needed. */
  dealTries: 400,
  /** The solver's steps (a hint, "can it still be won?") before it says "do not know" (C). */
  solveSteps: 200_000,
  /** Steps back a hint looks through for "it can be won again after N steps back" (C). */
  lookBack: 30,
  /**
   * Shuffles a layout may have — a choice in the menu, for whoever wants a harder game (decision of 25.11: «Що до
   * перемішування, додай можливість вибору обмеження кількості перемішувань»). null — no limit, the default; the
   * other choices (C).
   */
  shuffleLimits: [null, 3, 1, 0] as readonly (number | null)[],
} as const;
