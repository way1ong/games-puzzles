// Statistics of finished layouts (docs/pairs/SPEC.md, "Кінець розкладу"): levels and layouts of the day passed,
// how many of them without hints or shuffles, and the longest run of days in a row. Pure.
import type { PairsPlay } from './play.ts';

export interface Stats {
  levels: number;
  levelsClean: number;
  days: number;
  daysClean: number;
}

export const emptyStats = (): Stats => ({ levels: 0, levelsClean: 0, days: 0, daysClean: 0 });

/** Without a hint and without a shuffle. */
export const isClean = (play: PairsPlay): boolean => play.hints === 0 && play.shuffles === 0;

/** A finished layout, counted. */
export function recordDone(stats: Stats, play: PairsPlay): Stats {
  const clean = isClean(play) ? 1 : 0;
  return play.daily === null
    ? { ...stats, levels: stats.levels + 1, levelsClean: stats.levelsClean + clean }
    : { ...stats, days: stats.days + 1, daysClean: stats.daysClean + clean };
}

/** The day's number on the calendar ("YYYY-MM-DD" → days since 1970), whatever the time zone. */
function dayNumber(key: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  return m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / 86_400_000 : null;
}

/** The longest run of days in a row among the dates ("YYYY-MM-DD"). */
export function longestStreak(dates: readonly string[]): number {
  const days = [...new Set(dates.map(dayNumber).filter((n): n is number => n !== null))].sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  for (let i = 0; i < days.length; i++) {
    run = i > 0 && days[i]! - days[i - 1]! === 1 ? run + 1 : 1;
    best = Math.max(best, run);
  }
  return best;
}
