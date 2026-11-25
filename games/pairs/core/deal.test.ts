import { describe, expect, it } from 'vitest';
import { PAIRS } from '../config.ts';
import { dealOf, picturesFor, reshuffle, type Pair } from './deal.ts';
import { LAYOUTS, slotsOf } from './layouts.ts';
import { makeRand } from './rand.ts';
import { solve } from './solve.ts';
import { isFree, tableOf, type Table } from './table.ts';

/** Plays a way through: every pair free at its turn and showing one picture; the table ends empty. */
function wins(table: Table, kinds: readonly number[], present: readonly boolean[], way: readonly Pair[]): boolean {
  const now = [...present];
  for (const [a, b] of way) {
    if (!isFree(table, now, a) || !isFree(table, now, b) || kinds[a] !== kinds[b] || a === b) return false;
    now[a] = false;
    now[b] = false;
  }
  return now.every((p) => !p);
}

describe('deals', () => {
  for (const [name, layers] of Object.entries(LAYOUTS)) {
    it(`${name}: every seed tried gives a deal the way of which clears the table; each picture an even number of times, at most ${PAIRS.copies}`, () => {
      const table = tableOf(slotsOf(layers));
      for (let seed = 1; seed <= 30; seed++) {
        const deal = dealOf(table, seed * 7919);
        expect(deal, `${name}, seed ${seed}`).not.toBeNull();
        expect(wins(table, deal!.kinds, deal!.kinds.map(() => true), deal!.way)).toBe(true);
        const count = new Map<number, number>();
        for (const k of deal!.kinds) count.set(k, (count.get(k) ?? 0) + 1);
        for (const n of count.values()) {
          expect(n % 2).toBe(0);
          expect(n).toBeLessThanOrEqual(PAIRS.copies);
        }
        // as few pictures as possible: two pairs each, one may have only one
        expect(count.size).toBe(Math.ceil(deal!.way.length / (PAIRS.copies / 2)));
      }
    });
  }

  it('the same seed gives the same deal; other seeds give other pictures and other ways', () => {
    const table = tableOf(slotsOf(LAYOUTS.tower));
    expect(dealOf(table, 42)).toEqual(dealOf(table, 42));
    const kinds = new Set(Array.from({ length: 10 }, (_, i) => dealOf(table, i + 1)!.kinds.join(',')));
    expect(kinds.size).toBe(10);
  });

  it('chooses pictures for pairs: as few as possible, at most two pairs each', () => {
    const list = picturesFor(9, makeRand(5));
    expect(list).toHaveLength(9);
    const count = new Map<number, number>();
    for (const p of list) count.set(p, (count.get(p) ?? 0) + 1);
    expect(count.size).toBe(5);
    expect(Math.max(...count.values())).toBe(2);
  });

  it('a reshuffle keeps the pictures on the table, moves them, and the rest can be won', () => {
    const table = tableOf(slotsOf(LAYOUTS.pyramid));
    const deal = dealOf(table, 3)!;
    // take the first half of the way off
    const present = deal.kinds.map(() => true);
    for (const [a, b] of deal.way.slice(0, 8)) {
      present[a] = false;
      present[b] = false;
    }
    const kinds = reshuffle(table, deal.kinds, present, 99)!;
    const onTable = (ks: readonly number[]) =>
      ks
        .filter((_, i) => present[i])
        .sort((a, b) => a - b)
        .join(',');
    expect(onTable(kinds)).toBe(onTable(deal.kinds));
    expect(kinds.filter((_, i) => present[i])).not.toEqual(deal.kinds.filter((_, i) => present[i]));
    const way = solve(table, kinds, present);
    expect(Array.isArray(way) && wins(table, kinds, present, way)).toBe(true);
  });
});

describe('the solver', () => {
  it('finds a way to an empty table for dealt tables, the way being right', () => {
    for (const name of ['cross', 'pyramid', 'tower', 'mountain'] as const) {
      const table = tableOf(slotsOf(LAYOUTS[name]));
      for (let seed = 1; seed <= 5; seed++) {
        const deal = dealOf(table, seed)!;
        const present = deal.kinds.map(() => true);
        const way = solve(table, deal.kinds, present);
        expect(Array.isArray(way), `${name} ${seed}`).toBe(true);
        expect(wins(table, deal.kinds, present, way as Pair[])).toBe(true);
      }
    }
  });

  it('says when a table cannot be won: a pair lies one on the other', () => {
    // two stacks of two: the same picture on top of itself in each
    const table = tableOf([
      { x: 0, y: 0, z: 0 },
      { x: 4, y: 0, z: 0 },
      { x: 0, y: 0, z: 1 },
      { x: 4, y: 0, z: 1 },
    ]);
    expect(solve(table, [1, 2, 1, 2], [true, true, true, true])).toBeNull();
    // the same places with the two tops alike and the two bottoms alike: the tops first, then the bottoms
    expect(solve(table, [1, 1, 2, 2], [true, true, true, true])).toEqual([
      [2, 3],
      [0, 1],
    ]);
  });

  it('says it does not know when it runs out of steps', () => {
    const table = tableOf(slotsOf(LAYOUTS.mountain));
    const deal = dealOf(table, 11)!;
    expect(solve(table, deal.kinds, deal.kinds.map(() => true), 3)).toBe('unknown');
  });
});
