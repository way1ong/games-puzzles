// Where a touched card goes by itself (docs/solitaire/SPEC.md, "Екрани й керування"): home first (a single card),
// then onto a column where it lies — a column with cards before an empty one, which only a king takes. A card from
// home does not come down by a touch (only by dragging), so a slip of the finger does not undo a foundation. Pure.
import { canMove, movingCards, type Place, type Table } from './klondike.ts';
import { suitOf } from './cards.ts';

export function bestPlace(t: Table, from: Place, index: number): Place | null {
  if (from.kind === 'foundation') return null;
  const cards = movingCards(t, from, index);
  if (!cards) return null;
  if (cards.length === 1) {
    const home: Place = { kind: 'foundation', suit: suitOf(cards[0]!) };
    if (canMove(t, from, index, home)) return home;
  }
  let empty: Place | null = null;
  for (let i = 0; i < t.columns.length; i++) {
    if (from.kind === 'column' && from.index === i) continue;
    const to: Place = { kind: 'column', index: i };
    if (!canMove(t, from, index, to)) continue;
    if (t.columns[i]!.length > 0) return to;
    // A king that already lies at the bottom of its column gains nothing in another empty one.
    const alone = from.kind === 'column' && index === 0 && t.down[from.index] === 0;
    if (!empty && !alone) empty = to;
  }
  return empty;
}
