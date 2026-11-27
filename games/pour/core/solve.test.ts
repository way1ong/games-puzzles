// The solver: its way is real (every pour legal, it ends solved); "no way" is the truth — checked against a search of
// every position on small deals; it stops at its limit; a hint's way is straight.
import { describe, expect, it } from 'vitest';
import { nextInt } from '../../../shared/core/rng.ts';
import { isSolved, keyOf, legalMoves, pour, whyNot, type Bottles, type Move } from './bottles.ts';
import { deal } from './deal.ts';
import { orderedMoves, placeKey, solve, straighten } from './solve.ts';

const CAP = 4;

function walk(start: Bottles, moves: readonly Move[]): Bottles {
  let b = start;
  for (const m of moves) {
    expect(whyNot(b, m, CAP)).toBe(null);
    b = pour(b, m, CAP);
  }
  return b;
}

/** Every position reachable by any legal pour: is a solved one among them? */
function anyWay(start: Bottles): boolean {
  const seen = new Set([keyOf(start)]);
  const queue = [start];
  while (queue.length) {
    const b = queue.pop()!;
    if (isSolved(b, CAP)) return true;
    for (const m of legalMoves(b, CAP)) {
      const n = pour(b, m, CAP);
      const k = keyOf(n);
      if (!seen.has(k)) {
        seen.add(k);
        queue.push(n);
      }
    }
  }
  return false;
}

describe('the solver', () => {
  it('finds a real way to the end on deals of every size', () => {
    let state = 11;
    for (const colours of [3, 5, 8, 11]) {
      for (let t = 0; t < 5; t++) {
        const d = deal(colours, 2, CAP, 11, state);
        state = d.state;
        const r = solve(d.bottles, CAP, 20_000);
        expect(r.moves).not.toBe(null);
        expect(isSolved(walk(d.bottles, r.moves!), CAP)).toBe(true);
      }
    }
  });

  it('says "no way" only when there is none, and finds one whenever there is (every position searched)', () => {
    let state = 5;
    let none = 0;
    let some = 0;
    for (let t = 0; t < 60; t++) {
      // small deals, after a few random pours (some lead to dead ends); one empty bottle makes dead ends common
      const d = deal(3, t % 2 ? 1 : 2, CAP, 11, state);
      state = d.state;
      let b = d.bottles;
      for (let k = 0; k < t % 7; k++) {
        const ms = legalMoves(b, CAP);
        if (!ms.length) break;
        const pick = nextInt(state, ms.length);
        state = pick.state;
        b = pour(b, ms[pick.value]!, CAP);
      }
      const r = solve(b, CAP, 1_000_000);
      expect(r.capped).toBe(false);
      expect(r.moves !== null).toBe(anyWay(b));
      if (r.moves) some++;
      else none++;
    }
    expect(none).toBeGreaterThan(0);
    expect(some).toBeGreaterThan(0);
  });

  it('stops at its limit not knowing', () => {
    const d = deal(11, 2, CAP, 11, 3);
    const r = solve(d.bottles, CAP, 3);
    expect(r).toMatchObject({ moves: null, capped: true });
  });

  it('tries first what closes a bottle, an empty bottle last', () => {
    // the 1 of the second bottle onto three 1s closes a bottle
    const c: Bottles = [[1, 1, 1], [2, 1], [], [0, 0, 2, 2]];
    expect(orderedMoves(c, CAP)[0]).toEqual({ from: 1, to: 0 });
    expect(orderedMoves(c, CAP).at(-1)!.to).toBe(2);
    // a whole top onto the same colour comes earlier in the list, but the pour that closes a bottle goes first
    const x: Bottles = [[1, 2], [2], [0, 0, 0], [1, 0], []];
    expect(orderedMoves(x, CAP)[0]).toEqual({ from: 3, to: 2 });
    expect(orderedMoves(x, CAP)[1]).toEqual({ from: 0, to: 1 });
  });

  it('makes a way straight: never the same position twice, never longer', () => {
    let state = 21;
    let shorter = 0;
    for (let t = 0; t < 20; t++) {
      const d = deal(4, 2, CAP, 11, state);
      state = d.state;
      // a wandering start (random legal pours, with their returns), then a way to the end
      let b = d.bottles;
      const wander: Move[] = [];
      for (let k = 0; k < 15; k++) {
        const ms = legalMoves(b, CAP);
        if (!ms.length) break;
        const pick = nextInt(state, ms.length);
        state = pick.state;
        wander.push(ms[pick.value]!);
        b = pour(b, ms[pick.value]!, CAP);
      }
      const rest = solve(b, CAP, 100_000).moves;
      if (!rest) continue;
      const full = [...wander, ...rest];
      const straight = straighten(d.bottles, full, CAP);
      expect(straight.length).toBeLessThanOrEqual(full.length);
      if (straight.length < full.length) shorter++;
      const keys = new Set<string>();
      let s = d.bottles;
      for (const m of straight) {
        expect(keys.has(placeKey(s))).toBe(false);
        keys.add(placeKey(s));
        expect(whyNot(s, m, CAP)).toBe(null);
        s = pour(s, m, CAP);
      }
      expect(isSolved(s, CAP)).toBe(true);
    }
    expect(shorter).toBeGreaterThan(0);
  });
});
