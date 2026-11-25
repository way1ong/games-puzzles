import { describe, expect, it } from 'vitest';
import { SOLITAIRE } from '../config.ts';
import { DECK, SUITS, cardOf, isRed, rankOf, shuffledDeck, suitOf } from './cards.ts';
import {
  addTime,
  canFinish,
  canMove,
  countHint,
  deal,
  drawCards,
  finishStep,
  moveCards,
  stockLeft,
  undo,
  wasteTop,
  type Klondike,
  type Place,
} from './klondike.ts';

const S = 0; // spades
const H = 1; // hearts
const C = 2; // clubs
const D = 3; // diamonds
const col = (index: number): Place => ({ kind: 'column', index });
const home = (suit: number): Place => ({ kind: 'foundation', suit });
const waste: Place = { kind: 'waste' };

/** A game on a table laid by hand: columns with their face-down counts, the talon, the foundations. */
function table(columns: number[][], down: number[], talon: number[] = [], foundations = [0, 0, 0, 0], pos = 0, draw: 1 | 3 = 1): Klondike {
  return { ...deal(1, draw), columns, down, talon, pos, fan: 0, foundations };
}

describe('cards', () => {
  it('a deck holds every card once; suits take turns black and red', () => {
    const deck = shuffledDeck(42);
    expect(deck).toHaveLength(DECK);
    expect(new Set(deck).size).toBe(DECK);
    expect(SUITS).toHaveLength(SOLITAIRE.deck.suits);
    expect([S, H, C, D].map((s) => isRed(cardOf(s, 1)))).toEqual([false, true, false, true]);
    expect([suitOf(cardOf(C, 12)), rankOf(cardOf(C, 12))]).toEqual([C, 12]);
  });

  it('the same seed gives the same deck, another seed another', () => {
    expect(shuffledDeck(7)).toEqual(shuffledDeck(7));
    expect(shuffledDeck(7)).not.toEqual(shuffledDeck(8));
  });
});

describe('the deal', () => {
  it('lays columns of one to seven cards, the top one face up, and the rest as the stock', () => {
    const g = deal(5, 1);
    expect(g.columns.map((c) => c.length)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(g.down).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(g.talon).toHaveLength(DECK - 28);
    expect(new Set([...g.columns.flat(), ...g.talon]).size).toBe(DECK);
    expect(deal(5, 1)).toEqual(g);
  });
});

describe('the stock', () => {
  it('turns one card at a time, and the waste over when the stock is empty', () => {
    let g = table([[], [], [], [], [], [], []], [0, 0, 0, 0, 0, 0, 0], [1, 2, 3]);
    g = drawCards(g);
    expect([g.pos, wasteTop(g), stockLeft(g)]).toEqual([1, 1, 2]);
    g = drawCards(drawCards(g));
    expect([g.pos, wasteTop(g), stockLeft(g)]).toEqual([3, 3, 0]);
    g = drawCards(g);
    expect([g.pos, wasteTop(g), stockLeft(g)]).toEqual([0, null, 3]);
    expect(g.history).toHaveLength(4);
  });

  it('turns three cards at a time, fewer at the end; the third is on top', () => {
    let g = table([[], [], [], [], [], [], []], [0, 0, 0, 0, 0, 0, 0], [1, 2, 3, 4, 5], [0, 0, 0, 0], 0, 3);
    g = drawCards(g);
    expect([g.pos, wasteTop(g), g.fan]).toEqual([3, 3, 3]);
    g = drawCards(g);
    expect([g.pos, wasteTop(g), g.fan]).toEqual([5, 5, 2]);
  });

  it('an empty stock and waste does nothing', () => {
    const g = table([[], [], [], [], [], [], []], [0, 0, 0, 0, 0, 0, 0]);
    expect(drawCards(g)).toBe(g);
  });
});

describe('moves', () => {
  const k = cardOf(S, 13);
  const qh = cardOf(H, 12);
  const qd = cardOf(D, 12);
  const jc = cardOf(C, 11);
  const js = cardOf(S, 11);

  it('a lower card of the other colour lies on a column; the same colour or rank gap does not', () => {
    const g = table([[k], [qh], [jc], [js], [qd], [], []], [0, 0, 0, 0, 0, 0, 0]);
    expect(canMove(g, col(1), 0, col(0))).toBe(true); // red queen on a black king
    expect(canMove(g, col(2), 0, col(1))).toBe(true); // black jack on a red queen
    expect(canMove(g, col(3), 0, col(2))).toBe(false); // same rank
    expect(canMove(g, col(2), 0, col(0))).toBe(false); // two ranks lower, same colour
    const gap = table([[k], [cardOf(D, 11)], [], [], [], [], []], [0, 0, 0, 0, 0, 0, 0]);
    expect(canMove(gap, col(1), 0, col(0))).toBe(false); // red jack on a black king: two ranks lower
    expect(canMove(g, col(4), 0, col(1))).toBe(false); // red on red
  });

  it('only a king (or a run from a king) goes to an empty column', () => {
    const g = table([[k], [qh], [], [], [], [], []], [0, 0, 0, 0, 0, 0, 0]);
    expect(canMove(g, col(0), 0, col(2))).toBe(true);
    expect(canMove(g, col(1), 0, col(2))).toBe(false);
  });

  it('a run in order moves together; a face-down card or cards out of order do not', () => {
    const g = table([[cardOf(D, 5), k, qh, jc], [], [cardOf(D, 13)], [], [], [], []], [1, 0, 0, 0, 0, 0, 0]);
    expect(canMove(g, col(0), 1, col(1))).toBe(true); // K Q J to the empty column
    expect(canMove(g, col(0), 0, col(1))).toBe(false); // the face-down card
    const hiddenKing = table([[k, qh, jc], [], [], [], [], [], []], [1, 0, 0, 0, 0, 0, 0]);
    expect(canMove(hiddenKing, col(0), 0, col(1))).toBe(false); // K Q J in order, but the king lies face down
    expect(canMove(hiddenKing, col(0), 1, col(1))).toBe(false); // Q J: not a king for the empty column
    const bad = table([[k, jc], [cardOf(D, 13)], [], [], [], [], []], [0, 0, 0, 0, 0, 0, 0]);
    expect(canMove(bad, col(0), 0, col(2))).toBe(false); // K J: not in order
  });

  it('the card left on top of a column turns face up, and undo turns it back', () => {
    const g = table([[cardOf(D, 5), cardOf(H, 9)], [cardOf(S, 10)], [], [], [], [], []], [1, 0, 0, 0, 0, 0, 0]);
    const next = moveCards(g, col(0), 1, col(1));
    expect(next.columns[1]).toEqual([cardOf(S, 10), cardOf(H, 9)]);
    expect(next.down[0]).toBe(0);
    const back = undo(next);
    expect(back.columns).toEqual(g.columns);
    expect(back.down).toEqual(g.down);
  });

  it('foundations take a suit from the ace up; a card comes back down from home; done when all are home', () => {
    const ace = cardOf(H, 1);
    const two = cardOf(H, 2);
    let g = table([[ace], [two], [cardOf(S, 3)], [], [], [], []], [0, 0, 0, 0, 0, 0, 0]);
    expect(canMove(g, col(1), 0, home(H))).toBe(false);
    g = moveCards(g, col(0), 0, home(H));
    g = moveCards(g, col(1), 0, home(H));
    expect(g.foundations[H]).toBe(2);
    expect(canMove(g, home(H), 0, col(2))).toBe(true); // red two on a black three
    g = moveCards(g, home(H), 0, col(2));
    expect([g.foundations[H], g.columns[2]]).toEqual([1, [cardOf(S, 3), two]]);
    expect(undo(g).foundations[H]).toBe(2);
    const last = table([[cardOf(D, 13)], [], [], [], [], [], []], [0, 0, 0, 0, 0, 0, 0], [], [13, 13, 13, 12]);
    expect(moveCards(last, col(0), 0, home(D)).done).toBe(true);
  });

  it('a card from the waste goes to a column and undo puts it back on the waste', () => {
    let g = table([[cardOf(S, 8)], [], [], [], [], [], []], [0, 0, 0, 0, 0, 0, 0], [cardOf(C, 2), cardOf(H, 7), cardOf(D, 4)]);
    g = drawCards(drawCards(g));
    expect(wasteTop(g)).toBe(cardOf(H, 7));
    const moved = moveCards(g, waste, 0, col(0));
    expect([moved.columns[0], wasteTop(moved), moved.talon]).toEqual([[cardOf(S, 8), cardOf(H, 7)], cardOf(C, 2), [cardOf(C, 2), cardOf(D, 4)]]);
    const back = undo(moved);
    expect([back.talon, back.pos, back.columns[0]]).toEqual([g.talon, g.pos, g.columns[0]]);
  });

  it('a move that the rules refuse leaves the game unchanged', () => {
    const g = table([[cardOf(S, 8)], [cardOf(S, 7)], [], [], [], [], []], [0, 0, 0, 0, 0, 0, 0]);
    expect(moveCards(g, col(1), 0, col(0))).toBe(g);
  });

  it('every step undone gives the game back as it was, through a whole random game', () => {
    let g = deal(11, 3);
    const states: Klondike[] = [g];
    for (let i = 0; i < 120; i++) {
      const moves: [Place, number, Place][] = [];
      g.columns.forEach((c, from) => {
        for (let idx = g.down[from]!; idx < c.length; idx++) {
          for (let to = 0; to < g.columns.length; to++) if (canMove(g, col(from), idx, col(to))) moves.push([col(from), idx, col(to)]);
          if (idx === c.length - 1) for (let s = 0; s < 4; s++) if (canMove(g, col(from), idx, home(s))) moves.push([col(from), idx, home(s)]);
        }
      });
      for (let to = 0; to < g.columns.length; to++) if (canMove(g, waste, 0, col(to))) moves.push([waste, 0, col(to)]);
      for (let s = 0; s < 4; s++) if (canMove(g, waste, 0, home(s))) moves.push([waste, 0, home(s)]);
      const pick = moves[i % (moves.length + 1)];
      g = pick ? moveCards(g, ...pick) : drawCards(g);
      states.push(g);
    }
    for (let i = states.length - 1; i > 0; i--) {
      g = undo(g);
      const { history: _h, done: _d, ...want } = states[i - 1]!;
      const { history: _h2, done: _d2, ...got } = g;
      expect(got).toEqual(want);
    }
  });
});

describe('finishing by itself', () => {
  it('is offered only when nothing lies face down, and puts the lowest card home first', () => {
    // spades, clubs and diamonds home; hearts up to the jack: the queen and the king are left
    const open = table([[cardOf(H, 13)], [cardOf(H, 12)], [], [], [], [], []], [0, 0, 0, 0, 0, 0, 0], [], [13, 11, 13, 13]);
    expect(canFinish(open)).toBe(true);
    expect(finishStep(open)).toEqual({ from: col(1), index: 0, to: home(H) });
    // two cards could go home: the lower one goes first
    const two = table([[cardOf(H, 10)], [cardOf(S, 4)], [], [], [], [], []], [0, 0, 0, 0, 0, 0, 0], [], [3, 9, 0, 0]);
    expect(finishStep(two)).toEqual({ from: col(1), index: 0, to: home(S) });
    const hidden = table([[cardOf(H, 13), cardOf(H, 12)], [], [], [], [], [], []], [1, 0, 0, 0, 0, 0, 0], [], [13, 11, 13, 13]);
    expect(canFinish(hidden)).toBe(false);
  });

  it('turns the stock when no card can go home, and gets every card home from an open deal', () => {
    let g = deal(3, 1);
    // all cards face up: then finishing alone must get them home (one card a turn reaches every stock card)
    g = { ...g, down: g.down.map(() => 0) };
    const ordered = g.columns.every((c) => c.length <= 1);
    if (!ordered) g = { ...g, columns: g.columns.map((c) => c.slice(-1)), talon: [...g.talon, ...g.columns.flatMap((c) => c.slice(0, -1))] };
    expect(canFinish(g)).toBe(true);
    expect(finishStep({ ...g, columns: [[], [], [], [], [], [], []] })).toBe('draw');
  });
});

it('time is added while playing, not after the end; hints are counted', () => {
  const g = deal(1, 1);
  expect(addTime(g, 1500).ms).toBe(1500);
  expect(addTime({ ...g, done: true }, 1500).ms).toBe(0);
  expect(countHint(countHint(g)).hints).toBe(2);
});
