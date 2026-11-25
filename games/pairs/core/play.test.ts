import { describe, expect, it } from 'vitest';
import { PAIRS } from '../config.ts';
import type { Pair } from './deal.ts';
import { makeDaily, makeLevel, stepOf } from './level.ts';
import { LAYOUTS, slotsOf } from './layouts.ts';
import { addTime, anyPair, countHint, hintFor, newPlay, shuffle, shufflesLeft, standing, tableFor, take, undo, type PairsPlay } from './play.ts';
import { solve } from './solve.ts';
import { freePlaces, isFree } from './table.ts';

/** Plays random legal pairs (from a seed) until the game cannot be won any more; null if it never gets stuck. */
function playIntoDeadEnd(play: PairsPlay, seed: number): PairsPlay | null {
  let state = play;
  let r = seed;
  for (let guard = 0; guard < 200 && !state.done; guard++) {
    const table = tableFor(state.layout);
    const free = freePlaces(table, state.present);
    const pairs: Pair[] = [];
    for (let i = 0; i < free.length; i++) for (let j = i + 1; j < free.length; j++) if (state.kinds[free[i]!] === state.kinds[free[j]!]) pairs.push([free[i]!, free[j]!]);
    if (!pairs.length) return state;
    r = (r * 1103515245 + 12345) >>> 0;
    state = take(state, ...pairs[r % pairs.length]!).play;
    if (solve(table, state.kinds, state.present) === null) return state;
  }
  return null;
}

describe('playing a layout', () => {
  const fresh = () => newPlay('pyramid', 1234, 1, null)!;

  it('takes two free tiles with the same picture off', () => {
    const play = fresh();
    const pair = anyPair(tableFor(play.layout), play)!;
    const { play: after, verdict } = take(play, ...pair);
    expect(verdict).toBe('taken');
    expect(after.present[pair[0]]).toBe(false);
    expect(after.present[pair[1]]).toBe(false);
    expect(after.history).toEqual([{ take: pair }]);
    expect(standing(after).left).toBe(standing(play).left - 2);
  });

  it('takes nothing for the same tile twice, a closed tile, or two different pictures', () => {
    const play = fresh();
    const table = tableFor(play.layout);
    const free = freePlaces(table, play.present);
    expect(take(play, free[0]!, free[0]!).verdict).toBe('same');
    const closed = play.present.findIndex((_, i) => !isFree(table, play.present, i));
    const twin = play.kinds.findIndex((k, i) => i !== closed && k === play.kinds[closed]);
    expect(take(play, closed, twin).verdict).toBe('blocked');
    const a = free[0]!;
    const b = free.find((i) => play.kinds[i] !== play.kinds[a])!;
    const { play: after, verdict } = take(play, a, b);
    expect(verdict).toBe('different');
    expect(after).toBe(play);
  });

  it('is done when the table is empty — playing the hints through', () => {
    let play = newPlay('cross', 77, 1, null)!;
    for (let guard = 0; guard < 50 && !play.done; guard++) {
      const hint = hintFor(play);
      expect(hint.kind).toBe('pair');
      if (hint.kind !== 'pair') break;
      play = take(play, ...hint.pair).play;
    }
    expect(play.done).toBe(true);
    expect(standing(play)).toEqual({ left: 0, pairs: 0 });
    expect(hintFor(play)).toEqual({ kind: 'done' });
  });

  it('takes steps back one by one, a shuffle too', () => {
    const play = fresh();
    const one = take(play, ...anyPair(tableFor(play.layout), play)!).play;
    const shuffled = shuffle(one);
    expect(shuffled.shuffles).toBe(1);
    const two = take(shuffled, ...anyPair(tableFor(play.layout), shuffled)!).play;
    const back1 = undo(two);
    expect(back1.present).toEqual(shuffled.present);
    const back2 = undo(back1);
    expect(back2.kinds).toEqual(one.kinds);
    const back3 = undo(back2);
    expect(back3.present).toEqual(play.present);
    expect(undo(back3)).toBe(back3);
    // the shuffle stays counted
    expect(back3.shuffles).toBe(1);
  });

  it('shuffles only as many times as the limit chosen; undo does not give a shuffle back', () => {
    const play = take(fresh(), ...anyPair(tableFor(fresh().layout), fresh())!).play;
    expect(PAIRS.shuffleLimits).toContain(null);
    expect(shufflesLeft(play, null)).toBeNull();
    // no limit: as many as wanted
    let free = play;
    for (let k = 0; k < 5; k++) free = shuffle(free, null);
    expect(free.shuffles).toBe(5);
    // a limit of one: the first works, the second does not
    expect(shufflesLeft(play, 1)).toBe(1);
    const once = shuffle(play, 1);
    expect(once.shuffles).toBe(1);
    expect(shufflesLeft(once, 1)).toBe(0);
    expect(shuffle(once, 1)).toBe(once);
    // taken back, it still counts
    const back = undo(once);
    expect(back.kinds).toEqual(play.kinds);
    expect(shufflesLeft(back, 1)).toBe(0);
    expect(shuffle(back, 1)).toBe(back);
    // none at all
    expect(shuffle(play, 0)).toBe(play);
    // a limit lowered below the shuffles made: none left, never fewer than none
    expect(shufflesLeft(free, 3)).toBe(0);
  });

  it('a shuffle keeps the pictures on the table, lays them anew, and the game can be won from there', () => {
    let play = fresh();
    for (let k = 0; k < 5; k++) play = take(play, ...anyPair(tableFor(play.layout), play)!).play;
    const after = shuffle(play);
    const onTable = (p: PairsPlay) =>
      p.kinds
        .filter((_, i) => p.present[i])
        .sort((a, b) => a - b)
        .join(',');
    expect(onTable(after)).toBe(onTable(play));
    expect(after.kinds).not.toEqual(play.kinds);
    expect(Array.isArray(solve(tableFor(after.layout), after.kinds, after.present))).toBe(true);
  });

  it('a hint names a pair that keeps the game winnable; stuck, it says how many steps back it can be won again', () => {
    const play = fresh();
    const hint = hintFor(play);
    expect(hint.kind).toBe('pair');
    if (hint.kind === 'pair') {
      const after = take(play, ...hint.pair).play;
      expect(Array.isArray(solve(tableFor(after.layout), after.kinds, after.present))).toBe(true);
    }
    // find a game played into a dead end
    let stuck: PairsPlay | null = null;
    for (let level = 1; level <= 40 && !stuck; level++) {
      for (let s = 1; s <= 10 && !stuck; s++) stuck = playIntoDeadEnd(makeLevel(level), s);
    }
    expect(stuck, 'a dead end reached by random pairs').not.toBeNull();
    const verdict = hintFor(stuck!);
    expect(verdict.kind).toBe('stuck');
    if (verdict.kind === 'stuck') {
      expect(verdict.back).toBeGreaterThanOrEqual(1);
      let back = stuck!;
      for (let k = 0; k < verdict.back!; k++) back = undo(back);
      expect(Array.isArray(solve(tableFor(back.layout), back.kinds, back.present))).toBe(true);
    }
    expect(countHint(play).hints).toBe(1);
  });

  it('counts time until done', () => {
    const play = addTime(fresh(), 1500);
    expect(play.ms).toBe(1500);
    expect(addTime({ ...play, done: true }, 1000).ms).toBe(1500);
    expect(addTime(play, -5).ms).toBe(1500);
  });
});

describe('levels and the layout of the day', () => {
  it('levels grow: each step takes layouts of its own, bigger than the step before', () => {
    const size = (n: number) => makeLevel(n).kinds.length;
    for (const [n, step] of [
      [1, 0],
      [3, 0],
      [4, 1],
      [10, 1],
      [11, 2],
      [30, 2],
      [31, 3],
      [500, 3],
    ] as const) {
      expect(stepOf(n)).toBe(PAIRS.levels[step]);
      expect(PAIRS.levels[step]!.layouts).toContain(makeLevel(n).layout);
    }
    expect(Math.max(...[1, 2, 3].map(size))).toBeLessThan(Math.min(...[31, 32, 33, 34, 35].map(size)));
  });

  it('the same level and the same day give the same game; other days other ones', () => {
    expect(makeLevel(17)).toEqual(makeLevel(17));
    expect(makeDaily('2026-11-25')).toEqual(makeDaily('2026-11-25'));
    const days = ['2026-11-25', '2026-11-26', '2026-11-27', '2026-11-28'].map((d) => makeDaily(d).kinds.join(','));
    expect(new Set(days).size).toBe(days.length);
    const daily = makeDaily('2026-11-25');
    expect(daily.daily).toBe('2026-11-25');
    expect(daily.number).toBeNull();
    expect(PAIRS.daily.layouts).toContain(daily.layout);
    expect(slotsOf(LAYOUTS[daily.layout]).length).toBe(daily.kinds.length);
  });

  it('levels use the layouts of their step in turns of their seeds: the first ten more than one, later every one', () => {
    const first = new Set(Array.from({ length: 10 }, (_, i) => makeLevel(i + 1).layout));
    expect(first.size).toBeGreaterThanOrEqual(3);
    const later = new Set(Array.from({ length: 30 }, (_, i) => makeLevel(31 + i).layout));
    expect(later.size).toBe(stepOf(31).layouts.length);
  });
});
