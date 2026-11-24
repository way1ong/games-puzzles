// What the statistics keep for every level: puzzles solved, how many of them without a hint, and the best time
// of those (a time with hints would not be comparable).
import { LEVELS, type Level } from '../config.ts';
import type { Game } from './game.ts';

export interface LevelStats {
  solved: number;
  /** Solved without asking for a hint. */
  clean: number;
  /** The shortest time of a puzzle solved without hints, ms; null — none yet. */
  bestMs: number | null;
}

export type Stats = Record<Level, LevelStats>;

export function emptyStats(): Stats {
  return Object.fromEntries(LEVELS.map((level) => [level, { solved: 0, clean: 0, bestMs: null }])) as Stats;
}

/** The statistics after a solved game (an unsolved game changes nothing). */
export function recordSolved(stats: Stats, game: Game): Stats {
  if (!game.solved) return stats;
  const now = stats[game.level];
  const clean = game.hints === 0;
  const bestMs = clean && game.ms > 0 && (now.bestMs === null || game.ms < now.bestMs) ? game.ms : now.bestMs;
  return { ...stats, [game.level]: { solved: now.solved + 1, clean: now.clean + (clean ? 1 : 0), bestMs } };
}
