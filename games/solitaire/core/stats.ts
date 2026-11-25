// Statistics (docs/solitaire/SPEC.md, "Кінець роздачі"): for each way of turning the stock — deals played (won, or
// left with moves made), won, won without hints, the best time; and the longest run of days of the deal of the day.
// Pure.
import { DRAWS, type Draw } from '../config.ts';
import type { Klondike } from './klondike.ts';

export interface DrawStats {
  played: number;
  won: number;
  clean: number;
  bestMs: number | null;
}

export type Stats = Record<Draw, DrawStats>;

export const emptyStats = (): Stats => Object.fromEntries(DRAWS.map((d) => [d, { played: 0, won: 0, clean: 0, bestMs: null }])) as Stats;

/** A deal left unfinished after moves were made: played, not won. */
export function recordLeft(stats: Stats, g: Klondike): Stats {
  if (g.done || g.history.length === 0) return stats;
  const s = stats[g.draw];
  return { ...stats, [g.draw]: { ...s, played: s.played + 1 } };
}

/** A deal won. */
export function recordWon(stats: Stats, g: Klondike): Stats {
  const s = stats[g.draw];
  return {
    ...stats,
    [g.draw]: {
      played: s.played + 1,
      won: s.won + 1,
      clean: s.clean + (g.hints === 0 ? 1 : 0),
      bestMs: s.bestMs === null ? g.ms : Math.min(s.bestMs, g.ms),
    },
  };
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
