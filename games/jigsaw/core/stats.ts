// Statistics on the device (docs/jigsaw/SPEC.md, "Що зберігається"): for each size of free play — played, put
// together, without a hint, the fastest. The days of the puzzle of the day are kept by the screen's storage (a list of
// dates), their runs counted here. Pure, no DOM.
import { DIFFICULTIES, type Difficulty } from '../config.ts';
import { clean, type JigsawPlay } from './play.ts';

export interface SizeStats {
  /** Puzzles put together, or begun and left for a new one. */
  played: number;
  won: number;
  /** Put together without a hint. */
  clean: number;
  /** The shortest time of a puzzle put together, ms; null — none yet. */
  bestMs: number | null;
}

export type JigsawStats = Record<Difficulty, SizeStats>;

export const emptyStats = (): JigsawStats =>
  Object.fromEntries(DIFFICULTIES.map((d) => [d, { played: 0, won: 0, clean: 0, bestMs: null }])) as JigsawStats;

/** A free puzzle begun and left for a new one. */
export function recordLeft(stats: JigsawStats, play: JigsawPlay): JigsawStats {
  if (play.way !== 'free') return stats;
  const now = stats[play.difficulty];
  return { ...stats, [play.difficulty]: { ...now, played: now.played + 1 } };
}

/** A free puzzle put together (the puzzles of the day count only in their days). */
export function recordWon(stats: JigsawStats, play: JigsawPlay): JigsawStats {
  if (play.way !== 'free') return stats;
  const now = stats[play.difficulty];
  const ms = Math.round(play.ms);
  return {
    ...stats,
    [play.difficulty]: {
      played: now.played + 1,
      won: now.won + 1,
      clean: now.clean + (clean(play) ? 1 : 0),
      bestMs: now.bestMs === null ? ms : Math.min(now.bestMs, ms),
    },
  };
}

const dayNumber = (dateKey: string): number => {
  const [y, m, d] = dateKey.split('-').map(Number);
  return Math.floor(Date.UTC(y!, m! - 1, d!) / 86_400_000);
};

/** The longest run of days in a row among the dates ("YYYY-MM-DD") the puzzle of the day was put together. */
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
