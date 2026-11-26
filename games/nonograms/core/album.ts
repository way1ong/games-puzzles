// The album and the picture of the day (docs/nonograms/SPEC.md, "Малюнки"): the pictures by size in their order, the
// next one not solved yet, and the picture of a day — the same for everybody, chosen from the album by the date, no
// picture twice until every one has had its day. Pure, no DOM.
import { nextInt, seedFromText } from '../../../shared/core/rng.ts';
import { NONOGRAMS, type Size } from '../config.ts';
import type { Picture } from './picture.ts';

/** A chapter of the album: the pictures of a size, in their order. */
export const chapterOf = (pictures: readonly Picture[], size: Size): Picture[] => pictures.filter((p) => p.size === size);

/** The first picture after `after` (from the start when none) that is not solved, going round; null — all solved. */
export function nextUnsolved(chapter: readonly Picture[], solved: ReadonlySet<string>, after: string | null = null): Picture | null {
  const from = after === null ? 0 : chapter.findIndex((p) => p.id === after) + 1;
  for (let k = 0; k < chapter.length; k++) {
    const p = chapter[(from + k) % chapter.length]!;
    if (!solved.has(p.id)) return p;
  }
  return null;
}

/** The day's number since the start of 1970, of a calendar date "YYYY-MM-DD". */
export function dayNumber(dateKey: string): number {
  const [y, m, d] = dateKey.split('-').map(Number);
  return Math.floor(Date.UTC(y!, m! - 1, d!) / 86_400_000);
}

/** The picture of a day: the pictures of the daily size in an order shuffled for each round of them. */
export function dailyPicture(pictures: readonly Picture[], dateKey: string): Picture {
  const pool = chapterOf(pictures, NONOGRAMS.daily.size);
  if (!pool.length) throw new Error(`No pictures of ${NONOGRAMS.daily.size} for the picture of the day`);
  const day = dayNumber(dateKey);
  const round = Math.floor(day / pool.length);
  const order = pool.map((_, i) => i);
  let state = seedFromText(`way1ong-nonograms:daily:${round}`);
  for (let i = order.length - 1; i > 0; i--) {
    const draw = nextInt(state, i + 1);
    state = draw.state;
    [order[i], order[draw.value]] = [order[draw.value]!, order[i]!];
  }
  return pool[order[day - round * pool.length]!]!;
}
