// The daily puzzle: the same pieces for everybody on the same calendar day (the player's local date).
import { seedFromText } from './rng.ts';

/** "YYYY-MM-DD" of the given moment in the device's local time. */
export function localDateKey(moment: Date): string {
  const y = moment.getFullYear();
  const m = String(moment.getMonth() + 1).padStart(2, '0');
  const d = String(moment.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function dailySeed(dateKey: string): number {
  return seedFromText(`way1ong-blocks:daily:${dateKey}`);
}

/** Days in a row ending today (or yesterday, if today is not played yet), from the dates played. */
export function streak(playedDates: readonly string[], todayKey: string): number {
  const played = new Set(playedDates);
  const day = new Date(`${todayKey}T12:00:00`);
  if (!played.has(todayKey)) day.setDate(day.getDate() - 1);
  let count = 0;
  while (played.has(localDateKey(day))) {
    count++;
    day.setDate(day.getDate() - 1);
  }
  return count;
}
