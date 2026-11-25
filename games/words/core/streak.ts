// The streak of daily puzzles: days in a row that ended today (or yesterday). With grace days, a gap of that
// many missed days between two played days does not break it (docs/words/SPEC.md, "Рівні"); the missed days
// themselves do not count. Pure, no DOM.
import { localDateKey } from '../../../shared/core/dates.ts';

export function streakWithGrace(playedDates: readonly string[], todayKey: string, graceDays: number): number {
  const played = new Set(playedDates);
  const day = new Date(`${todayKey}T12:00:00`);
  const back = () => day.setDate(day.getDate() - 1);
  // Today not played yet: the streak may still end yesterday (or, with grace, a little earlier).
  let gap = 0;
  while (!played.has(localDateKey(day))) {
    if (gap > graceDays) return 0;
    gap++;
    back();
  }
  let count = 0;
  for (;;) {
    count++;
    back();
    let missed = 0;
    while (!played.has(localDateKey(day)) && missed <= graceDays) {
      missed++;
      back();
    }
    if (missed > graceDays) return count;
  }
}
