// FreeCell's rules (docs/solitaire/SPEC.md, "Вільні клітинки"): the deal; cards in order move together as many as the
// free cells and the empty columns allow; one card in a free cell; nothing back from a foundation; the cards no longer
// needed go home by themselves, and "Скасувати" brings them back with the move; finishing by itself.
import { describe, expect, it } from 'vitest';
import { FREE_CELLS, SOLITAIRE } from '../config.ts';
import { cardOf, DECK, type Card } from './cards.ts';
import {
  canFinish,
  canMove,
  cellsOf,
  finishStep,
  freecellDeal,
  homeForGood,
  moveCards,
  moveLimit,
  moveRefusal,
  orderStart,
  settleStart,
  undoFreeCell,
  type FreeCell,
} from './freecell.ts';

const S = 0; // spades
const H = 1; // hearts
const C = 2; // clubs
const D = 3; // diamonds
const c = (suit: number, rank: number): Card => cardOf(suit, rank);
const col = (index: number) => ({ kind: 'column' as const, index });
const cell = (index: number) => ({ kind: 'cell' as const, index });
const home = (suit: number) => ({ kind: 'foundation' as const, suit });

/** A table of our own: the columns given, the rest of the eight empty. */
function table(columns: Card[][], cells: (Card | null)[] = [null, null, null, null], foundations = [0, 0, 0, 0]): FreeCell {
  const all = [...columns];
  while (all.length < SOLITAIRE.freecell.columns) all.push([]);
  return { columns: all, cells, foundations, seed: 1, daily: null, history: [], hints: 0, ms: 0, done: false };
}

describe('the deal', () => {
  it('lays every card once, face up, into eight columns of seven and six', () => {
    for (const cells of FREE_CELLS) {
      const g = freecellDeal(42, cells);
      expect(g.columns.map((x) => x.length)).toEqual([7, 7, 7, 7, 6, 6, 6, 6]);
      expect(new Set(g.columns.flat()).size).toBe(DECK);
      expect(g.cells).toEqual(Array.from({ length: cells }, () => null));
      expect(cellsOf(g)).toBe(cells);
      expect(g.foundations).toEqual([0, 0, 0, 0]);
    }
  });

  it('is the same for the same seed, another for another', () => {
    expect(freecellDeal(7, 4).columns).toEqual(freecellDeal(7, 4).columns);
    expect(freecellDeal(7, 4).columns).not.toEqual(freecellDeal(8, 4).columns);
  });
});

describe('cards moving together', () => {
  it('may be as many as (free cells + 1) × 2 for each empty column, not counting the one they go to', () => {
    const run = [c(S, 9), c(H, 8), c(C, 7), c(D, 6), c(S, 5), c(H, 4)];
    const g = table([run, [c(H, 10)], [c(D, 13)], [c(S, 13)], [c(C, 13)], [c(H, 13)], [c(D, 12)], [c(C, 12)]]);
    expect(moveLimit(g, col(1))).toBe(5);
    expect(moveRefusal(g, col(0), 0, col(1))).toBe('too-many');
    expect(canMove(g, col(0), 1, col(1))).toBe(false); // the eight does not lie on the ten
    const twoCells = { ...g, cells: [c(S, 1), null, null, c(H, 1)] };
    expect(moveLimit(twoCells, col(1))).toBe(3);
    const withEmpty = table([run, [c(H, 10)], [c(D, 13)], [c(S, 13)], [c(C, 13)], [c(H, 13)], [c(D, 12)]], [c(S, 1), null, null, c(H, 1)]);
    expect(moveLimit(withEmpty, col(1))).toBe(6);
    expect(canMove(withEmpty, col(0), 0, col(1))).toBe(true);
    // into the empty column itself: it does not count
    expect(moveLimit(withEmpty, col(7))).toBe(3);
    expect(moveRefusal(withEmpty, col(0), 2, col(7))).toBe('too-many');
    expect(canMove(withEmpty, col(0), 3, col(7))).toBe(true);
  });

  it('must lie in order, the colours taking turns', () => {
    const g = table([[c(S, 9), c(D, 8), c(H, 7)], [c(H, 10)]]);
    expect(orderStart(g, 0)).toBe(2);
    expect(moveRefusal(g, col(0), 0, col(1))).toBe('order');
    expect(moveRefusal(g, col(0), 2, col(1))).toBe('no-fit');
  });
});

describe('free cells and foundations', () => {
  it('take one card into an empty free cell; never a run, never from another cell', () => {
    const g = table([[c(S, 9), c(H, 8)], [c(D, 5)]], [null, c(C, 2), null, null]);
    expect(canMove(g, col(1), 0, cell(0))).toBe(true);
    expect(moveRefusal(g, col(1), 0, cell(1))).toBe('no-fit');
    expect(moveRefusal(g, col(0), 0, cell(0))).toBe('one-card');
    expect(moveRefusal(g, cell(1), 0, cell(0))).toBe('no-fit');
    expect(canMove(g, cell(1), 0, col(7))).toBe(true);
  });

  it('take each suit from the ace up, and give nothing back', () => {
    const g = table([[c(S, 1)], [c(S, 3)]], [null, null, null, null], [0, 0, 0, 0]);
    expect(canMove(g, col(0), 0, home(S))).toBe(true);
    expect(canMove(g, col(1), 0, home(S))).toBe(false);
    const after = moveCards(g, col(0), 0, home(S), false);
    expect(after.foundations[S]).toBe(1);
    expect(moveRefusal(after, home(S), 0, col(7))).toBe('no-fit');
  });
});

describe('cards no longer needed', () => {
  it('are aces and twos, and others once both cards of the other colour one lower are home', () => {
    expect(homeForGood([0, 0, 0, 0], c(H, 1))).toBe(true);
    expect(homeForGood([0, 1, 0, 0], c(H, 2))).toBe(true);
    expect(homeForGood([0, 4, 0, 0], c(H, 5))).toBe(false);
    expect(homeForGood([4, 4, 3, 0], c(H, 5))).toBe(false);
    expect(homeForGood([4, 4, 4, 0], c(H, 5))).toBe(true);
    expect(homeForGood([4, 3, 4, 0], c(H, 5))).toBe(false); // not its turn yet
  });

  it('go home by themselves after a move, and come back with it', () => {
    const g = table([[c(S, 1), c(D, 7)], [c(C, 8)]]);
    const after = moveCards(g, col(0), 1, col(1), true);
    expect(after.foundations[S]).toBe(1);
    expect(after.columns[0]).toEqual([]);
    expect(after.history[0]!.auto).toEqual([{ from: col(0), card: c(S, 1) }]);
    const back = undoFreeCell(after);
    expect(back.columns).toEqual(g.columns);
    expect(back.foundations).toEqual(g.foundations);
    // with the setting off they stay
    expect(moveCards(g, col(0), 1, col(1), false).foundations[S]).toBe(0);
  });

  it('go home at the start of a deal with no step to take back', () => {
    const g = table([[c(S, 5), c(H, 1)], [c(D, 9)]]);
    const settled = settleStart(g);
    expect(settled.foundations[H]).toBe(1);
    expect(settled.history).toEqual([]);
    const plain = table([[c(S, 5)]]);
    expect(settleStart(plain)).toBe(plain);
  });
});

describe('undo', () => {
  it('brings every move back, whatever it was', () => {
    let g = settleStart(freecellDeal(5, 4));
    const start = g;
    for (let i = 0; i < 3; i++) {
      const next = moveCards(g, col(i), g.columns[i]!.length - 1, cell(i), true);
      expect(next).not.toBe(g);
      g = next;
    }
    while (g.history.length > 0) g = undoFreeCell(g);
    expect(g.columns).toEqual(start.columns);
    expect(g.cells).toEqual(start.cells);
    expect(g.foundations).toEqual(start.foundations);
  });
});

describe('finishing by itself', () => {
  it('goes card by card, the lowest first, once no other move is needed', () => {
    const g = table([[c(S, 13), c(S, 12)], [c(H, 13)]], [c(H, 12), null, null, null], [11, 11, 13, 13]);
    expect(finishStep(g)).toEqual({ from: col(0), index: 1, to: home(S) });
    expect(canFinish(g)).toBe(true);
  });

  it('is not offered while a card lies above a lower one of its suit', () => {
    const g = table([[c(S, 12), c(S, 13)], [c(H, 13)]], [c(H, 12), null, null, null], [11, 11, 13, 13]);
    expect(canFinish(g)).toBe(false);
  });
});
