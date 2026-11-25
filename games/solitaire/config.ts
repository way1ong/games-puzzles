// Solitaire: every number of the rules and the game's addresses (docs/solitaire/SPEC.md). The logic reads only
// these names.
import { gameAddress } from '../../shared/core/address.ts';

/** How many cards one touch of the stock turns: one (by default) or three (docs/solitaire/SPEC.md, "Налаштування"). */
export const DRAWS = [1, 3] as const;
export type Draw = (typeof DRAWS)[number];

export const SOLITAIRE = {
  name: 'way1ong Solitaire',
  links: { site: null as string | null, game: gameAddress('solitaire') },
  /** One deck: four suits of thirteen ranks, from the ace to the king. */
  deck: { suits: 4, ranks: 13 },
  /** Klondike: the columns of the deal; the first holds one card, each next one more. */
  klondike: { columns: 7 },
  /** A card's proportion, width to height (C). */
  card: { width: 5, height: 7 },
  /**
   * Solving: positions the solver may look at before it gives up — on a deal before it is shown (a deal it has not
   * won within them is not shown), for a hint, for each look back when the hint counts the moves to undo (C).
   */
  solve: { deal: 20_000, hint: 40_000, back: 10_000 },
  /** Seeds tried, one after another, for one deal that can be won. */
  dealTries: 64,
  /** How far back the hint looks for a position that can still be won, in moves. */
  lookBack: 200,
  /** Deals made in advance for each way of turning the stock. */
  readyPerDraw: 1,
} as const;
