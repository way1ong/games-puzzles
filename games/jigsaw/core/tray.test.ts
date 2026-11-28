import { describe, expect, it } from 'vitest';
import { kindOf } from './cut.ts';
import { trayOrder } from './tray.ts';

describe('the tray', () => {
  it('holds every piece once', () => {
    const order = trayOrder(9, 6, 5);
    expect([...order].sort((a, b) => a - b)).toEqual(Array.from({ length: 54 }, (_, i) => i));
  });

  it('puts the corner and border pieces first', () => {
    const order = trayOrder(9, 6, 5);
    const frame = 2 * 9 + 2 * 4;
    expect(order.slice(0, frame).every((p) => kindOf(9, 6, p) !== 'inner')).toBe(true);
    expect(order.slice(frame).every((p) => kindOf(9, 6, p) === 'inner')).toBe(true);
  });

  it('mixes each group from the seed: the same for the same seed, another for another', () => {
    const order = trayOrder(12, 8, 9);
    expect(trayOrder(12, 8, 9)).toEqual(order);
    expect(trayOrder(12, 8, 10)).not.toEqual(order);
    const inside = order.filter((p) => kindOf(12, 8, p) === 'inner');
    expect(inside).not.toEqual([...inside].sort((a, b) => a - b));
    const frame = order.filter((p) => kindOf(12, 8, p) !== 'inner');
    expect(frame).not.toEqual([...frame].sort((a, b) => a - b));
  });
});
