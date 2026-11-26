// Spider's statistics (docs/solitaire/SPEC.md, "Павук"): for each number of suits — deals played (won, or left with
// moves made), won, won without hints, the best time. Like Klondike's for each way of turning the stock (stats.ts). Pure.
import { SPIDER_SUITS, type SpiderSuits } from '../config.ts';
import type { Spider } from './spider.ts';
import type { DrawStats } from './stats.ts';

export type SpiderStats = Record<SpiderSuits, DrawStats>;

export const emptySpiderStats = (): SpiderStats =>
  Object.fromEntries(SPIDER_SUITS.map((s) => [s, { played: 0, won: 0, clean: 0, bestMs: null }])) as SpiderStats;

/** A deal left unfinished after moves were made: played, not won. */
export function recordSpiderLeft(stats: SpiderStats, g: Spider): SpiderStats {
  if (g.done || g.history.length === 0) return stats;
  const s = stats[g.suits];
  return { ...stats, [g.suits]: { ...s, played: s.played + 1 } };
}

/** A deal won. */
export function recordSpiderWon(stats: SpiderStats, g: Spider): SpiderStats {
  const s = stats[g.suits];
  return {
    ...stats,
    [g.suits]: {
      played: s.played + 1,
      won: s.won + 1,
      clean: s.clean + (g.hints === 0 ? 1 : 0),
      bestMs: s.bestMs === null ? g.ms : Math.min(s.bestMs, g.ms),
    },
  };
}
