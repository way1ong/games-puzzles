// Pours (docs/pour/SPEC.md, "Як грати"): onto the same colour or into an empty bottle, all the top layers of that
// colour that fit; never onto another colour, into a full bottle, from an empty or a closed one.
import { describe, expect, it } from 'vitest';
import { isClosed, isSolved, isWhole, keyOf, legalMoves, pour, pourAmount, topRun, usefulMoves, whyNot, type Bottles } from './bottles.ts';

const CAP = 4;

describe('pours', () => {
  const b: Bottles = [[0, 1, 1], [2, 1], [], [0, 0, 0, 0], [2, 2, 2, 1]];
  it('onto the same colour: the top layers that fit', () => {
    expect(pourAmount(b, { from: 0, to: 1 }, CAP)).toBe(2);
    expect(pour(b, { from: 0, to: 1 }, CAP)).toEqual([[0], [2, 1, 1, 1], [], [0, 0, 0, 0], [2, 2, 2, 1]]);
    // only as many as fit
    expect(pourAmount([[1, 1, 1], [2, 1, 1]], { from: 0, to: 1 }, CAP)).toBe(1);
  });
  it('into an empty bottle: the whole top colour', () => {
    expect(pour(b, { from: 0, to: 2 }, CAP)).toEqual([[0], [2, 1], [1, 1], [0, 0, 0, 0], [2, 2, 2, 1]]);
  });
  it('never onto another colour, into a full bottle, from an empty or a closed one, or into itself', () => {
    expect(whyNot(b, { from: 1, to: 0 }, CAP)).toBe(null);
    expect(whyNot([[0], [1]], { from: 0, to: 1 }, CAP)).toBe('colour');
    expect(whyNot(b, { from: 0, to: 4 }, CAP)).toBe('full');
    expect(whyNot(b, { from: 2, to: 0 }, CAP)).toBe('empty');
    expect(whyNot(b, { from: 3, to: 2 }, CAP)).toBe('closed');
    expect(whyNot(b, { from: 0, to: 0 }, CAP)).toBe('same');
    expect(pour(b, { from: 3, to: 2 }, CAP)).toBe(b);
  });
  it('leaves its arguments as they were', () => {
    const copy = JSON.stringify(b);
    pour(b, { from: 0, to: 1 }, CAP);
    expect(JSON.stringify(b)).toBe(copy);
  });
  it('knows the top run, a closed bottle and the end', () => {
    expect(topRun([0, 1, 1])).toBe(2);
    expect(topRun([])).toBe(0);
    expect(isClosed([2, 2, 2, 2], CAP)).toBe(true);
    expect(isClosed([2, 2, 2], CAP)).toBe(false);
    expect(isSolved([[1, 1, 1, 1], [], [0, 0, 0, 0]], CAP)).toBe(true);
    expect(isSolved([[1, 1, 1], [1], [0, 0, 0, 0]], CAP)).toBe(false);
  });
});

describe('the pours a search looks at', () => {
  it('every legal pour, and of them the useful ones', () => {
    const b: Bottles = [[0, 1], [1], [], [], [0, 0, 0]];
    expect(legalMoves(b, CAP)).toEqual([
      { from: 0, to: 1 },
      { from: 0, to: 2 },
      { from: 0, to: 3 },
      { from: 1, to: 0 },
      { from: 1, to: 2 },
      { from: 1, to: 3 },
      { from: 4, to: 2 },
      { from: 4, to: 3 },
    ]);
    // one colour into an empty bottle only changes places; of two empty bottles one is enough
    expect(usefulMoves(b, CAP)).toEqual([
      { from: 0, to: 1 },
      { from: 0, to: 2 },
      { from: 1, to: 0 },
    ]);
  });
  it('a position is the same whichever bottle stands where', () => {
    expect(keyOf([[0, 1], [], [1, 0]])).toBe(keyOf([[1, 0], [0, 1], []]));
    expect(keyOf([[0, 1], [], [1, 0]])).not.toBe(keyOf([[1, 0], [1, 0], []]));
  });
  it('a whole set: every colour with as many layers as a bottle holds', () => {
    expect(isWhole([[0, 1, 1, 0], [1, 0, 1, 0], []], 2, CAP)).toBe(true);
    expect(isWhole([[0, 1, 1, 0], [1, 0, 1], []], 2, CAP)).toBe(false);
    expect(isWhole([[0, 1, 1, 0], [1, 0, 1, 2], []], 2, CAP)).toBe(false);
    expect(isWhole([[0, 1, 1, 0, 1], [0, 1, 0], []], 2, CAP)).toBe(false);
  });
});
