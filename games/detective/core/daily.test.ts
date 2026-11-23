import { describe, expect, it } from 'vitest';
import { localDateKey } from '../../../shared/core/dates.ts';
import { DETECTIVE } from '../config.ts';
import { fairness } from './clues.ts';
import { ALL_DAILY_FRAMES, DAILY_FRAMES, dailyCase, dailyTime, searchCase } from './daily.ts';
import { traitsOf } from './people.ts';
import { placementProblems } from './placement.ts';
import { ROOM_IDS, SPOTS } from './rooms.ts';
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
      expect(DAILY_FRAMES[def.room], date).toContain(def.story);
    }
  });

  it('takes turns: a light day, a noir night', () => {
    DATES.slice(1).forEach((date, i) => expect(dailyTime(date)).not.toBe(dailyTime(DATES[i] as string)));
    expect(dailyCase('2026-11-23').time).toBe(dailyTime('2026-11-23'));
  });

  it('visits every room and uses every story frame over the days', () => {
    expect(new Set(DATES.map((date) => dailyCase(date).room)).size).toBe(ROOM_IDS.length);
    expect(new Set(DATES.map((date) => dailyCase(date).story)).size).toBe(ALL_DAILY_FRAMES.length);
  });

  it('meets every room both by day and at night, about equally often', () => {
    const count = new Map<string, number>();
    for (const date of DATES) {
      const def = dailyCase(date);
      count.set(`${def.room} ${def.time}`, (count.get(`${def.room} ${def.time}`) ?? 0) + 1);
    }
    const fair = DATES.length / (ROOM_IDS.length * 2);
    for (const room of ROOM_IDS) for (const time of ['day', 'night']) expect(count.get(`${room} ${time}`) ?? 0, `${room} ${time}`).toBeGreaterThan(fair * 0.6);
  });

  it('every room has frames of its own', () => {
    expect(new Set(ALL_DAILY_FRAMES).size).toBe(ALL_DAILY_FRAMES.length);
    for (const room of ROOM_IDS) expect(DAILY_FRAMES[room].length, room).toBeGreaterThanOrEqual(3);
  });
});

describe.each(ROOM_IDS)('free search in the room %s', (room) => {
  it('hides ordinary things only, on real places, differently for another seed', () => {
    const a = searchCase(room, 'day', 1);
    expect(a.kind).toBe('search');
    expect(a.room).toBe(room);
    expect(a.things.length).toBe(DETECTIVE.thingsPerScene);
    for (const p of a.things) expect(ORDINARY as readonly string[]).toContain(p.thing);
    expect(a.clues).toEqual([]);
    expect(a.suspects).toEqual([]);
    expect(placementProblems(a.things, SPOTS[room])).toEqual([]);
    expect(searchCase(room, 'day', 1)).toEqual(a);
    expect(searchCase(room, 'day', 2)).not.toEqual(a);
    expect(searchCase(room, 'night', 1).id).not.toBe(a.id);
  });

  it('finds places for the things with any seed', () => {
    for (let seed = 0; seed < 300; seed++) expect(placementProblems(searchCase(room, 'day', seed).things, SPOTS[room]), `seed ${seed}`).toEqual([]);
  });
});
