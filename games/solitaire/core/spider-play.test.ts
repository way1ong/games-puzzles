// Spider beyond the rules: deals that can be won, the deal of the day, the hint, where a touched card goes, the
// dead end, the statistics.
import { describe, expect, it } from 'vitest';
import { SOLITAIRE } from '../config.ts';
import { finishTask } from './deals.ts';
import { spiderChecked, spiderDailySeed, spiderWinnableSeed } from './spider-deals.ts';
import { nextOnWay, spiderHintSearch, type SpiderHint, type SpiderHintFound, type SpiderWay } from './spider-hint.ts';
import { spiderSearch } from './spider-search.ts';
import { createSpiderSolver, type SpiderMove } from './spider-solve.ts';
import { emptySpiderStats, recordSpiderLeft, recordSpiderWon } from './spider-stats.ts';
import { spiderStuck } from './spider-stuck.ts';
import { spiderBestPlace } from './spider-tap.ts';
import { dealRow, moveRun, spiderDeal, undoSpider, type Spider, type SpiderCard } from './spider.ts';

const C = (pack: number, rank: number): SpiderCard => pack * 13 + rank - 1;
const run = (pack: number, high: number, low: number): SpiderCard[] => Array.from({ length: high - low + 1 }, (_, i) => C(pack, high - i));

function follow(g: Spider, hint: SpiderHint): Spider {
  let next: Spider | null = null;
  if (hint.kind === 'deal') next = dealRow(g);
  if (hint.kind === 'move') next = moveRun(g, hint.from, hint.index, hint.to);
  if (next === null || next === g) throw new Error(`not a move that can be made: ${JSON.stringify(hint)}`);
  return next;
}

const wins = (g: Spider) => finishTask(spiderSearch(g, g.suits, 50_000, 6)).status === 'won';

describe('deals that can be won', () => {
  it('with one and two suits: the seed found is one the solver wins; a deal it cannot win in time is passed over', () => {
    // seeds whose deals the search for a deal does not win in its time (found by trying)
    for (const [suits, notWon] of [
      [1, 14],
      [2, 11],
    ] as const) {
      expect(spiderChecked(suits)).toBe(true);
      const seed = finishTask(spiderWinnableSeed(notWon, suits));
      expect(seed).not.toBeNull();
      expect(seed).not.toBe(notWon);
      expect(wins(spiderDeal(seed!, suits))).toBe(true);
    }
  });

  it('with four suits: any deal, as the cards fall (decision of 26.11) — the seed itself', () => {
    expect(spiderChecked(4)).toBe(false);
    expect(finishTask(spiderWinnableSeed(4242, 4))).toBe(4242);
  });

  it('the deal of the day: the same for the same day and suits, another for another day or other suits', () => {
    expect(spiderDailySeed('2026-11-26', 1)).toBe(spiderDailySeed('2026-11-26', 1));
    expect(spiderDailySeed('2026-11-26', 1)).not.toBe(spiderDailySeed('2026-11-27', 1));
    expect(spiderDailySeed('2026-11-26', 1)).not.toBe(spiderDailySeed('2026-11-26', 2));
  });
});

describe('the hint', () => {
  it('leads a player who does only what it says through a deal to the end, never back to where they have been', () => {
    // the first two deals: a hint found afresh at each position went round in a circle there (found 26.11); the third
    // with two suits
    for (const [seed, suits] of [
      [55433, 1],
      [118785, 1],
      [126704, 2],
    ] as const) {
      let g = spiderDeal(seed, suits);
      let way: SpiderWay | null = null;
      const been = new Set<string>();
      for (let i = 0; i < 400 && !g.done; i++) {
        const at = JSON.stringify([g.columns, g.down, g.stock.length]);
        expect(been.has(at)).toBe(false);
        been.add(at);
        const found: SpiderHintFound = finishTask(spiderHintSearch(g, way));
        expect(['move', 'deal']).toContain(found.hint.kind);
        way = found.way;
        g = follow(g, found.hint);
      }
      expect(g.done).toBe(true);
    }
  });

  it('makes the way straight: the line the search went down becomes a short way to the same end', () => {
    const g = spiderDeal(118785, 1);
    const found = finishTask(spiderSearch(g, 1, SOLITAIRE.spider.solve.hint, SOLITAIRE.spider.solve.attempts));
    if (found.status !== 'won') throw new Error(found.status);
    const straight = createSpiderSolver(g, 1).straighten(found.path);
    // the search wandered for thousands of moves; a game is about a hundred and some
    expect(found.path.length).toBeGreaterThan(1000);
    expect(straight.length).toBeLessThan(300);
    expect(straight.reduce(follow, g).done).toBe(true);
  });

  it('keeps its way: the next hint on it comes at once; off it, a search; undone back onto it, the way again', () => {
    const g0 = spiderDeal(55433, 1);
    const first = finishTask(spiderHintSearch(g0));
    const way = first.way!;
    expect(way.moves[0]).toEqual(first.hint);
    const g1 = follow(g0, first.hint);
    // at once: in the first slice, with no search
    expect(spiderHintSearch(g1, way).run(1)).toEqual({ hint: way.moves[1], way });
    const g2 = follow(g1, way.moves[1]!);
    expect(nextOnWay(way, g2)).toBe(2);
    expect(nextOnWay(way, undoSpider(g2))).toBe(1);
    expect(nextOnWay(way, spiderDeal(55434, 1))).toBeNull();
    expect(spiderHintSearch(spiderDeal(55434, 1), way).run(1)).toBeUndefined();
  });

  it('a move given without a way found does not lead back to where the game has just been', () => {
    // one suit: the six was moved off the run 10…7 onto the lone seven; the first move the solver would try puts it back
    const t = (columns: SpiderCard[][], down: number[]): Spider => ({ ...spiderDeal(1, 1), columns, down, stock: [], home: [], history: [] });
    const before = t(
      [
        [C(0, 12), C(0, 7)],
        [C(1, 3), C(1, 10), C(1, 9), C(1, 8), C(1, 7), C(1, 6)],
        [C(2, 5), C(2, 11), C(2, 10)],
      ],
      [1, 1, 1],
    );
    const after = moveRun(before, 1, 5, 0);
    expect(after).not.toBe(before);
    const back: SpiderMove = { kind: 'move', from: 0, index: 2, to: 1 };
    expect(createSpiderSolver(after, 1).firstMove()).toEqual(back);
    expect(createSpiderSolver(after, 1, 0, [before]).firstMove()).toEqual({ kind: 'move', from: 1, index: 2, to: 2 });
    // if every move leads back (here, both there are), the first one all the same
    const other = moveRun(after, 1, 2, 2);
    expect(other).not.toBe(after);
    expect(createSpiderSolver(after, 1, 0, [before, other]).firstMove()).toEqual(back);
  });

  it('when no way is left, tells how many moves to undo — to a position that can be won', () => {
    // every card face up, six runs home, one empty column: the five of diamonds put into it leaves no move at all
    const home = Array.from({ length: 6 }, (_, p) => run(p, 13, 1));
    const columns = [
      [C(7, 12), C(6, 13)],
      [C(6, 12), C(7, 13)],
      [C(7, 10), C(6, 11)],
      [C(6, 10), C(7, 11)],
      [C(7, 8), C(6, 9)],
      [C(6, 8), C(7, 9)],
      [C(7, 6), C(6, 7)],
      [C(6, 6), C(7, 7)],
      [...run(7, 4, 1), ...run(6, 4, 1), C(6, 5), C(7, 5)],
      [],
    ];
    const before: Spider = { ...spiderDeal(1, 4), columns, down: columns.map(() => 0), stock: [], home, history: [] };
    expect(wins(before)).toBe(true);
    const after = moveRun(before, 8, 9, 9);
    expect(after).not.toBe(before);
    expect(finishTask(spiderSearch(after, 4, 200_000, 1)).status).toBe('lost');
    expect(finishTask(spiderHintSearch(after)).hint).toEqual({ kind: 'stuck', back: 1 });
  });
});

describe('a touched card', () => {
  const table = (columns: SpiderCard[][], ups: number[]): Spider => ({ ...spiderDeal(1, 4), columns, down: columns.map((c, i) => c.length - ups[i]!), stock: [], home: [] });

  it('goes onto its own suit first — the longest run of it — then any suit, then an empty column', () => {
    // the seven of hearts; eights: of spades, of hearts alone, of hearts under a nine of hearts
    const t = table([[C(0, 3), C(1, 7)], [C(0, 8)], [C(1, 8)], [C(1, 9), C(5, 8)], []], [1, 1, 1, 2, 0]);
    expect(spiderBestPlace(t, 4, 0, 1)).toBe(3);
    const noHearts = table([[C(0, 3), C(1, 7)], [C(0, 8)], [], [C(2, 2)]], [1, 1, 0, 1]);
    expect(spiderBestPlace(noHearts, 4, 0, 1)).toBe(1);
    const onlyEmpty = table([[C(0, 3), C(1, 7)], [C(0, 2)], []], [1, 1, 0]);
    expect(spiderBestPlace(onlyEmpty, 4, 0, 1)).toBe(2);
  });

  it('goes nowhere when nothing takes it, a card under a run of another suit does not move, a lone column stays', () => {
    const t = table([[C(0, 3), C(1, 7)], [C(0, 2)]], [1, 1]);
    expect(spiderBestPlace(t, 4, 0, 1)).toBeNull();
    // eight of spades under the seven of hearts: not one run
    const mixed = table([[C(0, 8), C(1, 7)], [C(2, 9)]], [2, 1]);
    expect(spiderBestPlace(mixed, 4, 0, 0)).toBeNull();
    // a king alone in its column: an empty column gains it nothing
    const alone = table([[C(0, 13)], []], [1, 0]);
    expect(spiderBestPlace(alone, 4, 0, 0)).toBeNull();
  });
});

describe('the dead end', () => {
  it('is seen when the stock is dealt and no move leads anywhere', () => {
    const home = Array.from({ length: 6 }, (_, p) => run(p, 13, 1));
    const columns = [[...run(6, 13, 3), C(7, 13)], [C(6, 2), C(7, 1)], [...run(7, 12, 2), C(6, 1)]];
    const g: Spider = { ...spiderDeal(1, 4), columns, down: [11, 1, 11], stock: [], home };
    expect(spiderStuck(g)).toBe(true);
    expect(finishTask(spiderHintSearch(g)).hint).toEqual({ kind: 'stuck', back: null });
  });

  it('is not seen while the stock can be dealt, nor on a fresh deal', () => {
    const g = spiderDeal(5, 1);
    expect(spiderStuck(g)).toBe(false);
    const columns = [[...run(6, 13, 3), C(7, 13)], [C(6, 2), C(7, 1)], [...run(7, 12, 2), C(6, 1)]];
    const withStock: Spider = { ...g, columns, down: [11, 1, 11], stock: run(0, 13, 4), home: [] };
    expect(spiderStuck(withStock)).toBe(false);
  });

  it('is seen with the stock left when an empty column cannot be filled: the stock may not be dealt then', () => {
    // a lone king and an empty column: moving the king leaves another empty column
    const g: Spider = { ...spiderDeal(5, 4), columns: [[C(7, 13)], []], down: [0, 0], stock: run(0, 13, 4), home: [] };
    expect(spiderStuck(g)).toBe(true);
  });
});

describe('statistics', () => {
  it('count each number of suits apart: played, won, without hints, the best time', () => {
    const g = { ...spiderDeal(1, 2), ms: 5000 };
    let stats = recordSpiderWon(emptySpiderStats(), g);
    stats = recordSpiderWon(stats, { ...g, hints: 2, ms: 3000 });
    stats = recordSpiderLeft(stats, { ...g, history: [{ kind: 'deal', runs: [] }] });
    expect(stats[2]).toEqual({ played: 3, won: 2, clean: 1, bestMs: 3000 });
    expect(stats[1]).toEqual({ played: 0, won: 0, clean: 0, bestMs: null });
    // a deal left with no move made is not counted
    expect(recordSpiderLeft(stats, g)).toBe(stats);
    expect(SOLITAIRE.spider.checked).not.toContain(4);
  });
});
