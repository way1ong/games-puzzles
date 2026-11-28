// Statistics on the device (docs/mines/SPEC.md, "Що зберігається"): for each level and the player's own size (all its
// sizes together), games played and won, won without mistakes and hints, the best time; the longest run of days with a
// field of the day. Pure, no DOM.
import { KINDS, type Kind } from '../config.ts';
import type { MinesPlay } from './play.ts';

export interface LevelStats {
  /** Games won, lost on a mine (when it means starting over) or left for a new field. */
  played: number;
  won: number;
  /** Won without a mine taken back and without a hint. */
  clean: number;
  /** The quickest win, ms; null — none yet. */
  bestMs: number | null;
}

export type MinesStats = Record<Kind, LevelStats>;

export const emptyStats = (): MinesStats => Object.fromEntries(KINDS.map((l) => [l, { played: 0, won: 0, clean: 0, bestMs: null }])) as MinesStats;

/** A game lost on a mine, or left for a new field. */
export function recordPlayed(stats: MinesStats, level: Kind): MinesStats {
  const now = stats[level];
  return { ...stats, [level]: { ...now, played: now.played + 1 } };
}

/** A game won. */
export function recordWon(stats: MinesStats, play: MinesPlay): MinesStats {
  const now = stats[play.level];
  const clean = play.hints === 0 && play.mistakes === 0;
  const best = play.ms > 0 ? (now.bestMs === null ? play.ms : Math.min(now.bestMs, play.ms)) : now.bestMs;
  return { ...stats, [play.level]: { played: now.played + 1, won: now.won + 1, clean: now.clean + (clean ? 1 : 0), bestMs: best } };
}

const dayNumber = (dateKey: string): number => {
  const [y, m, d] = dateKey.split('-').map(Number);
  return Math.floor(Date.UTC(y!, m! - 1, d!) / 86_400_000);
};

/** The longest run of days in a row among the dates ("YYYY-MM-DD") a field of the day was won. */
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
