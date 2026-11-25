import { describe, expect, it } from 'vitest';
import { suitOf, cardOf } from './cards.ts';
import { dailySeed, finishTask, winnableSeed } from './deals.ts';
import { canFinish, deal, drawCards, finishStep, moveCards, type Klondike, type Place } from './klondike.ts';
import { FOUNDATION, createSolver, type SolverMove } from './solve.ts';

/** Plays a solver's way by the rules of the game, then finishes by itself; whether every card got home. */
function playsOut(g0: Klondike, path: SolverMove[]): boolean {
  let g = g0;
  for (const m of path) {
    let from: Place;
    let index: number;
    let card: number;
    if (m.kind === 'talon') {
      for (let guard = 0; g.pos !== m.p && guard < 200; guard++) g = drawCards(g);
      if (g.pos !== m.p) return false;
      from = { kind: 'waste' };
      index = 0;
      card = g.talon[g.pos - 1]!;
    } else {
      from = { kind: 'column', index: m.from };
      index = m.index;
      card = g.columns[m.from]![m.index]!;
    }
    const to: Place = m.to === FOUNDATION ? { kind: 'foundation', suit: suitOf(card) } : { kind: 'column', index: m.to };
    const next = moveCards(g, from, index, to);
    if (next === g) return false;
    g = next;
  }
  if (!g.done && !canFinish(g)) return false;
  for (let guard = 0; !g.done && guard < 5000; guard++) {
    const s = finishStep(g);
    if (!s) return false;
    g = s === 'draw' ? drawCards(g) : moveCards(g, s.from, s.index, s.to);
  }
  return g.done;
}

describe('the solver', () => {
  for (const draw of [1, 3] as const) {
    it(`every way it finds (${draw} a turn) gets all cards home by the rules`, () => {
      let won = 0;
      for (let seed = 1; seed <= 25; seed++) {
        const g = deal(seed, draw);
        const solver = createSolver(g, draw);
        if (solver.run(20_000) !== 'won') continue;
        won++;
        expect(playsOut(g, solver.path()), `seed ${seed}`).toBe(true);
      }
      expect(won).toBeGreaterThan(15);
    });
  }

  it('says lost when no way is left, and more when the time is not enough', () => {
    // Each two lies on the other suit's ace, face down: neither ace can come out.
    const g: Klondike = {
      ...deal(1, 1),
      columns: [[cardOf(0, 1), cardOf(1, 2)], [cardOf(1, 1), cardOf(0, 2)], [], [], [], [], []],
      down: [1, 1, 0, 0, 0, 0, 0],
      talon: [],
      pos: 0,
      foundations: [0, 0, 13, 13],
    };
    expect(createSolver(g, 1).run(1000)).toBe('lost');
    expect(createSolver(deal(42, 1), 1).run(1)).toBe('more');
  });

  it('takes safe moves home at the start: an ace on top is the first move', () => {
    const g: Klondike = {
      ...deal(1, 1),
      columns: [[cardOf(2, 1)], [cardOf(0, 2)], [], [], [], [], []],
      down: [0, 0, 0, 0, 0, 0, 0],
      talon: [],
      pos: 0,
      foundations: [1, 13, 0, 13],
    };
    const solver = createSolver(g, 1);
    expect(solver.firstMove()).toEqual({ kind: 'column', from: 0, index: 0, to: FOUNDATION });
    expect(solver.run(100)).toBe('won');
  });
});

describe('deals that can be won', () => {
  it('give the first seed from the start whose deal the solver wins, the same every time', () => {
    for (const draw of [1, 3] as const) {
      const seed = finishTask(winnableSeed(1000, draw));
      expect(seed).not.toBeNull();
      expect(finishTask(winnableSeed(1000, draw))).toBe(seed);
      const solver = createSolver(deal(seed!, draw), draw);
      expect(solver.run(1_000_000)).toBe('won');
    }
  });

  it('can be worked out in slices with the same result', () => {
    const task = winnableSeed(77, 1);
    let result: number | null | undefined;
    for (let i = 0; i < 100_000 && result === undefined; i++) result = task.run(50);
    expect(result).toBe(finishTask(winnableSeed(77, 1)));
  });

  it('the deal of the day: the same for one date, another for another date or way of turning the stock', () => {
    expect(dailySeed('2026-11-25', 1)).toBe(dailySeed('2026-11-25', 1));
    expect(dailySeed('2026-11-25', 1)).not.toBe(dailySeed('2026-11-26', 1));
    expect(dailySeed('2026-11-25', 1)).not.toBe(dailySeed('2026-11-25', 3));
  });
});
