// Where the cards lie (docs/solitaire/SPEC.md, "Екрани й керування"): a finger takes the cards of a column from any
// face-up card, so a face-up card under another shows a strip of at least 24 px while the column fits; a longer
// column lies closer, the face-down cards first, and every column stays inside the table.
import { describe, expect, it } from 'vitest';
import { deal, type Klondike } from '../core/klondike.ts';
import { columnSteps, layTable, type TableLayout } from './layout.ts';

/** The WCAG 2.2 AA minimum size of a target, CSS px (SPEC). */
const MIN_STRIP = 24;
/** Positions are sums of fractions of a pixel: a step of 24 px may come out a hair under. */
const EPS = 1e-6;

/** A deal whose last column holds `up` face-up cards over its face-down ones (the extra cards come from the stock). */
function withLongColumn(up: number): Klondike {
  const g = deal(1, 1);
  const columns = g.columns.map((c) => [...c]);
  const talon = [...g.talon];
  const last = columns.length - 1;
  while (columns[last]!.length < g.down[last]! + up) columns[last]!.push(talon.pop()!);
  return { ...g, columns, talon };
}

/** The steps between neighbouring face-up cards of a column, and where its last card ends, px. */
function measure(layout: TableLayout, g: Klondike, column: number): { steps: number[]; bottom: number } {
  const col = g.columns[column]!;
  const steps: number[] = [];
  for (let k = g.down[column]!; k + 1 < col.length; k++) steps.push(layout.cards.get(col[k + 1]!)!.y - layout.cards.get(col[k]!)!.y);
  return { steps, bottom: layout.cards.get(col.at(-1)!)!.y + layout.h };
}

describe('columnSteps', () => {
  it('keeps face-up cards at least 24 px apart on small cards while the column fits', () => {
    expect(columnSteps(6, 9, 55, 1000).up).toBeGreaterThanOrEqual(MIN_STRIP);
  });

  it('keeps the share of the card when that is more than 24 px', () => {
    const small = columnSteps(6, 9, 55, 1000).up;
    const large = columnSteps(6, 9, 135, 1000).up;
    expect(large).toBeGreaterThan(MIN_STRIP);
    expect(large).toBeGreaterThan(small);
  });

  it('lays the face-down cards closer first: a column that then fits keeps its 24 px strips', () => {
    const h = 55;
    const roomy = columnSteps(6, 9, h, 1000);
    const space = h + 6 * roomy.down + 8 * roomy.up - 1;
    const s = columnSteps(6, 9, h, space);
    expect(s.down).toBeLessThan(roomy.down);
    expect(s.up).toBe(roomy.up);
  });

  it('lays a column too long for its space closer, so that it fits exactly', () => {
    const h = 55;
    const space = 260;
    const s = columnSteps(6, 13, h, space);
    expect(h + 6 * s.down + 12 * s.up).toBeCloseTo(space, 6);
    expect(s.up).toBeLessThan(MIN_STRIP);
  });
});

describe('layTable', () => {
  const last = 6;

  it('keeps every column inside the table; a strip under 24 px only in a column that reaches the bottom', () => {
    for (let height = 260; height <= 700; height += 20) {
      for (let width = 300; width <= 500; width += 25) {
        for (const up of [1, 4, 9, 13]) {
          const g = withLongColumn(up);
          const room = { width, height };
          const layout = layTable(g, room, false);
          const { steps, bottom } = measure(layout, g, last);
          expect(bottom).toBeLessThanOrEqual(height + EPS);
          if (steps.some((s) => s < MIN_STRIP - EPS)) expect(bottom).toBeCloseTo(height, 6);
        }
      }
    }
  });

  it('keeps 24 px strips in a column from a king down to a five on the smallest phones held upright', () => {
    // the room the table gets (the stage, CSS px), measured on 320 × 640 and 360 × 640
    for (const room of [
      { width: 304, height: 326 },
      { width: 344, height: 345 },
    ]) {
      const g = withLongColumn(9);
      const { steps } = measure(layTable(g, room, false), g, last);
      expect(Math.min(...steps)).toBeGreaterThanOrEqual(MIN_STRIP - EPS);
    }
  });
});
