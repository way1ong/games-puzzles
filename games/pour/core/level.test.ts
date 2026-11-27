// Deals and the three ways (docs/pour/SPEC.md, "Три шляхи"): a deal is whole and the same from the same seed; levels
// grow in colours stage by stage and get harder within a stage; every deal is solved; the day is the same for all.
import { describe, expect, it } from 'vitest';
import { POUR } from '../config.ts';
import { isClosed, isWhole } from './bottles.ts';
import { deal } from './deal.ts';
import { winRate } from './difficulty.ts';
import { dailyDeal, freeDeal, levelDeal, pickDeal, stageOf } from './level.ts';
import { solve } from './solve.ts';

const CAP = POUR.capacity;

describe('a deal', () => {
  it('holds every colour whole, two empty bottles, no bottle closed at the start, its own paints', () => {
    let state = 1;
    for (let t = 0; t < 50; t++) {
      const d = deal(3 + (t % 9), POUR.empty, CAP, POUR.paints, state);
      state = d.state;
      const colours = 3 + (t % 9);
      expect(d.bottles).toHaveLength(colours + POUR.empty);
      expect(isWhole(d.bottles, colours, CAP)).toBe(true);
      expect(d.bottles.slice(colours).every((b) => b.length === 0)).toBe(true);
      expect(d.bottles.some((b) => isClosed(b, CAP))).toBe(false);
      expect(new Set(d.paints).size).toBe(colours);
      expect(d.paints.every((p) => p >= 0 && p < POUR.paints)).toBe(true);
    }
  });
  it('the same seed, the same deal; another seed, another', () => {
    expect(deal(8, 2, CAP, POUR.paints, 42)).toEqual(deal(8, 2, CAP, POUR.paints, 42));
    expect(deal(8, 2, CAP, POUR.paints, 42).bottles).not.toEqual(deal(8, 2, CAP, POUR.paints, 43).bottles);
  });
  it('no bottle closed at the start even where it is likely (two colours)', () => {
    let state = 9;
    for (let t = 0; t < 300; t++) {
      const d = deal(2, POUR.empty, CAP, POUR.paints, state);
      state = d.state;
      expect(d.bottles.some((b) => isClosed(b, CAP))).toBe(false);
    }
  });
  it('more colours than paints in the box, or fewer than two, cannot be dealt', () => {
    expect(() => deal(POUR.paints + 1, 2, CAP, POUR.paints, 1)).toThrow();
    expect(() => deal(1, 2, CAP, POUR.paints, 1)).toThrow();
  });
});

describe('levels in a row', () => {
  it('stages: colours from the table, the place within a stage from 0 to 1', () => {
    expect(stageOf(1)).toEqual({ colours: 3, place: 0 });
    expect(stageOf(2)).toEqual({ colours: 3, place: 1 });
    expect(stageOf(3).colours).toBe(4);
    const last = POUR.stages.at(-1)!;
    expect(stageOf(last.from).colours).toBe(last.colours);
    expect(stageOf(last.from + 1000).colours).toBe(last.colours);
    for (let level = 1; level < 80; level++) {
      const { place } = stageOf(level);
      expect(place).toBeGreaterThanOrEqual(0);
      expect(place).toBeLessThanOrEqual(1);
    }
    // never fewer colours later
    for (let level = 2; level < 80; level++) expect(stageOf(level).colours).toBeGreaterThanOrEqual(stageOf(level - 1).colours);
  });
  it('every level is dealt the same each time and the solver solves it', () => {
    for (const level of [1, 2, 7, 21, 45, 46]) {
      const d = levelDeal(level);
      expect(d).toEqual(levelDeal(level));
      expect(d.colours).toBe(stageOf(level).colours);
      expect(solve(d.bottles, CAP, POUR.solveLimit).moves).not.toBe(null);
    }
  });
  it('within a stage, a later place takes a harder deal (random players win less often)', () => {
    const rate = (place: number) => {
      const d = pickDeal(8, 77, place);
      return winRate(d.bottles, CAP, POUR.pick, d.seed);
    };
    expect(rate(0)).toBeGreaterThanOrEqual(rate(0.5));
    expect(rate(0.5)).toBeGreaterThanOrEqual(rate(1));
    expect(rate(0)).toBeGreaterThan(rate(1));
  });
});

describe('free play and the level of the day', () => {
  it('free play: the difficulty’s colours, solvable', () => {
    for (const [difficulty, colours] of Object.entries(POUR.difficulties)) {
      const d = freeDeal(difficulty as keyof typeof POUR.difficulties, 9);
      expect(d.colours).toBe(colours);
      expect(solve(d.bottles, CAP, POUR.solveLimit).moves).not.toBe(null);
    }
  });
  it('the day: the same for everybody on a date, another on the next one', () => {
    expect(dailyDeal('2026-11-27')).toEqual(dailyDeal('2026-11-27'));
    expect(dailyDeal('2026-11-27').bottles).not.toEqual(dailyDeal('2026-11-28').bottles);
    expect(dailyDeal('2026-11-27').colours).toBe(POUR.dailyColours);
  });
});
