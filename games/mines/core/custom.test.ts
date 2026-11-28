// The player's own size (docs/mines/SPEC.md, "Свій розмір"): sizes are kept within the bounds of the config and the
// mines follow the size; a saved size outside them is not taken; the rule of a field of every kind; a field of the
// player's size is made without guessing — at the extremes of the bounds too; a game of it carries its size.
import { describe, expect, it } from 'vitest';
import { KINDS, LEVELS, MINES } from '../config.ts';
import { fitSize, minesRange, ruleOf, validSize } from './custom.ts';
import { startArea } from './field.ts';
import { makeField } from './make.ts';
import { newPlay } from './play.ts';
import { solveField } from './solve.ts';
import { emptyStats, recordPlayed } from './stats.ts';
import { finishTask } from './task.ts';

const b = MINES.custom;

describe('the player\'s own size', () => {
  it('keeps each side within its bounds', () => {
    expect(fitSize({ width: 1, height: 99, mines: 5 })).toMatchObject({ width: b.width.least, height: b.height.most });
    expect(fitSize({ width: 12.4, height: 7.6, mines: 9 })).toMatchObject({ width: 12, height: 8 });
  });

  it('keeps the mines between one and the share of the cells the config allows', () => {
    const range = minesRange(10, 10);
    expect(range.least).toBe(b.mines.least);
    expect(range.most).toBe(Math.floor(100 * b.mines.share));
    expect(fitSize({ width: 10, height: 10, mines: 999 }).mines).toBe(range.most);
    expect(fitSize({ width: 10, height: 10, mines: 0 }).mines).toBe(range.least);
  });

  it('leaves the first place and its neighbours free of mines on the smallest field too', () => {
    const { most } = minesRange(b.width.least, b.height.least);
    expect(most).toBeLessThanOrEqual(b.width.least * b.height.least - 9);
    expect(most).toBeGreaterThanOrEqual(b.mines.least);
  });

  it('lets the mines follow a smaller size', () => {
    const big = fitSize({ width: 20, height: 20, mines: 80 });
    const smaller = fitSize({ ...big, width: 8, height: 8 });
    expect(smaller.mines).toBe(minesRange(8, 8).most);
  });

  it('takes a saved size only when it is within the bounds', () => {
    expect(validSize({ width: 10, height: 10, mines: 15 })).toBe(true);
    expect(validSize({ width: 10, height: 10, mines: 99 })).toBe(false);
    expect(validSize({ width: 4, height: 10, mines: 5 })).toBe(false);
    expect(validSize({ width: 10, height: 10 })).toBe(false);
    expect(validSize(null)).toBe(false);
    expect(validSize({ width: '10', height: 10, mines: 15 })).toBe(false);
  });

  it('gives the rule of every kind: a level\'s own, the player\'s size with any reasoning', () => {
    for (const level of LEVELS) expect(ruleOf(level, null)).toEqual(MINES.levels[level]);
    expect(ruleOf('custom', { width: 12, height: 9, mines: 20 })).toEqual({ width: 12, height: 9, mines: 20, logic: b.logic });
    expect(ruleOf('custom', null)).toEqual({ ...b.first, logic: b.logic });
  });
});

describe('a field of the player\'s size', () => {
  it('is made without guessing — the smallest, a narrow tall one and the largest, with the most mines', () => {
    const sizes = [
      { width: b.width.least, height: b.height.least },
      { width: b.width.least, height: b.height.most },
      { width: b.width.most, height: b.height.most },
    ];
    for (const s of sizes) {
      const rule = ruleOf('custom', { ...s, mines: minesRange(s.width, s.height).most });
      for (let seed = 1; seed <= 3; seed++) {
        const field = finishTask(makeField(rule, seed));
        expect(field.width).toBe(rule.width);
        expect(field.height).toBe(rule.height);
        expect(field.mines.length).toBe(rule.mines);
        for (const cell of startArea(field, field.start)) expect(field.mines).not.toContain(cell);
        expect(solveField(field, rule.logic).solved).toBe(true);
      }
    }
  });

  it('makes a game that carries its size; a level\'s game carries none', () => {
    const play = newPlay('custom', 5, 'player', null, null, { width: 12, height: 9, mines: 20 });
    expect(play.size).toEqual({ width: 12, height: 9, mines: 20 });
    expect(play.cells.length).toBe(12 * 9);
    // a size beyond the bounds is brought within them
    expect(newPlay('custom', 5, 'player', null, null, { width: 99, height: 9, mines: 999 }).size).toEqual(fitSize({ width: 99, height: 9, mines: 999 }));
    expect(newPlay('easy', 5, 'player', null).size).toBeNull();
  });

  it('has a row of its own in the statistics', () => {
    expect(Object.keys(emptyStats())).toEqual([...KINDS]);
    expect(recordPlayed(emptyStats(), 'custom').custom.played).toBe(1);
  });
});
