// The daily puzzle: the same pieces for everybody on the same calendar day (the player's local date —
// shared/core/dates.ts).
import { seedFromText } from '../../../shared/core/rng.ts';

export function dailySeed(dateKey: string): number {
  return seedFromText(`way1ong-blocks:daily:${dateKey}`);
}
