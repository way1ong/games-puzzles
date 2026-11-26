import { describe, expect, it } from 'vitest';
import { SOLITAIRE, type SpiderSuits } from '../config.ts';
import { cardOf } from './cards.ts';
import {
  SPIDER_DECK,
  canMoveRun,
  dealBlock,
  dealRow,
  faceOf,
  moveRun,
  runStart,
  spiderDeal,
  spiderRank,
  spiderSuit,
  undoSpider,
  type Spider,
  type SpiderCard,
} from './spider.ts';

const RULES = SOLITAIRE.spider;
/** A card of a pack (0…7) and a rank: with four suits the packs go spades, hearts, clubs, diamonds, twice. */
const C = (pack: number, rank: number): SpiderCard => pack * 13 + rank - 1;
const [S, H, Cl, D] = [0, 1, 2, 3];
/** A run of one pack from `high` down to `low`. */
const run = (pack: number, high: number, low: number): SpiderCard[] => Array.from({ length: high - low + 1 }, (_, i) => C(pack, high - i));

/** A made-up table: the top `ups[i]` cards of column i face up. Other cards need not all be there. */
function table(columns: SpiderCard[][], ups: number[], stock: SpiderCard[] = [], suits: SpiderSuits = 4, home: SpiderCard[][] = []): Spider {
  return { ...spiderDeal(1, suits), columns, down: columns.map((c, i) => c.length - ups[i]!), stock, home, history: [] };
}

/** Ten columns: the given ones first, then one card each (face up), so no column is empty. */
const ten = (cols: SpiderCard[][], fill: SpiderCard[] = [C(5, 2), C(5, 3), C(5, 4), C(5, 5), C(5, 6), C(5, 7), C(5, 8), C(5, 9), C(5, 10), C(5, 11)]) =>
  [...cols, ...fill.slice(cols.length).map((c) => [c])].slice(0, 10);

describe('the deal', () => {
  it('two decks: every card once — the columns as the rules deal them, the top face up, the rest the stock', () => {
    const g = spiderDeal(2024, 4);
    expect(g.columns.map((c) => c.length)).toEqual([...RULES.deal]);
    expect(g.down).toEqual(RULES.deal.map((n) => n - 1));
    const all = [...g.columns.flat(), ...g.stock];
    expect(all.length).toBe(SPIDER_DECK);
    expect(new Set(all).size).toBe(SPIDER_DECK);
    expect(g.stock.length).toBe(SPIDER_DECK - RULES.deal.reduce((a, b) => a + b, 0));
    expect(g.stock.length % RULES.columns).toBe(0);
  });

  it('the same seed gives the same deal on every device; another seed another one', () => {
    expect(spiderDeal(77, 2)).toEqual(spiderDeal(77, 2));
    expect(spiderDeal(77, 2).columns).not.toEqual(spiderDeal(78, 2).columns);
  });

  it('one suit — all spades; two — spades and hearts, half each; four — every suit, a quarter each', () => {
    const count = (suits: SpiderSuits) => {
      const n = [0, 0, 0, 0];
      for (let c = 0; c < SPIDER_DECK; c++) n[spiderSuit(c, suits)]! += 1;
      return n;
    };
    expect(count(1)).toEqual([SPIDER_DECK, 0, 0, 0]);
    expect(count(2)).toEqual([SPIDER_DECK / 2, SPIDER_DECK / 2, 0, 0]);
    expect(count(4)).toEqual([SPIDER_DECK / 4, SPIDER_DECK / 4, SPIDER_DECK / 4, SPIDER_DECK / 4]);
    // the face to draw: the four-suit queen of the third pack is the queen of clubs
    expect(faceOf(C(Cl, 12), 4)).toBe(cardOf(2, 12));
    expect(faceOf(C(Cl, 12), 1)).toBe(cardOf(0, 12));
    expect(spiderRank(C(7, 13))).toBe(13);
  });
});

describe('moves', () => {
  it('a card goes on any card one rank higher, of any suit, or on an empty column', () => {
    const g = table(ten([[C(S, 9)], [C(H, 8)], []]), [1, 1, 0, 1, 1, 1, 1, 1, 1, 1]);
    expect(canMoveRun(g, 4, 1, 0, 0)).toBe(true); // the eight of hearts on the nine of spades
    expect(canMoveRun(g, 4, 0, 0, 1)).toBe(false); // a nine on an eight
    expect(canMoveRun(g, 4, 1, 0, 2)).toBe(true); // onto the empty column
    expect(canMoveRun(g, 4, 1, 0, 1)).toBe(false); // onto itself
  });

  it('cards move together only as a run of one suit', () => {
    // nine of spades, eight of spades, seven of hearts: the seven alone moves, the eight with it does not
    const g = table(ten([[C(S, 9), C(S, 8), C(H, 7)], [C(D, 9)], [C(Cl, 8)], [C(D, 10)]]), [3, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(runStart(g, 4, 0)).toBe(2);
    // the eight goes on a nine by rank, but the seven of another suit lies on it
    expect(canMoveRun(g, 4, 0, 1, 1)).toBe(false);
    expect(canMoveRun(g, 4, 0, 2, 2)).toBe(true);
    // with one suit the same cards are one run: they move together
    expect(runStart(g, 1, 0)).toBe(0);
    expect(canMoveRun(g, 1, 0, 1, 1)).toBe(true);
    expect(canMoveRun(g, 1, 0, 0, 3)).toBe(true);
  });

  it('a face-down card is not part of a run, and turns up when it is uncovered; undo turns it down again', () => {
    const g = table(ten([[C(S, 4), C(S, 9)], [C(H, 10)]]), [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(canMoveRun(g, 4, 0, 0, 1)).toBe(false);
    const after = moveRun(g, 0, 1, 1);
    expect(after.columns[0]).toEqual([C(S, 4)]);
    expect(after.down[0]).toBe(0);
    expect(after.history.at(-1)).toMatchObject({ kind: 'move', flipped: true, count: 1 });
    const back = undoSpider(after);
    expect(back.columns).toEqual(g.columns);
    expect(back.down).toEqual(g.down);
    expect(back.history).toEqual([]);
  });

  it('a move that is not allowed changes nothing', () => {
    const g = table(ten([[C(S, 9)], [C(H, 7)]]), [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(moveRun(g, 1, 0, 0)).toBe(g);
  });
});

describe('a run from the king to the ace', () => {
  it('goes home by itself, the card under it turns up; undo brings it back', () => {
    // hearts from the king down to the two over a face-down card; the ace of hearts comes from another column
    const g = table(ten([[C(S, 5), ...run(H, 13, 2)], [C(D, 6), C(H, 1)]]), [12, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    const after = moveRun(g, 1, 1, 0);
    expect(after.home).toEqual([run(H, 13, 1)]);
    expect(after.columns[0]).toEqual([C(S, 5)]);
    expect(after.down[0]).toBe(0);
    // the column the ace came from turns its card up too
    expect(after.down[1]).toBe(0);
    const back = undoSpider(after);
    expect(back.columns).toEqual(g.columns);
    expect(back.down).toEqual(g.down);
    expect(back.home).toEqual([]);
  });

  it('of mixed suits stays, and so does one with a face-down card in it', () => {
    const mixed = [...run(H, 13, 8), C(S, 7), ...run(H, 6, 2)];
    const g = table(ten([mixed, [C(D, 6), C(H, 1)]]), [12, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    // the ace of hearts goes on the two of hearts, but the run is not of one suit
    expect(moveRun(g, 1, 1, 0).home).toEqual([]);
    expect(moveRun(g, 1, 1, 0).columns[0]!.length).toBe(13);
  });

  it('eight runs home win the game', () => {
    const home = Array.from({ length: RULES.runs - 1 }, (_, p) => run(p, 13, 1));
    const g = table(ten([run(7, 13, 2), [C(7, 1)]], []), [12, 1, 0, 0, 0, 0, 0, 0, 0, 0], [], 4, home);
    const last = moveRun({ ...g, columns: g.columns.slice(0, 2).concat(Array.from({ length: 8 }, () => [])) }, 1, 0, 0);
    expect(last.home.length).toBe(RULES.runs);
    expect(last.done).toBe(true);
  });
});

describe('the stock', () => {
  it('deals a card face up onto each column; undo puts them back', () => {
    const g = spiderDeal(9, 2);
    const after = dealRow(g);
    expect(after.stock.length).toBe(g.stock.length - RULES.columns);
    after.columns.forEach((col, i) => {
      expect(col.length).toBe(g.columns[i]!.length + 1);
      expect(col[col.length - 1]).toBe(g.stock[i]);
    });
    expect(after.down).toEqual(g.down);
    expect(undoSpider(after)).toEqual(g);
  });

  it('does not deal while a column is empty (the classic rule), nor when it is used up', () => {
    const g = table(ten([[C(S, 9)], []]), [1, 0, 1, 1, 1, 1, 1, 1, 1, 1], run(6, 13, 4));
    expect(dealBlock(g)).toBe('empty-column');
    expect(dealRow(g)).toBe(g);
    const none = table(ten([[C(S, 9)]]), [1, 1, 1, 1, 1, 1, 1, 1, 1, 1], []);
    expect(dealBlock(none)).toBe('empty-stock');
    expect(dealRow(none)).toBe(none);
  });

  it('five deals use the stock up', () => {
    let g = spiderDeal(3, 1);
    let deals = 0;
    while (dealBlock(g) === null) {
      g = dealRow(g);
      deals += 1;
    }
    expect(deals * RULES.columns).toBe(SPIDER_DECK - RULES.deal.reduce((a, b) => a + b, 0));
    expect(dealBlock(g)).toBe('empty-stock');
  });

  it('a run made whole by a deal goes home, and undo brings back both', () => {
    // the deal puts the ace of spades on the two: the run from the king is whole
    const stock = [C(S, 1), ...Array.from({ length: 9 }, (_, i) => C(4, i + 2))];
    const g = table(ten([[C(D, 9), ...run(S, 13, 2)]]), [12, 1, 1, 1, 1, 1, 1, 1, 1, 1], stock);
    const after = dealRow(g);
    expect(after.home).toEqual([run(S, 13, 1)]);
    expect(after.columns[0]).toEqual([C(D, 9)]);
    expect(after.history.at(-1)).toMatchObject({ kind: 'deal', runs: [{ column: 0, flipped: true }] });
    expect(undoSpider(after)).toEqual(g);
  });
});
