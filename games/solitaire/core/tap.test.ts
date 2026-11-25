import { expect, it } from 'vitest';
import { cardOf } from './cards.ts';
import { deal, type Klondike } from './klondike.ts';
import { bestPlace } from './tap.ts';

const S = 0;
const H = 1;
const C = 2;

function table(columns: number[][], down: number[], foundations = [0, 0, 0, 0], talon: number[] = [], pos = 0): Klondike {
  return { ...deal(1, 1), columns, down, foundations, talon, pos, fan: 0 };
}

it('a single card goes home first', () => {
  const g = table([[cardOf(H, 2)], [cardOf(S, 3)], [], [], [], [], []], [0, 0, 0, 0, 0, 0, 0], [0, 1, 0, 0]);
  expect(bestPlace(g, { kind: 'column', index: 0 }, 0)).toEqual({ kind: 'foundation', suit: H });
});

it('then a column with cards, before an empty one; a run goes whole', () => {
  const g = table([[cardOf(H, 12), cardOf(C, 11)], [], [cardOf(S, 13)], [cardOf(H, 13)], [], [], []], [0, 0, 0, 0, 0, 0, 0]);
  expect(bestPlace(g, { kind: 'column', index: 0 }, 0)).toEqual({ kind: 'column', index: 2 });
  const king = table([[cardOf(S, 9), cardOf(H, 13)], [], [cardOf(S, 13)], [], [], [], []], [1, 0, 0, 0, 0, 0, 0]);
  expect(bestPlace(king, { kind: 'column', index: 0 }, 1)).toEqual({ kind: 'column', index: 1 });
});

it('a king alone at the bottom of its column stays; a card with no place stays; a card from home stays', () => {
  const g = table([[cardOf(S, 13)], [], [cardOf(S, 5)], [], [], [], []], [0, 0, 0, 0, 0, 0, 0], [0, 0, 3, 0]);
  expect(bestPlace(g, { kind: 'column', index: 0 }, 0)).toBeNull();
  expect(bestPlace(g, { kind: 'column', index: 2 }, 0)).toBeNull();
  expect(bestPlace(g, { kind: 'foundation', suit: C }, 0)).toBeNull();
});

it('the top of the waste goes like any other card', () => {
  const g = table([[cardOf(S, 8)], [], [], [], [], [], []], [0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0], [cardOf(H, 7)], 1);
  expect(bestPlace(g, { kind: 'waste' }, 0)).toEqual({ kind: 'column', index: 0 });
});
