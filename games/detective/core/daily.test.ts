import { describe, expect, it } from 'vitest';
import { localDateKey } from '../../../shared/core/dates.ts';
import { DETECTIVE } from '../config.ts';
import { fairness } from './clues.ts';
import { DAILY_FRAMES, dailyCase, dailyTime, searchCase } from './daily.ts';
import { traitsOf } from './people.ts';
import { placementProblems } from './placement.ts';
import { SPOTS } from './rooms.ts';
import { ORDINARY } from './things.ts';
import { isClue } from './traits.ts';

/** 400 days in a row from 1 November 2026. */
const DATES = Array.from({ length: 400 }, (_, i) => localDateKey(new Date(2026, 10, 1 + i, 12)));

describe('the daily case', () => {
  it('is the same for everybody on the same day and another on the next day', () => {
    expect(dailyCase('2026-11-23')).toEqual(dailyCase('2026-11-23'));
    expect(JSON.stringify(dailyCase('2026-11-23'))).not.toBe(JSON.stringify(dailyCase('2026-11-24')));
  });

  it('is a fair puzzle with things on real places, every day', () => {
    for (const date of DATES) {
      const def = dailyCase(date);
      expect(def.id).toBe(`daily:${date}`);
      expect(def.things.length, date).toBe(DETECTIVE.thingsPerScene);
      expect(def.things.map((p) => p.thing).filter(isClue).sort(), date).toEqual([...def.clues].sort());
      expect(def.suspects.length, date).toBe(DETECTIVE.suspectsPerCase);
      expect(fairness(def.suspects.map(traitsOf), def.clues), date).toEqual({ fit: [def.culprit], needless: [] });
      expect(placementProblems(def.things, SPOTS[def.room]), date).toEqual([]);
      expect(DAILY_FRAMES as readonly string[], date).toContain(def.story);
    }
  });

  it('takes turns: a light day, a noir night', () => {
    DATES.slice(1).forEach((date, i) => expect(dailyTime(date)).not.toBe(dailyTime(DATES[i] as string)));
    expect(dailyCase('2026-11-23').time).toBe(dailyTime('2026-11-23'));
  });

  it('uses every story frame over the days', () => {
    expect(new Set(DATES.map((date) => dailyCase(date).story)).size).toBe(DAILY_FRAMES.length);
  });
});

describe('free search', () => {
  it('hides ordinary things only, on real places, differently for another seed', () => {
    const a = searchCase('study', 'day', 1);
    expect(a.kind).toBe('search');
    expect(a.things.length).toBe(DETECTIVE.thingsPerScene);
    for (const p of a.things) expect(ORDINARY as readonly string[]).toContain(p.thing);
    expect(a.clues).toEqual([]);
    expect(a.suspects).toEqual([]);
    expect(placementProblems(a.things, SPOTS.study)).toEqual([]);
    expect(searchCase('study', 'day', 1)).toEqual(a);
    expect(searchCase('study', 'day', 2)).not.toEqual(a);
    expect(searchCase('study', 'night', 1).id).not.toBe(a.id);
  });
});
