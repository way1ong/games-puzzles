// The daily puzzle: the same for everybody on the same calendar day (the player's local date —
// shared/core/dates.ts), one for each level.
import { seedFromText } from '../../../shared/core/rng.ts';
import type { Level } from '../config.ts';

export function dailySeed(dateKey: string, level: Level): number {
  return seedFromText(`way1ong-sudoku:daily:${dateKey}:${level}`);
}
