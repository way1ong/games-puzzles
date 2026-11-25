import { describe, expect, it } from 'vitest';
import { SOLITAIRE } from '../config.ts';
import { cardOf, type Card } from './cards.ts';
import { finishTask, winnableSeed } from './deals.ts';
import { hintSearch } from './hint.ts';
import { canMove, deal, drawCards, moveCards, undo, type Klondike, type Place } from './klondike.ts';
import { createSolver } from './solve.ts';
import { carriedBack, noUsefulMove, turnsWithoutChange, worthChecking } from './stuck.ts';

const [S, H, C, D] = [0, 1, 2, 3];
const c = cardOf;

/** A made-up table: the top `ups[i]` cards of column i face up, the rest face down; nothing home yet. */
function table(columns: Card[][], ups: number[], talon: Card[]): Klondike {
  return { ...deal(1, 1), columns, down: columns.map((col, i) => col.length - ups[i]!), talon, pos: 0, fan: 0, foundations: [0, 0, 0, 0], history: [] };
}

/** Every ace face down, the tops all black: no top fits on another, nothing goes home (as on the owner's screen of 25.11). */
const DEAD: Card[][] = [
  [c(S, 1), c(C, 13)],
  [c(H, 1), c(S, 2), c(S, 12)],
  [c(C, 1), c(H, 3), c(D, 4), c(C, 11)],
  [c(D, 1), c(H, 2), c(S, 3), c(H, 5), c(S, 10)],
  [c(C, 2), c(D, 2), c(C, 3), c(D, 3), c(S, 4), c(C, 9)],
  [c(H, 4), c(C, 4), c(S, 5), c(D, 5), c(C, 5), c(H, 6), c(S, 8)],
  [c(S, 6), c(D, 6), c(C, 6), c(H, 7), c(S, 7), c(D, 7), c(H, 8), c(C, 7)],
];
const TOPS = [1, 1, 1, 1, 1, 1, 1];
/** Black stock cards: they fit on no black top. */
const BLACK = [c(S, 9), c(C, 10), c(S, 11)];

/** Turns the stock card by card until the waste goes back into it, `times` times. */
function rounds(g: Klondike, times: number): Klondike {
  for (let k = 0; k < times; k++) {
    do g = drawCards(g);
    while (g.pos !== 0);
  }
  return g;
}

const column = (index: number): Place => ({ kind: 'column', index });

describe('no move that leads anywhere', () => {
  it('is seen when nothing goes home, nothing fits and no face-down card can be turned up', () => {
    expect(noUsefulMove(table(DEAD, TOPS, []))).toBe(true);
    // stock cards that fit nowhere change nothing
    expect(noUsefulMove(table(DEAD, TOPS, BLACK))).toBe(true);
  });

  it('is not seen while a stock card fits somewhere, or a run can turn a face-down card up', () => {
    // the red queen goes on the black king
    expect(noUsefulMove(table(DEAD, TOPS, [c(D, 12)]))).toBe(false);
    const flip = DEAD.map((col) => [...col]);
    flip[6] = [c(S, 6), c(D, 6), c(C, 6), c(H, 7), c(S, 7), c(C, 7), c(H, 8), c(D, 7)];
    // the red seven goes on the black eight and turns the eight of hearts up
    expect(noUsefulMove(table(flip, TOPS, []))).toBe(false);
  });

  it('is not seen on a new deal that can be won, nor when the rest goes home by itself', () => {
    expect(noUsefulMove(deal(finishTask(winnableSeed(2024, 1))!, 1))).toBe(false);
    const end: Klondike = { ...deal(1, 1), columns: [[cardOf(1, 13)], [], [], [], [], [], []], down: [0, 0, 0, 0, 0, 0, 0], talon: [], foundations: [13, 12, 13, 13] };
    expect(noUsefulMove(end)).toBe(false);
  });

  it('is a dead end for the hint as well: no way, nothing to undo to', () => {
    expect(finishTask(hintSearch(table(DEAD, TOPS, BLACK)))).toEqual({ kind: 'stuck', back: null });
  });
});

describe('going round in circles', () => {
  // the red queen in the stock could go on the black king: a useful move is there, the player does not take it
  const start = table(DEAD, TOPS, [c(S, 9), c(D, 12), c(C, 10)]);

  it('counts the times the stock is turned over with nothing changed', () => {
    expect(turnsWithoutChange(start)).toBe(0);
    expect(turnsWithoutChange(rounds(start, 1))).toBe(1);
    expect(turnsWithoutChange(rounds(start, 2))).toBe(2);
    expect(turnsWithoutChange(drawCards(rounds(start, 2)))).toBe(2);
    // undo takes the last turn back
    expect(turnsWithoutChange(undo(rounds(start, 2)))).toBe(1);
  });

  it(`asks the solver when the stock has just been turned over the ${SOLITAIRE.circles}-th time — once a round`, () => {
    expect(worthChecking(start)).toBe(false);
    expect(worthChecking(rounds(start, SOLITAIRE.circles - 1))).toBe(false);
    expect(worthChecking(rounds(start, SOLITAIRE.circles))).toBe(true);
    // the next card of the same round: not again
    expect(worthChecking(drawCards(rounds(start, SOLITAIRE.circles)))).toBe(false);
    expect(worthChecking(rounds(start, SOLITAIRE.circles + 1))).toBe(true);
  });

  it('starts counting again when a card leaves the waste', () => {
    let g = drawCards(drawCards(rounds(start, 2)));
    expect(g.talon[g.pos - 1]).toBe(c(D, 12));
    g = moveCards(g, { kind: 'waste' }, 0, column(0));
    expect(turnsWithoutChange(g)).toBe(0);
    expect(turnsWithoutChange(rounds(g, 1))).toBe(1);
  });

  it('starts counting again when a face-down card is turned up, not when cards only change columns', () => {
    const flip = DEAD.map((col) => [...col]);
    flip[6] = [c(S, 6), c(D, 6), c(C, 6), c(H, 7), c(S, 7), c(C, 7), c(H, 8), c(D, 7)];
    const g = rounds(table(flip, TOPS, BLACK), 2);
    const turned = moveCards(g, column(6), 7, column(5));
    expect(turned.history.at(-1)).toMatchObject({ kind: 'move', flipped: true });
    expect(turnsWithoutChange(turned)).toBe(0);
    // the eight of hearts goes from the nine of clubs to the nine of spades: both lie face up, nothing is turned up
    const shift = rounds(table([[c(S, 1), c(C, 9), c(H, 8)], [c(H, 1), c(S, 9)], [], [], [], [], []], [2, 1, 0, 0, 0, 0, 0], [c(C, 10)]), 2);
    expect(canMove(shift, column(0), 2, column(1))).toBe(true);
    const moved = moveCards(shift, column(0), 2, column(1));
    expect(moved.history.at(-1)).toMatchObject({ kind: 'move', flipped: false });
    expect(turnsWithoutChange(moved)).toBe(2);
  });

  it('a dead end is worth a check at once, without any rounds', () => {
    expect(worthChecking(table(DEAD, TOPS, []))).toBe(true);
    expect(worthChecking({ ...table(DEAD, TOPS, []), done: true })).toBe(false);
  });
});

describe('a verdict carried over turns of the stock', () => {
  const checked = drawCards(table(DEAD, TOPS, BLACK));

  it('holds after turning the stock, the way back longer by the turns', () => {
    const later = drawCards(drawCards(checked));
    expect(carriedBack(checked, 5, later)).toBe(7);
    expect(carriedBack(checked, null, later)).toBeNull();
    expect(carriedBack(checked, 5, checked)).toBe(5);
  });

  it('does not hold after a move, after undo, or for another game', () => {
    const flip = DEAD.map((col) => [...col]);
    flip[6] = [c(S, 6), c(D, 6), c(C, 6), c(H, 7), c(S, 7), c(C, 7), c(H, 8), c(D, 7)];
    const base = drawCards(table(flip, TOPS, BLACK));
    expect(carriedBack(base, 5, moveCards(base, column(6), 7, column(5)))).toBeUndefined();
    expect(carriedBack(checked, 5, undo(checked))).toBeUndefined();
    expect(carriedBack(checked, 5, drawCards(table(DEAD, TOPS, BLACK)))).toBeUndefined();
  });

  it('agrees with the hint asked afresh after the turns', () => {
    // poor play from a deal that can be won — always the last legal move found — until no way is left
    let g = deal(finishTask(winnableSeed(31, 1))!, 1);
    let lost = false;
    for (let i = 0; i < 400 && !lost && !g.done; i++) {
      const moves: [Place, number, Place][] = [];
      for (let to = 0; to < 7; to++) if (canMove(g, { kind: 'waste' }, 0, column(to))) moves.push([{ kind: 'waste' }, 0, column(to)]);
      for (let s = 0; s < 4; s++) if (canMove(g, { kind: 'waste' }, 0, { kind: 'foundation', suit: s })) moves.push([{ kind: 'waste' }, 0, { kind: 'foundation', suit: s }]);
      g.columns.forEach((col, from) => {
        for (let s = 0; s < 4; s++) if (col.length > 0 && canMove(g, column(from), col.length - 1, { kind: 'foundation', suit: s })) moves.push([column(from), col.length - 1, { kind: 'foundation', suit: s }]);
      });
      const pick = moves.at(-1);
      g = pick ? moveCards(g, ...pick) : drawCards(g);
      if (pick) lost = createSolver(g, g.draw).run(200_000) === 'lost';
    }
    expect(lost).toBe(true);
    const here = finishTask(hintSearch(g));
    expect(here.kind).toBe('stuck');
    if (here.kind !== 'stuck' || here.back === null) throw new Error('expected a way back');
    const later = drawCards(drawCards(drawCards(g)));
    expect(finishTask(hintSearch(later))).toEqual({ kind: 'stuck', back: carriedBack(g, here.back, later) });
  });
});
