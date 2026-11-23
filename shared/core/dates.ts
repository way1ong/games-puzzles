// Calendar days on the player's device: the key of a day ("YYYY-MM-DD", local time) for daily puzzles, and
// the count of days played in a row.

/** "YYYY-MM-DD" of the given moment in the device's local time. */
export function localDateKey(moment: Date): string {
  const y = moment.getFullYear();
  const m = String(moment.getMonth() + 1).padStart(2, '0');
  const d = String(moment.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
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
