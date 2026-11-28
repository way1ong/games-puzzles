// Solitaire: every number of the rules and the game's addresses (docs/solitaire/SPEC.md). The logic reads only
// these names.
import { gameAddress } from '../../shared/core/address.ts';

/** How many cards one touch of the stock turns: one (by default) or three (docs/solitaire/SPEC.md, "Налаштування"). */
export const DRAWS = [1, 3] as const;
export type Draw = (typeof DRAWS)[number];

/** How many suits Spider's cards have (docs/solitaire/SPEC.md, "Павук"): one (spades), two (spades, hearts) or four. */
export const SPIDER_SUITS = [1, 2, 4] as const;
export type SpiderSuits = (typeof SPIDER_SUITS)[number];

/**
 * How many free cells FreeCell has (docs/solitaire/SPEC.md, "Вільні клітинки"; decision of 28.11): four, the classic,
 * or fewer — harder.
 */
export const FREE_CELLS = [4, 3, 2] as const;
export type FreeCells = (typeof FREE_CELLS)[number];

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
  /**
   * The stock turned over this many times with nothing changed (no card off the waste or home, no face-down card
   * turned up): the player is going round in circles, and the game checks, unasked, whether the deal can still be
   * won (decision of 25.11, «Так на пасьянс»).
   */
  circles: 2,
  /** Deals made in advance for each way of turning the stock. */
  readyPerDraw: 1,
  /**
   * Spider (docs/solitaire/SPEC.md, "Павук"; decision of 26.11): two decks; ten columns and the cards dealt to each
   * at the start (the top one face up); the rest is the stock, a card to each column a deal; eight runs from the
   * king down to the ace, one suit each, win. One suit by default, the easiest (decision of 26.11).
   */
  spider: {
    decks: 2,
    columns: 10,
    deal: [6, 6, 6, 6, 5, 5, 5, 5, 5, 5],
    runs: 8,
    defaultSuits: 1 as SpiderSuits,
    /**
     * The suits whose deals are checked to be winnable before they are shown (decision of 26.11, «варіант А»): with four
     * the solver wins too few deals in its time (2–4 of 20), so those are dealt as the cards fall.
     */
    checked: [1, 2] as readonly SpiderSuits[],
    /**
     * Solving (C): positions a search may look at — for a deal before it is shown, for a hint, for each look back when
     * the hint counts the moves to undo — and how many searches, each along another order of equal moves, it may make.
     */
    solve: { deal: 10_000, hint: 20_000, back: 4_000, attempts: 10 },
    /** Seeds tried, one after another, for one deal that can be won. */
    dealTries: 32,
    /** How far back the hint looks for a position that can still be won, in moves. */
    lookBack: 200,
  },
  /**
   * FreeCell (docs/solitaire/SPEC.md, "Вільні клітинки"; decision of 28.11): one deck, every card face up; eight
   * columns and the cards dealt to each; four free cells by default (the classic); the cards no longer needed go home
   * by themselves unless the player turns it off.
   */
  freecell: {
    columns: 8,
    deal: [7, 7, 7, 7, 6, 6, 6, 6],
    defaultCells: 4 as FreeCells,
    defaultAutoHome: true,
    /**
     * Solving (C): positions the solver may look at — for a deal before it is shown (a deal it has not won within them
     * is not shown), for a hint, for each look back when the hint counts the moves to undo.
     */
    solve: { deal: 20_000, hint: 40_000, back: 10_000 },
    /** Seeds tried, one after another, for one deal that can be won. */
    dealTries: 32,
    /** How far back the hint looks for a position that can still be won, in moves. */
    lookBack: 200,
  },
} as const;
