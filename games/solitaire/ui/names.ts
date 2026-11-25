// Cards and places in words of the language (docs/solitaire/SPEC.md, "Карти"): "Seven of hearts", «Сімка черв»,
// «Kőr hetes»; the letter in a card's corner; where a card goes ("column 3", "the foundation").
import { SUITS, rankOf, suitOf, type Card } from '../core/cards.ts';
import type { Place } from '../core/klondike.ts';
import { fmt, type Dict } from './i18n.ts';

type RankKey = keyof Dict['cards']['ranks'];
type ShortKey = keyof Dict['cards']['short'];

export function cardName(card: Card, d: Dict): string {
  const rank = d.cards.ranks[String(rankOf(card)) as RankKey];
  const suit = d.cards.suits[SUITS[suitOf(card)]!];
  return fmt(d.cards.name, { rank, suit });
}

/** What the corner shows: the number, or the letter of the ace and the faces. */
export function cardSign(card: Card, d: Dict): string {
  const rank = rankOf(card);
  const short = d.cards.short[String(rank) as ShortKey] as string | undefined;
  return short ?? String(rank);
}

/** Where a card goes, as the end of a sentence: "column 3", «у стовпець 3», "the foundation". */
export function targetName(to: Place, d: Dict): string {
  if (to.kind === 'foundation') return d.game.toFoundation;
  if (to.kind === 'column') return fmt(d.game.toColumn, { n: to.index + 1 });
  return '';
}
