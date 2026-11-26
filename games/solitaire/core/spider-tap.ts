// Where a touched card of Spider goes by itself (docs/solitaire/SPEC.md, "Павук"): the run that starts with it goes onto
// a card of its own suit one rank higher — the longest run of that suit first — else onto any card one rank higher,
// else onto an empty column; a whole column that lies there alone gains nothing in another empty one. Pure.
import type { SpiderSuits } from '../config.ts';
import { canMoveRun, runStart, spiderSuit, type SpiderTable } from './spider.ts';

/** The column the cards of `from` from `index` up go to by a touch; null — none. */
export function spiderBestPlace(t: SpiderTable, suits: SpiderSuits, from: number, index: number): number | null {
  const col = t.columns[from];
  if (!col || index < runStart(t, suits, from)) return null;
  const card = col[index]!;
  let sameSuit: number | null = null;
  let sameLength = -1;
  let other: number | null = null;
  let empty: number | null = null;
  for (let j = 0; j < t.columns.length; j++) {
    if (j === from || !canMoveRun(t, suits, from, index, j)) continue;
    const target = t.columns[j]!;
    if (target.length === 0) {
      // a column that lies alone gains nothing in another empty one
      if (empty === null && !(index === 0 && t.down[from] === 0)) empty = j;
      continue;
    }
    if (spiderSuit(target[target.length - 1]!, suits) === spiderSuit(card, suits)) {
      const length = target.length - runStart(t, suits, j);
      if (length > sameLength) {
        sameSuit = j;
        sameLength = length;
      }
    } else if (other === null) other = j;
  }
  return sameSuit ?? other ?? empty;
}
