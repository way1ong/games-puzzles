// The course of a game: pours, the end, "Undo", "One more bottle", "Start again", the help a level allows, hints that
// lead to the end without circles, a dead end and how far back there is a way, a saved game's check, statistics.
import { describe, expect, it } from 'vitest';
import { POUR } from '../config.ts';
import { isSolved, legalMoves, pour, type Bottles } from './bottles.ts';
import { findHint, hasWay, nextOnWay, stepsBack, wayFrom } from './hint.ts';
import { freeDeal, type Deal } from './level.ts';
import { addBottle, addTime, clean, countHint, helpLeft, hintAllowed, newPlay, perfect, pourIn, startAgain, started, undo, validPlay, type PourPlay } from './play.ts';
import { placeKey, solve } from './solve.ts';
import { emptyStats, longestStreak, recordLeft, recordWon } from './stats.ts';

const { free, some, none } = POUR.helps;
const dealOf = (bottles: Bottles, colours: number): Deal => ({ bottles, colours, paints: Array.from({ length: colours }, (_, i) => i), seed: 1 });
// a small real puzzle: two colours, two empty bottles
const small = dealOf(
  [
    [0, 1, 0, 1],
    [1, 0, 1, 0],
    [],
    [],
  ],
  2,
);

describe('pours and the end', () => {
  it('a pour changes the bottles, counts, can be taken back; a wrong one is refused', () => {
    const p0 = newPlay(small, 'free', { difficulty: 'easy' });
    expect(pourIn(p0, { from: 2, to: 0 })).toBe(null);
    const p1 = pourIn(p0, { from: 0, to: 2 })!;
    expect(p1.bottles).toEqual([[0, 1, 0], [1, 0, 1, 0], [1], []]);
    expect(p1.moves).toBe(1);
    expect(p1.history).toEqual([{ from: 0, to: 2, amount: 1 }]);
    expect(started(p1)).toBe(true);
    const back = undo(p1, free)!;
    expect(back.bottles).toEqual(small.bottles);
    expect(back.undos).toBe(1);
    expect(back.moves).toBe(1);
  });
  it('ends when every bottle is empty or full of one colour; nothing more is poured then', () => {
    let p = newPlay(small, 'free', { difficulty: 'easy' });
    for (const m of solve(p.bottles, POUR.capacity, 1000).moves!) p = pourIn(p, m)!;
    expect(p.done).toBe(true);
    expect(isSolved(p.bottles, POUR.capacity)).toBe(true);
    expect(pourIn(p, legalMoves(p.bottles, POUR.capacity)[0] ?? { from: 0, to: 1 })).toBe(null);
    expect(undo(p, free)).toBe(null);
  });
});

describe('help', () => {
  it('without limits: any number of undos and hints, one more bottle once', () => {
    let p = newPlay(small, 'free', { difficulty: 'easy' });
    for (let i = 0; i < 5; i++) {
      p = pourIn(p, { from: 0, to: 2 }) ?? pourIn(p, { from: 2, to: 0 })!;
      p = undo(p, free)!;
    }
    expect(p.undos).toBe(5);
    expect(helpLeft(p, free)).toEqual({ undo: null, hints: null, extra: 1 });
    const q = addBottle(p, free)!;
    expect(q.bottles).toHaveLength(5);
    expect(q.start).toHaveLength(5);
    expect(addBottle(q, free)).toBe(null);
  });
  it('limited: so many undos and hints, no bottle; none: no help at all', () => {
    let p = newPlay(small, 'free', { difficulty: 'easy' });
    for (let i = 0; i < some.undo!; i++) p = undo(pourIn(p, { from: 0, to: 2 })!, some)!;
    expect(undo(pourIn(p, { from: 0, to: 2 })!, some)).toBe(null);
    expect(helpLeft(p, some).undo).toBe(0);
    expect(addBottle(p, some)).toBe(null);
    expect(hintAllowed(p, some)).toBe(true);
    expect(hintAllowed(countHint(p), some)).toBe(false);
    const n = pourIn(newPlay(small, 'free', { difficulty: 'easy' }), { from: 0, to: 2 })!;
    expect(undo(n, none)).toBe(null);
    expect(hintAllowed(n, none)).toBe(false);
    expect(addBottle(n, none)).toBe(null);
  });
  it('taking back several pours at once counts each', () => {
    let p = newPlay(small, 'free', { difficulty: 'easy' });
    p = pourIn(p, { from: 0, to: 2 })!;
    p = pourIn(p, { from: 1, to: 3 })!;
    expect(undo(p, some, 2)!.bottles).toEqual(small.bottles);
    expect(undo(p, some, 2)!.undos).toBe(2);
    expect(undo(p, { undo: 1, hints: 0, extra: 0 }, 2)).toBe(null);
    expect(undo(p, free, 3)).toBe(null);
  });
  it('"Start again": the same deal with the bottle added, not counted as help', () => {
    let p = newPlay(small, 'free', { difficulty: 'easy' });
    expect(startAgain(p)).toBe(null);
    p = addBottle(pourIn(p, { from: 0, to: 2 })!, free)!;
    const again = startAgain(p)!;
    expect(again.bottles).toEqual([...small.bottles, []]);
    expect(again.history).toEqual([]);
    expect(again.moves).toBe(0);
    expect(again.restarts).toBe(1);
    expect(again.undos).toBe(0);
  });
  it('clean: without undo, hint or bottle', () => {
    const p = pourIn(newPlay(small, 'free', { difficulty: 'easy' }), { from: 0, to: 2 })!;
    expect(clean(p)).toBe(true);
    expect(clean(countHint(p))).toBe(false);
    expect(clean(undo(p, free)!)).toBe(false);
    expect(clean(addBottle(p, free)!)).toBe(false);
    expect(addTime(p, 500).ms).toBe(500);
  });

  it('in the fewest pours: done without help in just as many pours as counted; a bottle added — counted anew', () => {
    const p = newPlay(small, 'free', { difficulty: 'easy' });
    const won: PourPlay = { ...p, done: true, moves: 6, fewest: 6 };
    expect(perfect(won)).toBe(true);
    expect(perfect({ ...won, moves: 7 })).toBe(false);
    expect(perfect({ ...won, done: false })).toBe(false);
    expect(perfect(countHint(won))).toBe(false);
    expect(perfect({ ...won, fewest: null })).toBe(false);
    expect(perfect({ ...won, fewest: undefined })).toBe(false);
    expect(addBottle({ ...p, fewest: 6 }, free)!.fewest).toBeUndefined();
  });
});

describe('hints and dead ends', () => {
  it('following only the hints reaches the end, never at a position twice (several deals and sizes)', () => {
    for (const [difficulty, seed] of [
      ['easy', 3],
      ['medium', 4],
      ['hard', 5],
      ['hard', 6],
    ] as const) {
      let p = newPlay(freeDeal(difficulty, seed), 'free', { difficulty });
      let way = null;
      const seen = new Set<string>();
      for (let i = 0; i < 200 && !p.done; i++) {
        expect(seen.has(placeKey(p.bottles))).toBe(false);
        seen.add(placeKey(p.bottles));
        const h = findHint(p, way);
        expect(h.kind).toBe('move');
        if (h.kind !== 'move') break;
        way = h.way;
        p = pourIn(p, h.move)!;
      }
      expect(p.done).toBe(true);
    }
  });
  it('the kept way is followed while the player is on it, and found anew when they leave it', () => {
    const p = newPlay(freeDeal('medium', 8), 'free', { difficulty: 'medium' });
    const h = findHint(p, null);
    if (h.kind !== 'move') throw new Error('no hint');
    const after = pourIn(p, h.move)!;
    expect(nextOnWay(h.way, after.bottles)).toEqual(h.way.moves[1]);
    // off the way: another pour
    const other = legalMoves(p.bottles, POUR.capacity).find((m) => placeKey(pour(p.bottles, m, POUR.capacity)) !== placeKey(after.bottles))!;
    const off = pourIn(p, other)!;
    expect(nextOnWay(h.way, off.bottles)).toBe(null);
  });
  it('a dead end: no way, and how many pours back there is one', () => {
    // a position after a few pours still has its way
    const p0 = newPlay(small, 'free', { difficulty: 'easy' });
    const p1 = pourIn(p0, { from: 0, to: 2 })!; // [0,1,0] [1,0,1,0] [1] []
    const p2 = pourIn(p1, { from: 1, to: 3 })!; // [0,1,0] [1,0,1] [1] [0]
    const p3 = pourIn(p2, { from: 1, to: 2 })!; // [0,1,0] [1,0] [1,1] [0]
    const p4 = pourIn(p3, { from: 1, to: 3 })!; // [0,1,0] [1] [1,1] [0,0]
    expect(hasWay(p4.bottles)).toBe(true);
    // a dead end: every bottle full, nothing can be poured
    const stuck: Bottles = [
      [0, 1, 0, 1],
      [1, 0, 1, 0],
      [2, 2, 1, 0],
      [0, 2, 1, 2],
    ];
    expect(hasWay(stuck)).toBe(false);
    const deadPlay: PourPlay = { ...newPlay(dealOf(stuck, 3), 'free', { difficulty: 'easy' }) };
    expect(findHint(deadPlay, null)).toEqual({ kind: 'stuck', back: null });
  });
  it('after pours that lead nowhere, "back" names the pours to take back to a way', () => {
    // a deal, then pours chosen to fill the empty bottles with different colours
    let found = false;
    for (let seed = 1; seed < 40 && !found; seed++) {
      let p = newPlay(freeDeal('easy', seed), 'free', { difficulty: 'easy' });
      for (let i = 0; i < 12 && hasWay(p.bottles) !== false; i++) {
        const into = legalMoves(p.bottles, POUR.capacity).find((m) => p.bottles[m.to]!.length === 0) ?? legalMoves(p.bottles, POUR.capacity)[0];
        if (!into) break;
        p = pourIn(p, into)!;
      }
      if (hasWay(p.bottles) !== false) continue;
      found = true;
      const back = stepsBack(p)!;
      expect(back).toBeGreaterThan(0);
      const h = findHint(p, null);
      expect(h).toEqual({ kind: 'stuck', back });
      const u = undo(p, free, back)!;
      expect(hasWay(u.bottles)).toBe(true);
      if (back > 1) expect(hasWay(undo(p, free, back - 1)!.bottles)).toBe(false);
    }
    expect(found).toBe(true);
  });
  it('a way from a position: its keys are the positions before each pour', () => {
    const moves = solve(small.bottles, POUR.capacity, 1000).moves!;
    const way = wayFrom(small.bottles, moves);
    expect(way.keys[0]).toBe(placeKey(small.bottles));
    expect(way.keys).toHaveLength(moves.length);
  });
});

describe('a saved game and statistics', () => {
  it('a saved game is whole only when its pours lead from the start to the bottles', () => {
    let p = newPlay(freeDeal('easy', 2), 'free', { difficulty: 'easy' });
    const h = findHint(p, null);
    if (h.kind === 'move') p = pourIn(p, h.move)!;
    expect(validPlay(p)).toBe(true);
    expect(validPlay({ ...p, bottles: p.start })).toBe(false);
    expect(validPlay({ ...p, history: [{ from: 0, to: 99, amount: 1 }] })).toBe(false);
    expect(validPlay({ ...p, paints: [] })).toBe(false);
    expect(validPlay({ ...p, bottles: p.bottles.map((b, i) => (i === 0 ? [...b, 0] : b)) })).toBe(false);
    // the fewest pours: counted, not counted within the limit, not yet — whole; anything else — not
    expect(validPlay({ ...p, fewest: 12 })).toBe(true);
    expect(validPlay({ ...p, fewest: null })).toBe(true);
    expect(validPlay({ ...p, fewest: undefined })).toBe(true);
    expect(validPlay({ ...p, fewest: -1 })).toBe(false);
    expect(validPlay({ ...p, fewest: 2.5 })).toBe(false);
  });
  it('statistics: free play by difficulty, levels; the longest run of days', () => {
    let s = emptyStats();
    s = recordLeft(s, 'hard');
    let p = newPlay(small, 'free', { difficulty: 'hard' });
    for (const m of solve(p.bottles, POUR.capacity, 1000).moves!) p = pourIn(p, m)!;
    s = recordWon(s, p);
    expect(s.free.hard).toEqual({ played: 2, won: 1, clean: 1, bestMoves: p.moves });
    // a longer win keeps the fewest pours; a shorter one takes its place
    expect(recordWon(s, { ...p, moves: p.moves + 5 }).free.hard.bestMoves).toBe(p.moves);
    expect(recordWon(s, { ...p, moves: p.moves - 1 }).free.hard.bestMoves).toBe(p.moves - 1);
    s = recordWon(s, { ...p, way: 'level', level: 3, difficulty: null, hints: 1 });
    expect(s.levels).toEqual({ won: 1, clean: 0 });
    expect(recordWon(s, { ...p, way: 'daily', daily: '2026-11-27', difficulty: null })).toEqual(s);
    expect(longestStreak(['2026-11-25', '2026-11-26', '2026-11-27', '2026-11-29'])).toBe(3);
    expect(longestStreak([])).toBe(0);
  });
});
