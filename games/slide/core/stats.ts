// Statistics on the device (docs/slide/SPEC.md, "Що зберігається"): the fifteen by difficulty (size) — played, solved,
// solved without help, the fewest moves; "Clear the way" — levels in a row and each difficulty of free play: solved,
// without help, in the fewest moves without help. The days of each mode's puzzle of the day are kept by the screen's
// storage (a list of dates), their runs counted here. Pure, no DOM.
import { DIFFICULTIES, type Difficulty } from '../config.ts';
import { clean, perfect, type SlidePlay } from './play.ts';

export interface FifteenStats {
  /** Games solved, or begun and left for a new one. */
  played: number;
  won: number;
  /** Solved without help. */
  clean: number;
  /** The fewest moves of a solved game; null — none yet. */
  bestMoves: number | null;
}

export interface UnblockStats {
  /** Games solved, or begun and left for a new one (free play only). */
  played: number;
  won: number;
  clean: number;
  /** Solved without help in the fewest moves. */
  perfect: number;
}

export interface SlideStats {
  fifteen: Record<Difficulty, FifteenStats>;
  unblock: { levels: UnblockStats; free: Record<Difficulty, UnblockStats> };
}

const each = <T>(make: () => T) => Object.fromEntries(DIFFICULTIES.map((d) => [d, make()])) as Record<Difficulty, T>;

export const emptyStats = (): SlideStats => ({
  fifteen: each(() => ({ played: 0, won: 0, clean: 0, bestMoves: null })),
  unblock: { levels: { played: 0, won: 0, clean: 0, perfect: 0 }, free: each(() => ({ played: 0, won: 0, clean: 0, perfect: 0 })) },
});

/** A free game begun and left for a new one. */
export function recordLeft(stats: SlideStats, play: SlidePlay): SlideStats {
  if (play.way !== 'free' || !play.difficulty) return stats;
  const d = play.difficulty;
  if (play.mode === 'fifteen') return { ...stats, fifteen: { ...stats.fifteen, [d]: { ...stats.fifteen[d], played: stats.fifteen[d].played + 1 } } };
  const free = stats.unblock.free;
  return { ...stats, unblock: { ...stats.unblock, free: { ...free, [d]: { ...free[d], played: free[d].played + 1 } } } };
}

/** A game solved (the puzzles of the day count only in their days). */
export function recordWon(stats: SlideStats, play: SlidePlay): SlideStats {
  const tidy = clean(play) ? 1 : 0;
  if (play.mode === 'fifteen') {
    if (play.way !== 'free' || !play.difficulty) return stats;
    const now = stats.fifteen[play.difficulty];
    const best = now.bestMoves === null ? play.moves : Math.min(now.bestMoves, play.moves);
    return { ...stats, fifteen: { ...stats.fifteen, [play.difficulty]: { played: now.played + 1, won: now.won + 1, clean: now.clean + tidy, bestMoves: best } } };
  }
  const add = (s: UnblockStats): UnblockStats => ({ played: s.played + 1, won: s.won + 1, clean: s.clean + tidy, perfect: s.perfect + (perfect(play) ? 1 : 0) });
  if (play.way === 'level') return { ...stats, unblock: { ...stats.unblock, levels: add(stats.unblock.levels) } };
  if (play.way !== 'free' || !play.difficulty) return stats;
  return { ...stats, unblock: { ...stats.unblock, free: { ...stats.unblock.free, [play.difficulty]: add(stats.unblock.free[play.difficulty]) } } };
}

const dayNumber = (dateKey: string): number => {
  const [y, m, d] = dateKey.split('-').map(Number);
  return Math.floor(Date.UTC(y!, m! - 1, d!) / 86_400_000);
};

/** The longest run of days in a row among the dates ("YYYY-MM-DD") a puzzle of the day was solved. */
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
