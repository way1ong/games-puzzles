// Where a touched card of FreeCell goes by itself (docs/solitaire/SPEC.md, "Вільні клітинки"): a single card home first;
// else the cards from it up onto a column where they lie in order — the longest run there first; else a single card
// from a column into a free cell; else into an empty column (never a whole column: nothing changes). When nothing fits,
// why: the cards are not in order, or more than may move together (and where they would have gone), or no place. Pure.
import { suitOf } from './cards.ts';
import { emptyColumns, freeCellsLeft, moveLimit, moveRefusal, movingCards, orderStart, type FreePlace, type FreeTable } from './freecell.ts';

/** The place the cards of `from` (from `index` up, for a column) go to by a touch; null — none. */
export function freeBestPlace(t: FreeTable, from: FreePlace, index: number): FreePlace | null {
  const cards = movingCards(t, from, index);
  if (!cards) return null;
  const fits = (to: FreePlace) => moveRefusal(t, from, index, to) === null;
  if (cards.length === 1) {
    const home: FreePlace = { kind: 'foundation', suit: suitOf(cards[0]!) };
    if (fits(home)) return home;
  }
  let best: FreePlace | null = null;
  let bestRun = -1;
  for (let j = 0; j < t.columns.length; j++) {
    const to: FreePlace = { kind: 'column', index: j };
    if (t.columns[j]!.length === 0 || !fits(to)) continue;
    const run = t.columns[j]!.length - orderStart(t, j);
    if (run > bestRun) {
      best = to;
      bestRun = run;
    }
  }
  if (best) return best;
  if (from.kind === 'column' && cards.length === 1) {
    const cell = t.cells.indexOf(null);
    if (cell >= 0) return { kind: 'cell', index: cell };
  }
  const wholeColumn = from.kind === 'column' && index === 0;
  if (!wholeColumn) {
    const empty = t.columns.findIndex((c) => c.length === 0);
    if (empty >= 0 && fits({ kind: 'column', index: empty })) return { kind: 'column', index: empty };
  }
  return null;
}

/** Why a touch moves nothing, with the numbers for "too many": the most that may move there, free cells, empty columns. */
export type TapRefusal =
  | { kind: 'order' }
  | { kind: 'too-many'; most: number; cells: number; empty: number }
  | { kind: 'no-place' };

export function tapRefusal(t: FreeTable, from: FreePlace, index: number): TapRefusal {
  if (from.kind === 'column' && !movingCards(t, from, index)) return { kind: 'order' };
  for (let j = 0; j < t.columns.length; j++) {
    const to: FreePlace = { kind: 'column', index: j };
    if (from.kind === 'column' && from.index === j) continue;
    if (moveRefusal(t, from, index, to) === 'too-many' && !(t.columns[j]!.length === 0 && from.kind === 'column' && index === 0)) {
      return { kind: 'too-many', most: moveLimit(t, to), cells: freeCellsLeft(t), empty: emptyColumns(t) };
    }
  }
  return { kind: 'no-place' };
}
