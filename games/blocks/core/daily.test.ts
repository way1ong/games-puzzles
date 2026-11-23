import { describe, expect, it } from 'vitest';
import { dailySeed } from './daily.ts';
import { newGame } from './game.ts';

describe('daily puzzle', () => {
  it('gives everybody the same pieces on the same day, other pieces on another day', () => {
    const a = newGame('daily', dailySeed('2026-11-22'));
    const b = newGame('daily', dailySeed('2026-11-22'));
    const c = newGame('daily', dailySeed('2026-11-23'));
    expect(a.tray).toEqual(b.tray);
    expect(JSON.stringify(a.tray)).not.toBe(JSON.stringify(c.tray));
  });
});
