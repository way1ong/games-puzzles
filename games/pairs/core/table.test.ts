import { describe, expect, it } from 'vitest';
import { PAIRS } from '../config.ts';
import { LAYOUTS, isLayoutName, slotsOf, type LayerDef } from './layouts.ts';
import { freePlaces, isFree, pairsNow, tableOf } from './table.ts';

const tableFrom = (layers: LayerDef[]) => tableOf(slotsOf(layers));

describe('the layouts', () => {
  for (const [name, layers] of Object.entries(LAYOUTS)) {
    it(`${name}: fits the table, holds an even number of tiles, every upper tile rests on tiles below`, () => {
      const slots = slotsOf(layers);
      expect(slots.length % 2, 'even').toBe(0);
      expect(layers.length).toBeLessThanOrEqual(PAIRS.max.layers);
      const xs = slots.map((s) => s.x);
      const ys = slots.map((s) => s.y);
      expect(Math.max(...xs) + 2 - Math.min(...xs), 'across').toBeLessThanOrEqual(2 * PAIRS.max.columns);
      expect(Math.max(...ys) + 2 - Math.min(...ys), 'down').toBeLessThanOrEqual(2 * PAIRS.max.rows);
      for (const s of slots) {
        // no two tiles of one layer overlap
        expect(slots.filter((t) => t.z === s.z && Math.abs(t.x - s.x) < 2 && Math.abs(t.y - s.y) < 2)).toHaveLength(1);
        if (s.z === 0) continue;
        // each quarter of an upper tile lies over a tile of the layer right below
        for (const [qx, qy] of [
          [0, 0],
          [1, 0],
          [0, 1],
          [1, 1],
        ]) {
          const x = s.x + qx!;
          const y = s.y + qy!;
          expect(
            slots.some((t) => t.z === s.z - 1 && x >= t.x && x < t.x + 2 && y >= t.y && y < t.y + 2),
            `${name}: the tile at ${s.x},${s.y} on layer ${s.z} hangs in the air`,
          ).toBe(true);
        }
      }
    });
  }

  it('every layout the levels and the day name exists, and the steps grow', () => {
    for (const step of PAIRS.levels) for (const name of step.layouts) expect(isLayoutName(name), name).toBe(true);
    for (const name of PAIRS.daily.layouts) expect(isLayoutName(name), name).toBe(true);
    const sizes = PAIRS.levels.map((step) => Math.min(...step.layouts.map((n) => slotsOf(LAYOUTS[n as keyof typeof LAYOUTS]).length)));
    for (let i = 1; i < sizes.length; i++) expect(sizes[i]).toBeGreaterThan(sizes[i - 1]!);
    // the biggest layout still has a picture for every two pairs
    const most = Math.max(...Object.values(LAYOUTS).map((l) => slotsOf(l).length));
    expect(Math.ceil(most / PAIRS.copies)).toBeLessThanOrEqual(24);
  });
});

describe('free tiles', () => {
  it('a tile with tiles on both sides is closed; one open side is enough', () => {
    const table = tableFrom([{ dx: 0, dy: 0, rows: ['###'] }]);
    const present = [true, true, true];
    expect(freePlaces(table, present)).toEqual([0, 2]);
    expect(isFree(table, present, 1)).toBe(false);
    present[0] = false;
    expect(isFree(table, present, 1)).toBe(true);
  });

  it('a tile with a tile on it is closed — even when only a corner of the upper tile lies on it', () => {
    const table = tableFrom([
      { dx: 0, dy: 0, rows: ['##', '##'] },
      { dx: 1, dy: 1, rows: ['#'] },
    ]);
    const present = [true, true, true, true, true];
    expect(freePlaces(table, present)).toEqual([4]);
    present[4] = false;
    expect(freePlaces(table, present)).toEqual([0, 1, 2, 3]);
  });

  it('a tile right beside but half a tile lower or higher still closes the side; a whole tile away does not', () => {
    const table = tableFrom([
      { dx: 0, dy: 0, rows: ['#.#'] },
      // nothing on layer 1: two layers only to place tiles half a row lower
    ]);
    const lower = tableOf([
      { x: 0, y: 0, z: 0 },
      { x: 2, y: 1, z: 0 },
      { x: 4, y: 0, z: 0 },
    ]);
    // 0 and 2 are a whole tile apart: neither closes the other
    expect(freePlaces(table, [true, true])).toEqual([0, 1]);
    // the middle tile, half a row lower, has neighbours on both sides
    expect(isFree(lower, [true, true, true], 1)).toBe(false);
    expect(isFree(lower, [false, true, true], 1)).toBe(true);
  });

  it('a tile of another layer beside a tile does not close its side', () => {
    const table = tableOf([
      { x: 0, y: 0, z: 0 },
      { x: 2, y: 0, z: 1 },
      { x: 4, y: 0, z: 0 },
    ]);
    expect(isFree(table, [true, true, true], 0)).toBe(true);
  });

  it('counts the pairs that can be taken off now: every two free tiles of one picture', () => {
    const table = tableFrom([{ dx: 0, dy: 0, rows: ['#.#.#.#', '#.#.#.#'] }]);
    // eight free tiles: picture 1 three times, picture 2 four times, picture 3 once
    const kinds = [1, 1, 1, 2, 2, 2, 2, 3];
    expect(pairsNow(table, kinds, kinds.map(() => true))).toBe(3);
    expect(pairsNow(table, kinds, [false, ...kinds.slice(1).map(() => true)])).toBe(3);
    expect(pairsNow(table, kinds, [false, false, ...kinds.slice(2).map(() => true)])).toBe(2);
  });
});
