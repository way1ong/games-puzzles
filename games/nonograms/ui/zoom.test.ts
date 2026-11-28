// The board's measures (docs/nonograms/SPEC.md, "Великі поля на телефоні — наближення"): the whole grid with the
// largest cell that fits; a grid that fits only with cells under the comfortable size opens zoomed in to it, and the
// whole of it is one press away; a pinch keeps the place under the fingers; the keys bring a cell in sight.
import { describe, expect, it } from 'vitest';
import { NONOGRAMS } from '../config.ts';
import { NUMBER_W, cellAt, clampView, limits, measures, measuresOf, openView, panBy, rowWidthOf, showCell, zoomAround, type Counts, type Frame, type Room } from './zoom.ts';

const REM = 16;
const PHONE: Room = { w: 374, h: 470 };
const frame = (size: number, counts: Counts, room: Room, rem = REM): Frame => ({ size, counts, room, rem, limits: limits(size, counts, room, rem) });
/** The board's numbers and the grid it shows fit the room. */
const fitsRoom = (f: Frame, cell: number) => {
  const m = measures(f.size, f.counts, f.room, cell, f.rem);
  return f.size * cell + m.rowsW <= f.room.w && f.size * cell + m.colsH <= f.room.h;
};

describe('the numbers', () => {
  it('take the room of their digits: a row "2 1 3" narrower than "12 1"', () => {
    expect(rowWidthOf([])).toBe(NUMBER_W.one);
    expect(rowWidthOf([2, 1, 3])).toBeCloseTo(3 * NUMBER_W.one);
    expect(rowWidthOf([12, 1])).toBeCloseTo(NUMBER_W.two + NUMBER_W.one);
    expect(rowWidthOf([12, 1])).toBeLessThan(rowWidthOf([2, 1, 3]));
  });
});

describe('long numbers (a colour picture’s)', () => {
  it('shrink their font to leave the grid room, never under the least font; short ones and black-and-white keep theirs', () => {
    const long = { rows: 6.3, cols: 12 };
    const plain = measures(15, long, PHONE, NONOGRAMS.cell.comfortable, REM);
    const shrunk = measures(15, { ...long, shrink: true }, PHONE, NONOGRAMS.cell.comfortable, REM);
    expect(shrunk.font).toBeLessThan(plain.font);
    expect(shrunk.colsH).toBeLessThan(plain.colsH);
    expect(shrunk.gridH).toBeGreaterThan(plain.gridH);
    expect(shrunk.font).toBeGreaterThanOrEqual(0.8125 * REM); // the least font: a number stays readable
    const short = { rows: 2.1, cols: 2 };
    expect(measures(15, { ...short, shrink: true }, PHONE, NONOGRAMS.cell.comfortable, REM)).toEqual(measures(15, short, PHONE, NONOGRAMS.cell.comfortable, REM));
  });
});

describe('the whole grid', () => {
  it('takes the largest whole cell with which it and its numbers fit the room', () => {
    for (const [size, counts] of [
      [5, { rows: 2, cols: 2 }],
      [10, { rows: 4, cols: 3 }],
      [15, { rows: 5, cols: 6 }],
    ] as const) {
      const f = frame(size, counts, PHONE);
      expect(fitsRoom(f, f.limits.fit), `${size}`).toBe(true);
      if (f.limits.fit < f.limits.max) expect(fitsRoom(f, f.limits.fit + 1), `${size}`).toBe(false);
    }
  });

  it('opens zoomed in to the comfortable cell on a phone when it fits only with smaller cells; whole on request', () => {
    const f = frame(10, { rows: 4, cols: 3 }, PHONE);
    expect(f.limits.fit).toBeLessThan(NONOGRAMS.cell.comfortable);
    expect(f.limits.zoomable).toBe(true);
    expect(openView(f, false, null).cell).toBe(NONOGRAMS.cell.comfortable);
    expect(openView(f, true, null)).toEqual({ cell: f.limits.fit, x: 0, y: 0 });
    // zoomed in around the middle of the grid
    const v = openView(f, false, null);
    const m = measuresOf(f, v);
    expect(v.x).toBe(Math.round((10 * v.cell - m.gridW) / 2));
  });

  it('a grid that fits with comfortable cells is shown whole and cannot be zoomed; on a large screen up to the largest cell', () => {
    const small = frame(5, { rows: 2, cols: 2 }, PHONE);
    expect(small.limits.fit).toBeGreaterThanOrEqual(NONOGRAMS.cell.comfortable);
    expect(small.limits.zoomable).toBe(false);
    expect(small.limits.min).toBe(small.limits.max);
    expect(openView(small, false, null)).toEqual({ cell: small.limits.fit, x: 0, y: 0 });
    const desk = frame(5, { rows: 2, cols: 2 }, { w: 1200, h: 800 });
    expect(desk.limits.fit).toBe(NONOGRAMS.zoomMaxCell);
  });

  it('cells and numbers grow with the player’s text size', () => {
    const big = frame(10, { rows: 4, cols: 3 }, PHONE, REM * 1.15);
    expect(big.limits.comfortable).toBe(Math.round(NONOGRAMS.cell.comfortable * 1.15));
    // small cells: the numbers keep the least size of the player's text
    expect(measures(15, { rows: 5, cols: 6 }, PHONE, 20, REM * 1.15).font).toBeGreaterThan(measures(15, { rows: 5, cols: 6 }, PHONE, 20, REM).font);
  });
});

describe('a zoomed grid', () => {
  const f = frame(15, { rows: 5, cols: 6 }, PHONE);

  it('is never moved past its edges', () => {
    const v = clampView(f, { cell: 44, x: -50, y: 99999 });
    const m = measuresOf(f, v);
    expect(v.x).toBe(0);
    expect(v.y).toBe(15 * 44 - m.gridH);
    expect(panBy(f, v, 99999, 0).x).toBe(15 * 44 - m.gridW);
    expect(clampView(f, { cell: 5, x: 0, y: 0 }).cell).toBe(f.limits.min);
    expect(clampView(f, { cell: 500, x: 0, y: 0 }).cell).toBe(f.limits.max);
  });

  it('keeps the grid’s point under the fingers while zooming', () => {
    const v = openView(f, false, null);
    const m = measuresOf(f, v);
    const px = m.left + m.rowsW + 100;
    const py = m.top + m.colsH + 120;
    const under = cellAt(f, v, px, py);
    const z = zoomAround(f, v, 60, px, py);
    expect(z.cell).toBe(60);
    expect(cellAt(f, z, px, py)).toBe(under);
    // the point stays within a pixel
    const mz = measuresOf(f, z);
    const before = (px - m.left - m.rowsW + v.x) / v.cell;
    const after = (px - mz.left - mz.rowsW + z.x) / z.cell;
    expect(Math.abs(before - after) * z.cell).toBeLessThan(1);
  });

  it('brings a cell in sight with the least move, and finds the cell under a point', () => {
    const v = openView(f, false, 0);
    expect(v).toMatchObject({ x: 0, y: 0 });
    expect(showCell(f, v, 0)).toEqual(v);
    const m = measuresOf(f, v);
    const right = showCell(f, v, 14); // the last cell of the top row
    expect(right.x + m.gridW).toBe(15 * v.cell);
    expect(right.y).toBe(0);
    expect(cellAt(f, v, m.left + m.rowsW + v.cell * 1.5, m.top + m.colsH + v.cell * 2.5)).toBe(2 * 15 + 1);
    expect(cellAt(f, v, m.left + 1, m.top + 1)).toBeNull();
    expect(cellAt(f, v, m.left + 1, m.top + m.colsH + 1, true)).toBe(0);
  });
});
