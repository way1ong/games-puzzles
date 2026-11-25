import { describe, expect, it } from 'vitest';
import { cardOf } from './cards.ts';
import { finishTask, winnableSeed } from './deals.ts';
import { hintSearch, type Hint } from './hint.ts';
import { canMove, deal, drawCards, moveCards, undo, type Klondike, type Place } from './klondike.ts';
import { createSolver } from './solve.ts';

const wins = (g: Klondike) => createSolver(g, g.draw).run(1_000_000) === 'won';

function follow(g: Klondike, hint: Hint): Klondike {
  if (hint.kind === 'draw') return drawCards(g);
  if (hint.kind === 'move') return moveCards(g, hint.from, hint.index, hint.to);
  throw new Error(`not a move: ${hint.kind}`);
}

describe('the hint', () => {
  it('leads through a deal that can be won, every step keeping it so', () => {
    const seed = finishTask(winnableSeed(2024, 1))!;
    let g = deal(seed, 1);
    for (let i = 0; i < 300 && !g.done; i++) {
      const hint = finishTask(hintSearch(g));
      if (hint.kind === 'finish') break;
      expect(['move', 'draw']).toContain(hint.kind);
      g = follow(g, hint);
    }
    const end = finishTask(hintSearch(g));
    expect(g.done || end.kind === 'finish').toBe(true);
  });

  it('says to finish when the rest goes home by itself', () => {
    const g: Klondike = {
      ...deal(1, 1),
      columns: [[cardOf(1, 13)], [], [], [], [], [], []],
      down: [0, 0, 0, 0, 0, 0, 0],
      talon: [],
      foundations: [13, 12, 13, 13],
    };
    expect(finishTask(hintSearch(g))).toEqual({ kind: 'finish' });
  });

  it('when no way is left, tells how many moves to undo — to a position that can be won', () => {
    // Poor play from a deal that can be won: always the last legal move found, until no way is left.
    const seed = finishTask(winnableSeed(31, 1))!;
    let g = deal(seed, 1);
    let lost = false;
    for (let i = 0; i < 400 && !lost && !g.done; i++) {
      const moves: [Place, number, Place][] = [];
      for (let to = 0; to < 7; to++) if (canMove(g, { kind: 'waste' }, 0, { kind: 'column', index: to })) moves.push([{ kind: 'waste' }, 0, { kind: 'column', index: to }]);
      for (let s = 0; s < 4; s++) if (canMove(g, { kind: 'waste' }, 0, { kind: 'foundation', suit: s })) moves.push([{ kind: 'waste' }, 0, { kind: 'foundation', suit: s }]);
      g.columns.forEach((c, from) => {
        const top = c.length - 1;
        for (let s = 0; s < 4; s++) if (top >= 0 && canMove(g, { kind: 'column', index: from }, top, { kind: 'foundation', suit: s })) moves.push([{ kind: 'column', index: from }, top, { kind: 'foundation', suit: s }]);
      });
      const pick = moves.at(-1);
      g = pick ? moveCards(g, ...pick) : drawCards(g);
      if (pick) lost = createSolver(g, g.draw).run(200_000) === 'lost';
    }
    expect(lost).toBe(true);
    const hint = finishTask(hintSearch(g));
    expect(hint.kind).toBe('stuck');
    if (hint.kind !== 'stuck' || hint.back === null) throw new Error('no way back found');
    let back = g;
    for (let k = 0; k < hint.back; k++) back = undo(back);
    expect(wins(back)).toBe(true);
    // the fewest moves: one move less undone is still a position with no way
    let less = g;
    for (let k = 0; k < hint.back - 1; k++) less = undo(less);
    expect(wins(less)).toBe(false);
  });

  it('names the move home that turns up the last face-down card, not "finish" yet', () => {
    // hearts home up to the five; the six of hearts lies on a face-down card, the rest is open
    const g: Klondike = {
      ...deal(1, 1),
      columns: [[cardOf(1, 7)], [cardOf(1, 6)], [cardOf(1, 9), cardOf(1, 8)], [], [], [], []],
      down: [0, 0, 1, 0, 0, 0, 0],
      talon: [cardOf(1, 10), cardOf(1, 11), cardOf(1, 12), cardOf(1, 13)],
      pos: 0,
      foundations: [13, 5, 13, 13],
    };
    const hint = finishTask(hintSearch(g));
    expect(hint.kind).toBe('move');
  });

  it('a deal with no way from the start: stuck, nothing to undo', () => {
    // Each two lies on the other suit's ace, face down: neither ace can come out.
    const g: Klondike = {
      ...deal(1, 1),
      columns: [[cardOf(0, 1), cardOf(1, 2)], [cardOf(1, 1), cardOf(0, 2)], [], [], [], [], []],
      down: [1, 1, 0, 0, 0, 0, 0],
      talon: [],
      foundations: [0, 0, 13, 13],
    };
    expect(finishTask(hintSearch(g))).toEqual({ kind: 'stuck', back: null });
  });
});
