import { describe, expect, it } from 'vitest';
import { makeDaily, makeLevel } from './level.ts';
import { emptyStats, isClean, longestStreak, recordDone } from './stats.ts';

describe('statistics', () => {
  it('counts levels and layouts of the day apart, and the clean ones', () => {
    const level = { ...makeLevel(1), done: true };
    const daily = { ...makeDaily('2026-11-25'), done: true };
    let stats = recordDone(emptyStats(), level);
    stats = recordDone(stats, { ...level, hints: 2 });
    stats = recordDone(stats, daily);
    stats = recordDone(stats, { ...daily, shuffles: 1 });
    expect(stats).toEqual({ levels: 2, levelsClean: 1, days: 2, daysClean: 1 });
    expect(isClean(level)).toBe(true);
    expect(isClean({ ...level, shuffles: 1 })).toBe(false);
  });

  it('finds the longest run of days, across months and years, whatever the order and repeats', () => {
    expect(longestStreak([])).toBe(0);
    expect(longestStreak(['2026-11-25'])).toBe(1);
    expect(longestStreak(['2026-11-25', '2026-11-27'])).toBe(1);
    expect(longestStreak(['2026-12-31', '2027-01-01', '2026-12-30', '2026-12-30', '2027-01-03'])).toBe(3);
    expect(longestStreak(['2026-02-27', '2026-02-28', '2026-03-01', 'not a date'])).toBe(3);
    expect(longestStreak(['2028-02-28', '2028-02-29', '2028-03-01'])).toBe(3);
  });
});
