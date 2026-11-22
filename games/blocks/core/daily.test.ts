import { describe, expect, it } from 'vitest';
import { dailySeed, localDateKey, streak } from './daily.ts';
import { newGame } from './game.ts';

describe('daily puzzle', () => {
  it('gives everybody the same pieces on the same day, other pieces on another day', () => {
    const a = newGame('daily', dailySeed('2026-11-22'));
    const b = newGame('daily', dailySeed('2026-11-22'));
    const c = newGame('daily', dailySeed('2026-11-23'));
    expect(a.tray).toEqual(b.tray);
    expect(JSON.stringify(a.tray)).not.toBe(JSON.stringify(c.tray));
  });

  it('formats the local date', () => {
    expect(localDateKey(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
  });

  it('counts days in a row', () => {
    expect(streak(['2026-11-20', '2026-11-21', '2026-11-22'], '2026-11-22')).toBe(3);
    expect(streak(['2026-11-20', '2026-11-21'], '2026-11-22')).toBe(2); // today not played yet
    expect(streak(['2026-11-19', '2026-11-21', '2026-11-22'], '2026-11-22')).toBe(2);
    expect(streak([], '2026-11-22')).toBe(0);
  });
});
