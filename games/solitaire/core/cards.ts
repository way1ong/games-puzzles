// The cards of one deck (docs/solitaire/SPEC.md, "Косинка: як грати"): a card is a number, suit × ranks + (rank − 1);
// the suits go spades, hearts, clubs, diamonds, so black and red take turns. A deck shuffled from a seed is the same
// on every device (rule 4). Pure.
import { nextInt } from '../../../shared/core/rng.ts';
import { SOLITAIRE } from '../config.ts';

export const SUITS = ['spades', 'hearts', 'clubs', 'diamonds'] as const;
export type Suit = (typeof SUITS)[number];
export type Card = number;

const RANKS = SOLITAIRE.deck.ranks;
/** Cards in the deck. */
export const DECK = SOLITAIRE.deck.suits * RANKS;
/** The rank of the king, the highest. */
export const KING = RANKS;

export const suitOf = (card: Card): number => Math.floor(card / RANKS);
export const rankOf = (card: Card): number => (card % RANKS) + 1;
export const isRed = (card: Card): boolean => suitOf(card) % 2 === 1;
export const cardOf = (suit: number, rank: number): Card => suit * RANKS + rank - 1;

/** The whole deck in the order the seed gives (Fisher–Yates with the shared generator). */
export function shuffledDeck(seed: number): Card[] {
  const deck = Array.from({ length: DECK }, (_, i) => i);
  let state = seed >>> 0;
  for (let i = deck.length - 1; i > 0; i--) {
    const draw = nextInt(state, i + 1);
    state = draw.state;
    [deck[i], deck[draw.value]] = [deck[draw.value]!, deck[i]!];
  }
  return deck;
}
