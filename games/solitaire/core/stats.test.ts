import { expect, it } from 'vitest';
import { deal, drawCards } from './klondike.ts';
import { emptyStats, longestStreak, recordLeft, recordWon } from './stats.ts';

it('counts deals played and won for each way of turning the stock, the clean ones and the best time', () => {
  const won = { ...deal(1, 1), done: true, ms: 90_000 };
  let stats = recordWon(emptyStats(), won);
  stats = recordWon(stats, { ...won, hints: 2, ms: 60_000 });
  stats = recordLeft(stats, drawCards(deal(2, 3)));
  stats = recordLeft(stats, deal(3, 3)); // no move made: not played
  expect(stats[1]).toEqual({ played: 2, won: 2, clean: 1, bestMs: 60_000 });
  expect(stats[3]).toEqual({ played: 1, won: 0, clean: 0, bestMs: null });
});

it('finds the longest run of days, across months and years, whatever the order and repeats', () => {
  expect(longestStreak([])).toBe(0);
  expect(longestStreak(['2026-11-25', '2026-11-27'])).toBe(1);
  expect(longestStreak(['2026-12-31', '2027-01-01', '2026-12-30', '2026-12-30', '2027-01-03'])).toBe(3);
  expect(longestStreak(['2028-02-28', '2028-02-29', '2028-03-01', 'not a date'])).toBe(3);
});
