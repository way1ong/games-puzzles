import { describe, expect, it } from 'vitest';
import { countHint, newPlay, place, type JigsawPlay } from './play.ts';
import { emptyStats, longestStreak, recordLeft, recordWon } from './stats.ts';

function finished(play: JigsawPlay, ms: number): JigsawPlay {
  let done = { ...play, ms };
  for (let p = 0; p < 24; p++) done = place(done, p)!;
  return done;
}

describe('statistics', () => {
  it('count a puzzle put together, without a hint, and the fastest time', () => {
    let stats = recordWon(emptyStats(), finished(newPlay('free', 'easy', 1, 0), 90_000));
    expect(stats.easy).toEqual({ played: 1, won: 1, clean: 1, bestMs: 90_000 });
    stats = recordWon(stats, finished(countHint(newPlay('free', 'easy', 2, 0)), 60_000));
    expect(stats.easy).toEqual({ played: 2, won: 2, clean: 1, bestMs: 60_000 });
    stats = recordWon(stats, finished(newPlay('free', 'easy', 3, 0), 120_000));
    expect(stats.easy.bestMs).toBe(60_000);
    expect(stats.medium).toEqual({ played: 0, won: 0, clean: 0, bestMs: null });
  });

  it('count a puzzle left for a new one as played only', () => {
    const stats = recordLeft(emptyStats(), place(newPlay('free', 'hard', 1, 0), 5)!);
    expect(stats.hard).toEqual({ played: 1, won: 0, clean: 0, bestMs: null });
  });

  it('leave the puzzle of the day to its days', () => {
    const day = newPlay('daily', 'medium', 1, 0, '2026-11-28');
    expect(recordWon(emptyStats(), day)).toEqual(emptyStats());
    expect(recordLeft(emptyStats(), day)).toEqual(emptyStats());
  });

  it('find the longest run of days', () => {
    expect(longestStreak([])).toBe(0);
    expect(longestStreak(['2026-11-27', '2026-11-28', '2026-11-30', '2026-12-01', '2026-12-02'])).toBe(3);
    expect(longestStreak(['2026-12-31', '2027-01-01'])).toBe(2);
  });
});
