// Statistics on the device (docs/pour/SPEC.md, "Що зберігається"): free play by difficulty — games played and won,
// won without help, the fewest pours; levels in a row — won and won without help. The days of the level of the day
// are kept by the screen's storage (a list of dates), their runs counted here. Pure, no DOM.
import { DIFFICULTIES, type Difficulty } from '../config.ts';
import { clean, type PourPlay } from './play.ts';

export interface FreeStats {
  /** Games won, or begun and left for a new one. */
  played: number;
  won: number;
  /** Won without help. */
  clean: number;
  /** The fewest pours of a win; null — none yet. */
  bestMoves: number | null;
}

export interface PourStats {
  free: Record<Difficulty, FreeStats>;
  levels: { won: number; clean: number };
}

export const emptyStats = (): PourStats => ({
  free: Object.fromEntries(DIFFICULTIES.map((d) => [d, { played: 0, won: 0, clean: 0, bestMoves: null }])) as Record<Difficulty, FreeStats>,
  levels: { won: 0, clean: 0 },
});

/** A free game begun and left for a new one. */
export function recordLeft(stats: PourStats, difficulty: Difficulty): PourStats {
  const now = stats.free[difficulty];
  return { ...stats, free: { ...stats.free, [difficulty]: { ...now, played: now.played + 1 } } };
}

/** A game won (the level of the day counts only in its days). */
export function recordWon(stats: PourStats, play: PourPlay): PourStats {
  const tidy = clean(play) ? 1 : 0;
  if (play.way === 'level') return { ...stats, levels: { won: stats.levels.won + 1, clean: stats.levels.clean + tidy } };
  if (play.way !== 'free' || !play.difficulty) return stats;
  const now = stats.free[play.difficulty];
  const best = now.bestMoves === null ? play.moves : Math.min(now.bestMoves, play.moves);
  return { ...stats, free: { ...stats.free, [play.difficulty]: { played: now.played + 1, won: now.won + 1, clean: now.clean + tidy, bestMoves: best } } };
}

const dayNumber = (dateKey: string): number => {
  const [y, m, d] = dateKey.split('-').map(Number);
  return Math.floor(Date.UTC(y!, m! - 1, d!) / 86_400_000);
};

/** The longest run of days in a row among the dates ("YYYY-MM-DD") the level of the day was won. */
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
