// The shelf: every column a finger can touch, the bottles as big as the room allows, balanced rows, room to lift.
import { describe, expect, it } from 'vitest';
import { BOTTLE_ASPECT, fitShelf, LEAST_COLUMN, LIFT } from './shelf-layout.ts';

const GAP = 8;
const fits = (count: number, w: number, h: number) => {
  const f = fitShelf(count, w, h, GAP, 72);
  const column = (w - GAP * (f.cols - 1)) / f.cols;
  return { f, column, height: f.rows * f.glassW * (BOTTLE_ASPECT + LIFT) + GAP * (f.rows - 1) };
};

describe('the shelf', () => {
  it('keeps every column at least a finger wide, and the rows within the room', () => {
    for (const count of [5, 7, 10, 13, 14]) {
      for (const [w, h] of [
        [328, 380],
        [358, 470],
        [288, 300],
        [600, 280],
        [900, 600],
      ] as const) {
        const { f, column, height } = fits(count, w, h);
        expect(f.cols * f.rows).toBeGreaterThanOrEqual(count);
        expect(column, `${count} in ${w}×${h}`).toBeGreaterThanOrEqual(LEAST_COLUMN);
        expect(height, `${count} in ${w}×${h}`).toBeLessThanOrEqual(h + 1);
      }
    }
  });
  it('balances the rows: no row with a lone bottle when they could be spread', () => {
    const f = fitShelf(13, 358, 470, GAP, 72);
    expect(f.cols * (f.rows - 1)).toBeLessThan(13);
    expect(f.cols * f.rows - 13).toBeLessThan(f.rows);
  });
  it('takes the biggest bottles the room allows: a wide low room — one row; a tall narrow one — more rows', () => {
    expect(fitShelf(7, 900, 360, GAP, 72).rows).toBe(1);
    expect(fitShelf(13, 330, 520, GAP, 72).rows).toBeGreaterThan(1);
    expect(fitShelf(5, 900, 600, GAP, 72).glassW).toBe(72);
  });
});
