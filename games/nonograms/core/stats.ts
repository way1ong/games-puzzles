// Statistics on the device (docs/nonograms/SPEC.md, "Що зберігається"): for each size, pictures solved, hints used in
// them and the best time; the longest run of pictures of the day. Pure, no DOM.
import { SIZES, type Size } from '../config.ts';
import { dayNumber } from './album.ts';
import type { Play } from './play.ts';

export interface SizeStats {
  solved: number;
  hints: number;
  /** The quickest solve, ms; null — none yet. */
  bestMs: number | null;
}

export type Stats = Record<Size, SizeStats>;

export const emptyStats = (): Stats => Object.fromEntries(SIZES.map((s) => [s, { solved: 0, hints: 0, bestMs: null }])) as Stats;

/** A solved picture counted in. */
export function recordSolved(stats: Stats, play: Play): Stats {
  const now = stats[play.size];
  const best = now.bestMs === null ? play.ms : Math.min(now.bestMs, play.ms);
  return { ...stats, [play.size]: { solved: now.solved + 1, hints: now.hints + play.hints, bestMs: play.ms > 0 ? best : now.bestMs } };
}

/** The longest run of days in a row among the dates ("YYYY-MM-DD") a picture of the day was solved. */
export function longestStreak(dates: readonly string[]): number {
  const days = [...new Set(dates.map(dayNumber))].sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  for (let i = 0; i < days.length; i++) {
    run = i > 0 && days[i]! - days[i - 1]! === 1 ? run + 1 : 1;
    best = Math.max(best, run);
  }
  return best;
}
