import { describe, expect, it } from 'vitest';
import { FREE_CELLS, SOLITAIRE } from '../config.ts';
import { cardOf, DECK, type Card } from '../core/cards.ts';
import { freecellDeal, type FreeCell } from '../core/freecell.ts';
import { layFreeCell } from './freecell-layout.ts';

const COLS = SOLITAIRE.freecell.columns;

describe('the FreeCell table on the screen', () => {
  it('a phone upright: the free cells on the left and the foundations on the right above the eight columns', () => {
    for (const cells of FREE_CELLS) {
      const g = freecellDeal(3, cells);
      const lay = layFreeCell(g, { width: 344, height: 420 });
      expect(lay.arrangement).toBe('top');
      expect(lay.cards.size).toBe(DECK);
      expect(lay.width).toBeLessThanOrEqual(344);
      expect(lay.cells).toHaveLength(cells);
      expect(lay.columns).toHaveLength(COLS);
      expect(lay.cells[0]!.x).toBe(lay.columns[0]!.x);
      expect(lay.foundations[3]!.x).toBe(lay.columns[COLS - 1]!.x);
      // the row above the columns: no card of a column reaches up into it
      expect(Math.min(...lay.columns.map((c) => c.y))).toBeGreaterThanOrEqual(lay.h);
    }
  });

  it('the larger cards of the two arrangements; a low wide room puts the cells and the foundations at the sides', () => {
    const g = freecellDeal(3, 4);
    for (const room of [
      { width: 344, height: 420 },
      { width: 735, height: 400 },
      { width: 576, height: 348 },
      { width: 735, height: 300 },
    ]) {
      const lay = layFreeCell(g, room);
      expect(lay.w).toBe(Math.max(layFreeCell(g, room, 'top').w, layFreeCell(g, room, 'side').w));
      expect(lay.width).toBeLessThanOrEqual(room.width);
      expect(lay.height).toBeLessThanOrEqual(room.height);
    }
    const side = layFreeCell(g, { width: 735, height: 300 });
    expect(side.arrangement).toBe('side');
    expect(side.cells.every((c) => c.x === 0)).toBe(true);
    expect(side.foundations.every((f) => f.x === side.width - side.w)).toBe(true);
    expect(Math.max(...side.foundations.map((f) => f.y)) + side.h).toBeLessThanOrEqual(300 + 0.5);
  });

  it('a long column lies closer and still fits the room', () => {
    const long: Card[] = [];
    for (let r = 13; r >= 1; r--) long.push(cardOf(r % 2 === 0 ? 0 : 1, r));
    for (let r = 13; r >= 8; r--) long.push(cardOf(r % 2 === 0 ? 2 : 3, r));
    const g: FreeCell = { ...freecellDeal(3, 4), columns: [long, ...Array.from({ length: COLS - 1 }, () => [])] };
    const room = { width: 344, height: 420 };
    const lay = layFreeCell(g, room);
    const bottom = Math.max(...long.map((c) => lay.cards.get(c)!.y)) + lay.h;
    expect(bottom).toBeLessThanOrEqual(room.height + 0.5);
  });

  it('cards in the free cells and on the foundations lie at their places, a foundation\'s top card uppermost', () => {
    const g: FreeCell = { ...freecellDeal(3, 4), columns: Array.from({ length: COLS }, () => []), cells: [cardOf(1, 7), null, null, null], foundations: [3, 0, 0, 0] };
    const lay = layFreeCell(g, { width: 344, height: 420 });
    expect(lay.cards.get(cardOf(1, 7))).toMatchObject({ x: lay.cells[0]!.x, y: lay.cells[0]!.y });
    expect(lay.cards.get(cardOf(0, 3))!.z).toBeGreaterThan(lay.cards.get(cardOf(0, 1))!.z);
    expect(lay.cards.get(cardOf(0, 3))).toMatchObject({ x: lay.foundations[0]!.x, y: lay.foundations[0]!.y });
  });
});
