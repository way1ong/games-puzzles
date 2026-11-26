// Spider's deals (docs/solitaire/SPEC.md, "Павук"; decisions of 26.11): with one or two suits, from a seed on, the first
// deal the solver wins within its budget; with four, any deal as the cards fall — the solver wins too few in time
// («варіант А»). The deal of the day from the date and the number of suits, the same for everybody. In slices. Pure.
import { seedFromText } from '../../../shared/core/rng.ts';
import { SOLITAIRE, type SpiderSuits } from '../config.ts';
import type { Task } from './deals.ts';
import { spiderSearch, type SearchResult } from './spider-search.ts';
import { spiderDeal } from './spider.ts';

const RULES = SOLITAIRE.spider;

/** Whether deals of this many suits are checked to be winnable before they are shown. */
export const spiderChecked = (suits: SpiderSuits): boolean => RULES.checked.includes(suits);

/**
 * The first seed from `seed` on whose deal can be won (with four suits — `seed` itself); null if none of
 * RULES.dealTries seeds was won.
 */
export function spiderWinnableSeed(seed: number, suits: SpiderSuits): Task<number | null> {
  let current = seed >>> 0;
  if (!spiderChecked(suits)) return { run: () => current };
  let tries = 1;
  const search = (s: number): Task<SearchResult> => spiderSearch(spiderDeal(s, suits), suits, RULES.solve.deal, RULES.solve.attempts);
  let task = search(current);
  return {
    run(steps) {
      const result = task.run(steps);
      if (result === undefined) return undefined;
      if (result.status === 'won') return current;
      if (tries >= RULES.dealTries) return null;
      tries += 1;
      current = (current + 1) >>> 0;
      task = search(current);
      return undefined;
    },
  };
}

/** The seed the deal of the day starts from: the date and the number of suits. */
export const spiderDailySeed = (dateKey: string, suits: SpiderSuits): number => seedFromText(`way1ong-solitaire:spider:${suits}:${dateKey}`);
