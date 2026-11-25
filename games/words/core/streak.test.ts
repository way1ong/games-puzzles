import { describe, expect, it } from 'vitest';
import { streak } from '../../../shared/core/dates.ts';
import { streakWithGrace } from './streak.ts';

describe('the daily streak', () => {
  const days = ['2026-11-20', '2026-11-21', '2026-11-23', '2026-11-24'];

  it('without grace counts days in a row, like the other games', () => {
    expect(streakWithGrace(days, '2026-11-24', 0)).toBe(2);
    expect(streakWithGrace(days, '2026-11-24', 0)).toBe(streak(days, '2026-11-24'));
    expect(streakWithGrace(days, '2026-11-25', 0)).toBe(2); // today not played yet
    expect(streakWithGrace(days, '2026-11-26', 0)).toBe(0);
  });

  it('with one grace day a single missed day does not break it', () => {
    expect(streakWithGrace(days, '2026-11-24', 1)).toBe(4);
    expect(streakWithGrace(days, '2026-11-26', 1)).toBe(4); // yesterday missed, today not played yet
    expect(streakWithGrace(days, '2026-11-27', 1)).toBe(0); // two days missed
    expect(streakWithGrace(['2026-11-20', '2026-11-23'], '2026-11-23', 1)).toBe(1); // a gap of two days
  });

  it('is zero without any played day', () => {
    expect(streakWithGrace([], '2026-11-24', 1)).toBe(0);
  });
});
