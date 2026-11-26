import { describe, expect, it } from 'vitest';
import { SOLITAIRE } from '../config.ts';
import { SPIDER_DECK, spiderDeal, type Spider, type SpiderCard } from '../core/spider.ts';
import { laySpider } from './spider-layout.ts';

const COLS = SOLITAIRE.spider.columns;
const C = (pack: number, rank: number): SpiderCard => pack * 13 + rank - 1;

describe('the Spider table on the screen', () => {
  it('a phone upright: the runs home and the stock above the ten columns; every card has its place, in the room', () => {
    const g = spiderDeal(3, 2);
    const lay = laySpider(g, { width: 344, height: 420 });
    expect(lay.arrangement).toBe('top');
    expect(lay.cards.size).toBe(SPIDER_DECK);
    expect(lay.width).toBeLessThanOrEqual(344);
    expect(lay.columns).toHaveLength(COLS);
    // the top card of each column face up, the stock face down
    g.columns.forEach((col) => expect(lay.cards.get(col[col.length - 1]!)!.up).toBe(true));
    for (const card of g.stock) expect(lay.cards.get(card)!.up).toBe(false);
    // the next deal of the stock lies on top
    const next = lay.cards.get(g.stock[0]!)!;
    const last = lay.cards.get(g.stock[g.stock.length - 1]!)!;
    expect(next.z).toBeGreaterThan(last.z);
  });

  it('the larger cards of the two arrangements; a low wide room puts the runs home and the stock at the sides', () => {
    const g = spiderDeal(3, 2);
    for (const room of [
      { width: 344, height: 420 },
      { width: 735, height: 400 },
      { width: 576, height: 348 },
      { width: 735, height: 300 },
    ]) {
      const lay = laySpider(g, room);
      expect(lay.w).toBe(Math.max(laySpider(g, room, 'top').w, laySpider(g, room, 'side').w));
      expect(lay.width).toBeLessThanOrEqual(room.width);
      expect(lay.height).toBeLessThanOrEqual(room.height);
    }
    expect(laySpider(g, { width: 735, height: 300 }).arrangement).toBe('side');
  });

  it('a long column lies closer and still fits the room', () => {
    const long: SpiderCard[] = [];
    for (let r = 13; r >= 1; r--) long.push(C(0, r));
    for (let r = 13; r >= 6; r--) long.push(C(1, r));
    const g: Spider = { ...spiderDeal(3, 4), columns: [long, ...Array.from({ length: COLS - 1 }, (_, i) => [C(2, i + 1)])], down: [5, ...Array(COLS - 1).fill(0)], stock: [], home: [] };
    const room = { width: 344, height: 420 };
    const lay = laySpider(g, room);
    const bottom = Math.max(...long.map((c) => lay.cards.get(c)!.y)) + lay.h;
    expect(bottom).toBeLessThanOrEqual(room.height + 0.5);
  });

  it('a run home lies with its king on top, each next run beside the one before', () => {
    const run = (pack: number) => Array.from({ length: 13 }, (_, i) => C(pack, 13 - i));
    const g: Spider = { ...spiderDeal(3, 4), home: [run(0), run(1)] };
    const lay = laySpider(g, { width: 344, height: 420 });
    const king0 = lay.cards.get(C(0, 13))!;
    const ace0 = lay.cards.get(C(0, 1))!;
    expect(king0.z).toBeGreaterThan(ace0.z);
    expect(king0.up).toBe(true);
    expect(lay.cards.get(C(1, 13))!.x).toBeGreaterThan(king0.x);
  });
});
