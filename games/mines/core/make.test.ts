// The field and its maker: neighbours, numbers, mines laid away from the first place; every field made is solved from
// its first place by the reasoning of its level (so it never asks to guess); the same seed gives the same field; the
// player's first place is kept; the field of the day is the same for everybody on that day.
import { describe, expect, it } from 'vitest';
import { LEVELS, MINES } from '../config.ts';
import { layMines, mineMap, neighbourTable, numbers, pickStart, startArea } from './field.ts';
import { dailySeed, makeField } from './make.ts';
import { solveField } from './solve.ts';
import { finishTask } from './task.ts';

describe('the field', () => {
  it('neighbours: three in a corner, five along an edge, eight inside', () => {
    const table = neighbourTable({ width: 4, height: 3 });
    expect([...table[0]!]).toEqual([1, 4, 5]);
    expect(table[1]!.length).toBe(5);
    expect(table[5]!.length).toBe(8);
    expect([...table[11]!]).toEqual([6, 7, 10]);
  });

  it('mines laid from a seed: as many as asked, none in the first place or next to it; the same seed — the same', () => {
    const size = { width: 9, height: 9 };
    const a = layMines(size, 10, 40, 123).field;
    expect(a.mines.length).toBe(10);
    expect(new Set(a.mines).size).toBe(10);
    for (const cell of startArea(size, 40)) expect(a.mines).not.toContain(cell);
    expect(layMines(size, 10, 40, 123).field).toEqual(a);
    expect(layMines(size, 10, 40, 124).field).not.toEqual(a);
  });

  it('a number counts the mines around it', () => {
    const field = layMines({ width: 6, height: 5 }, 8, 14, 7).field;
    const mine = mineMap(field);
    const nums = numbers(field);
    const table = neighbourTable(field);
    for (let cell = 0; cell < 30; cell++) expect(nums[cell]).toBe([...table[cell]!].filter((o) => mine[o]).length);
  });

  it('the first place the game picks is away from the edges', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const { start } = pickStart({ width: 8, height: 8 }, seed);
      const row = Math.floor(start / 8);
      const column = start % 8;
      expect(row).toBeGreaterThan(0);
      expect(row).toBeLessThan(7);
      expect(column).toBeGreaterThan(0);
      expect(column).toBeLessThan(7);
    }
  });
});

describe('the maker of fields', () => {
  it('every field is solved from its first place by the reasoning of its level, never by guessing', () => {
    for (const level of LEVELS) {
      const rule = MINES.levels[level];
      for (let seed = 1; seed <= 12; seed++) {
        const field = finishTask(makeField(level, seed));
        expect(field.width).toBe(rule.width);
        expect(field.height).toBe(rule.height);
        expect(field.mines.length).toBe(rule.mines);
        for (const cell of startArea(field, field.start)) expect(field.mines).not.toContain(cell);
        expect(solveField(field, rule.logic).solved).toBe(true);
      }
    }
  });

  it('the same seed gives the same field; the player\'s first place is kept', () => {
    expect(finishTask(makeField('medium', 99))).toEqual(finishTask(makeField('medium', 99)));
    expect(finishTask(makeField('medium', 99))).not.toEqual(finishTask(makeField('medium', 100)));
    const corner = 0;
    const field = finishTask(makeField('easy', 5, corner));
    expect(field.start).toBe(corner);
    expect(solveField(field, 'single').solved).toBe(true);
  });

  it('the field of the day: the same for the same day and level, another for another day or level', () => {
    expect(dailySeed('2026-11-26', 'easy')).toBe(dailySeed('2026-11-26', 'easy'));
    expect(dailySeed('2026-11-26', 'easy')).not.toBe(dailySeed('2026-11-27', 'easy'));
    expect(dailySeed('2026-11-26', 'easy')).not.toBe(dailySeed('2026-11-26', 'hard'));
  });

  it('works in slices: a small slice returns nothing yet, the work goes on', () => {
    const task = makeField('hard', 3);
    let result = task.run(1);
    let slices = 1;
    while (result === undefined) {
      result = task.run(1);
      slices++;
    }
    expect(slices).toBeGreaterThan(1);
    expect(result).toEqual(finishTask(makeField('hard', 3)));
  });
});
