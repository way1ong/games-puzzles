// The field's measures (docs/mines/SPEC.md, "Керування"): the easy field fits a phone held upright with comfortable
// cells; the bigger ones open zoomed in to them, the whole field one press away; a pinch keeps the place under the
// fingers; the keys bring a cell in sight; a touch finds its cell.
import { describe, expect, it } from 'vitest';
import { MINES } from '../config.ts';
import { cellAt, clampView, frameOf, measures, openView, panBy, showCell, zoomAround } from './zoom.ts';

const REM = 16;
/** The room for the field on a phone 360 px across, upright: the field as wide as the screen but the edges. */
const PHONE = { w: 352, h: 470 };

describe('the whole field', () => {
  it('the easy field fits a phone 360 px across with cells of 44 px, and cannot be zoomed', () => {
    const { width, height } = MINES.levels.easy;
    const f = frameOf(width, height, PHONE, REM);
    expect(f.limits.fit).toBeGreaterThanOrEqual(MINES.cell.comfortable);
    expect(f.limits.zoomable).toBe(false);
    expect(openView(f, false, null)).toEqual({ cell: f.limits.fit, x: 0, y: 0 });
  });

  it('the medium and the hard fields open zoomed in to the comfortable cell; whole on request', () => {
    for (const level of ['medium', 'hard'] as const) {
      const { width, height } = MINES.levels[level];
      const f = frameOf(width, height, PHONE, REM);
      expect(f.limits.zoomable, level).toBe(true);
      expect(openView(f, false, null).cell).toBe(MINES.cell.comfortable);
      const whole = openView(f, true, null);
      expect(whole).toEqual({ cell: f.limits.fit, x: 0, y: 0 });
      expect(width * whole.cell).toBeLessThanOrEqual(PHONE.w);
      expect(height * whole.cell).toBeLessThanOrEqual(PHONE.h);
    }
  });

  it('larger text makes the cells larger', () => {
    const f = frameOf(16, 16, PHONE, REM * 1.5);
    expect(f.limits.comfortable).toBe(Math.round(MINES.cell.comfortable * 1.5));
  });
});

describe('a zoomed field', () => {
  const f = frameOf(30, 16, PHONE, REM);

  it('does not move past its edges', () => {
    const v = clampView(f, { cell: 44, x: -50, y: 99999 });
    expect(v.x).toBe(0);
    expect(v.y).toBe(16 * 44 - measures(f, 44).gridH);
    expect(panBy(f, v, 99999, 0).x).toBe(30 * 44 - measures(f, 44).gridW);
  });

  it('a pinch keeps the place under the fingers', () => {
    const v = openView(f, false, null);
    const before = cellAt(f, v, 100, 100);
    const z = zoomAround(f, v, v.cell * 1.5, 100, 100);
    expect(z.cell).toBe(66);
    expect(cellAt(f, z, 100, 100)).toBe(before);
  });

  it('the keys bring a cell in sight; a touch finds its cell', () => {
    const v = openView(f, false, 0);
    const last = 30 * 16 - 1;
    const seen = showCell(f, v, last);
    const m = measures(f, seen.cell);
    expect(cellAt(f, seen, m.left + m.gridW - 1, m.top + m.gridH - 1)).toBe(last);
    expect(cellAt(f, seen, m.left - 1, 0)).toBeNull();
  });
});
