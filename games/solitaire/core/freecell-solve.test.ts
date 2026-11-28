// FreeCell's solver, deals, hint, tap and dead ends (docs/solitaire/SPEC.md, "Вільні клітинки"): the way found plays out
// with the game's own rules to the end, with the cards going home by themselves or not; the way made straight ends the
// same and is not longer; a position with no move is lost; deals that can be won, the deal of the day the same for all;
// a player who does only what the hints say wins; where no way is left, the hint counts the moves to undo, and the game
// notices a dead end only when the player is plainly stuck.
import { describe, expect, it } from 'vitest';
import { nextInt } from '../../../shared/core/rng.ts';
import { SOLITAIRE } from '../config.ts';
import { cardOf, type Card } from './cards.ts';
import { finishTask } from './deals.ts';
import { freecellDailySeed, freecellWinnableSeed } from './freecell-deals.ts';
import { freecellHintSearch, nextOnFreeWay, type FreeHintFound, type FreeWay } from './freecell-hint.ts';
import { createFreeSolver, type FreeMove } from './freecell-solve.ts';
import { emptyFreeCellStats, recordFreeCellLeft, recordFreeCellWon } from './freecell-stats.ts';
import { cameBack, freeCarried, freecellWorthChecking, noFreeMove } from './freecell-stuck.ts';
import { freeBestPlace, tapRefusal } from './freecell-tap.ts';
import { freecellDeal, moveCards, settleStart, undoFreeCell, type FreeCell, type FreePlace } from './freecell.ts';

const S = 0;
const H = 1;
const C = 2;
const D = 3;
const c = (suit: number, rank: number): Card => cardOf(suit, rank);
const col = (index: number): FreePlace => ({ kind: 'column', index });
const cell = (index: number): FreePlace => ({ kind: 'cell', index });

function table(columns: Card[][], cells: (Card | null)[] = [null, null, null, null], foundations = [0, 0, 0, 0]): FreeCell {
  const all = [...columns];
  while (all.length < SOLITAIRE.freecell.columns) all.push([]);
  return { columns: all, cells, foundations, seed: 1, daily: null, history: [], hints: 0, ms: 0, done: false };
}

function solve(g: FreeCell, autoHome: boolean, budget = 200_000) {
  const solver = createFreeSolver(g, autoHome);
  let status = solver.run(budget);
  while (status === 'more' && solver.steps < budget) status = solver.run(budget);
  return { status, path: solver.path() };
}

function playOut(g: FreeCell, way: readonly FreeMove[], autoHome: boolean): FreeCell {
  let x = g;
  for (const m of way) {
    const next = moveCards(x, m.from, m.index, m.to, autoHome);
    expect(next).not.toBe(x);
    x = next;
  }
  return x;
}

describe('the solver', () => {
  it('finds a way that plays out to the end, with the cards going home by themselves or not', () => {
    for (const autoHome of [true, false]) {
      for (const seed of [1, 2, 3]) {
        const g = autoHome ? settleStart(freecellDeal(seed, 4)) : freecellDeal(seed, 4);
        const { status, path } = solve(g, autoHome);
        expect(status).toBe('won');
        expect(playOut(g, path, autoHome).done).toBe(true);
      }
    }
  });

  it('makes a way straight: the same end, not longer', () => {
    const g = settleStart(freecellDeal(11, 3));
    const { path } = solve(g, true);
    const straight = createFreeSolver(g, true).straighten(path);
    expect(straight.length).toBeLessThanOrEqual(path.length);
    expect(playOut(g, straight, true).done).toBe(true);
    // a way that wanders — a card from a free cell into an empty column and back — loses the detour
    const last = table([], [c(S, 13), null, null, null], [12, 13, 13, 13]);
    const wander: FreeMove[] = [
      { from: cell(0), index: 0, to: col(3) },
      { from: col(3), index: 0, to: cell(0) },
      { from: cell(0), index: 0, to: { kind: 'foundation', suit: S } },
    ];
    expect(playOut(last, wander, false).done).toBe(true);
    expect(createFreeSolver(last, false).straighten(wander)).toEqual([wander[2]]);
  });

  it('knows a position with no move at all is lost', () => {
    // both free cells full, no empty column, every card left black (nothing lies on another), the threes buried
    const g = table(
      [[c(S, 3), c(S, 13)], [c(C, 3), c(C, 13)], [c(S, 12)], [c(C, 12)], [c(S, 11)], [c(C, 11)], [c(S, 10)], [c(C, 10)]],
      [c(S, 9), c(C, 9)],
      [2, 13, 2, 13],
    );
    const solver = createFreeSolver(g, true);
    expect(solver.firstMove()).toBeNull();
    expect(solver.run(1000)).toBe('lost');
    expect(noFreeMove(g, true)).toBe(true);
  });
});

describe('deals', () => {
  it('can be won, with every number of free cells', () => {
    for (const cells of [4, 3, 2] as const) {
      const seed = finishTask(freecellWinnableSeed(500, cells));
      expect(seed).not.toBeNull();
      expect(solve(settleStart(freecellDeal(seed!, cells)), true).status).toBe('won');
    }
  });

  it('of the day are the same for everybody on a day, another for another day or number of cells', () => {
    expect(freecellDailySeed('2026-11-28', 4)).toBe(freecellDailySeed('2026-11-28', 4));
    expect(freecellDailySeed('2026-11-28', 4)).not.toBe(freecellDailySeed('2026-11-29', 4));
    expect(freecellDailySeed('2026-11-28', 4)).not.toBe(freecellDailySeed('2026-11-28', 3));
  });
});

describe('the hint', () => {
  it('leads a player who does only what it says to the end', () => {
    let g = settleStart(freecellDeal(21, 4));
    let way: FreeWay | null = null;
    for (let guard = 0; guard < 300 && !g.done; guard++) {
      const found: FreeHintFound = finishTask(freecellHintSearch(g, true, way));
      way = found.way;
      const h = found.hint;
      if (h.kind === 'finish') break;
      expect(h.kind).toBe('move');
      if (h.kind !== 'move') return;
      g = moveCards(g, h.from, h.index, h.to, true);
    }
    expect(g.done || finishTask(freecellHintSearch(g, true)).hint.kind === 'finish').toBe(true);
  });

  it('follows its way without a search, and drops it when the player leaves it', () => {
    const g = settleStart(freecellDeal(22, 4));
    const found = finishTask(freecellHintSearch(g, true));
    expect(found.way).not.toBeNull();
    const h = found.hint;
    if (h.kind !== 'move') throw new Error('a move was expected');
    const next = moveCards(g, h.from, h.index, h.to, true);
    expect(nextOnFreeWay(found.way!, next, true)).toBe(1);
    expect(nextOnFreeWay(found.way!, next, false)).toBeNull();
  });

  it('says "Зібрати все" when the rest goes home card by card', () => {
    const g = table([[c(S, 13), c(S, 12)], [c(H, 13)]], [c(H, 12), null, null, null], [11, 11, 13, 13]);
    expect(finishTask(freecellHintSearch(g, true)).hint).toEqual({ kind: 'finish' });
  });

  it('counts the moves to undo from a dead end to a position that can be won', () => {
    const { dead, from } = deadEnd();
    const found = finishTask(freecellHintSearch(dead, true));
    expect(found.hint.kind).toBe('stuck');
    if (found.hint.kind !== 'stuck') return;
    const back = found.hint.back;
    expect(back).not.toBeNull();
    let s = dead;
    for (let k = 0; k < back!; k++) s = undoFreeCell(s);
    expect(solve(s, true).status).toBe('won');
    expect(s.history.length).toBeGreaterThanOrEqual(from.history.length - 0);
  });
});

/**
 * A dead end reached by play: from a deal that can be won with two free cells, top cards go to the free cells at
 * random (seeded) until no move is left at all.
 */
function deadEnd(): { dead: FreeCell; from: FreeCell } {
  const from = settleStart(freecellDeal(finishTask(freecellWinnableSeed(77, 2))!, 2));
  let g = from;
  let state = 12345;
  for (let guard = 0; guard < 500; guard++) {
    if (noFreeMove(g, true)) return { dead: g, from };
    const r = nextInt(state, 64);
    state = r.state;
    const tops = g.columns.map((x, i) => ({ x, i })).filter(({ x }) => x.length > 0);
    const pick = tops[r.value % tops.length]!;
    const freeCell = g.cells.indexOf(null);
    const to = freeCell >= 0 ? cell(freeCell) : freeBestPlace(g, col(pick.i), pick.x.length - 1);
    const next = to ? moveCards(g, col(pick.i), pick.x.length - 1, to, true) : g;
    if (next === g) {
      // nothing from this column: any card with a place
      const any = g.columns.findIndex((x, i) => x.length > 0 && freeBestPlace(g, col(i), x.length - 1) !== null);
      if (any < 0) return { dead: g, from };
      g = moveCards(g, col(any), g.columns[any]!.length - 1, freeBestPlace(g, col(any), g.columns[any]!.length - 1)!, true);
    } else g = next;
  }
  throw new Error('no dead end reached');
}

describe('a dead end', () => {
  it('is looked for only when the player is plainly stuck: no move, or back where the table stood', () => {
    const g = settleStart(freecellDeal(31, 4));
    expect(freecellWorthChecking(g, true)).toBe(false);
    const top = g.columns[0]!.length - 1;
    const once = moveCards(g, col(0), top, cell(0), true);
    expect(cameBack(once)).toBe(false);
    // the card into an empty column and back into the same free cell: the table as after the first move
    const opened: FreeCell = { ...once, columns: once.columns.map((x, i) => (i === 7 ? [] : x)) };
    const there = moveCards(opened, cell(0), 0, col(7), true);
    const again = moveCards(there, col(7), 0, cell(0), true);
    expect(cameBack(again)).toBe(true);
    expect(freecellWorthChecking(again, true)).toBe(true);
  });

  it('carries to the positions reached from it by moves, not after an undo', () => {
    const g = settleStart(freecellDeal(32, 4));
    const one = moveCards(g, col(0), g.columns[0]!.length - 1, cell(0), true);
    const two = moveCards(one, col(1), one.columns[1]!.length - 1, cell(1), true);
    expect(freeCarried(one, 3, two)).toBe(4);
    expect(freeCarried(one, null, two)).toBeNull();
    expect(freeCarried(two, 3, undoFreeCell(two))).toBeUndefined();
  });
});

describe('a touch', () => {
  it('sends a card home first, then onto the longest run, then a single card into a free cell, then an empty column', () => {
    expect(freeBestPlace(table([[c(S, 1)]]), col(0), 0)).toEqual({ kind: 'foundation', suit: S });
    // a red seven and two black eights: the eight of clubs lies on a nine already — the longer run
    const runs = table([[c(D, 7)], [c(S, 8)], [c(H, 9), c(C, 8)]]);
    expect(freeBestPlace(runs, col(0), 0)).toEqual(col(2));
    // a card that fits nowhere: into the first empty free cell
    const lone = table([[c(H, 5)], [c(D, 9)]], [c(S, 2), null, null, null]);
    expect(freeBestPlace(lone, col(0), 0)).toEqual(cell(1));
    // two cards in order that fit nowhere: into an empty column
    const pair = table([[c(D, 3), c(S, 9), c(H, 8)], [c(D, 13)]]);
    expect(freeBestPlace(pair, col(0), 1)).toEqual(col(2));
    // a whole column gains nothing in another empty one
    const whole = table([[c(S, 9), c(H, 8)], [c(D, 3)]], [c(D, 4), c(D, 5), c(D, 6), c(D, 7)]);
    expect(freeBestPlace(whole, col(0), 0)).toBeNull();
  });

  it('says why nothing moves: not in order, or more than may move together', () => {
    const g = table([[c(S, 9), c(D, 7)], [c(H, 10)]]);
    expect(tapRefusal(g, col(0), 0)).toEqual({ kind: 'order' });
    const run = [c(S, 9), c(H, 8), c(C, 7), c(D, 6)];
    const full = table([run, [c(H, 10)], [c(S, 13)], [c(H, 13)], [c(C, 13)], [c(D, 13)], [c(S, 12)], [c(D, 12)]], [c(S, 1), c(H, 1), null, c(C, 1)]);
    expect(freeBestPlace(full, col(0), 0)).toBeNull();
    expect(tapRefusal(full, col(0), 0)).toEqual({ kind: 'too-many', most: 2, cells: 1, empty: 0 });
  });
});

describe('statistics', () => {
  it('are kept for each number of free cells', () => {
    const g = { ...freecellDeal(1, 3), done: true, ms: 5000, hints: 0 };
    const won = recordFreeCellWon(emptyFreeCellStats(), g);
    expect(won[3]).toEqual({ played: 1, won: 1, clean: 1, bestMs: 5000 });
    expect(won[4]).toEqual({ played: 0, won: 0, clean: 0, bestMs: null });
    const left = recordFreeCellLeft(won, { ...freecellDeal(2, 3), history: [{ from: col(0), to: cell(0), count: 1, auto: [] }] });
    expect(left[3].played).toBe(2);
    expect(recordFreeCellLeft(won, freecellDeal(2, 3))).toBe(won);
  });
});
