// Where everything of Spider lies on the table (docs/solitaire/SPEC.md, "Павук"): the size of a card and the place of
// every card, the stock and the runs gone home, for the room the table has. Two arrangements, as in Klondike
// (layout.ts): the runs home and the stock in a row above the ten columns (a phone upright, a computer), or at the
// sides of the columns (a phone on its side) — whichever gives larger cards with room for a long column. Columns lie
// closer the longer they are. Pure: sizes in, positions out (CSS pixels).
import { SOLITAIRE } from '../config.ts';
import type { SpiderCard, SpiderTable } from '../core/spider.ts';
import { columnSteps, type Arrangement, type Box, type CardSpot } from './layout.ts';

/** Spaces as shares of a card's width (C). */
const GAP = 0.1;
/** How far each next deal in the stock, and each next run home, lies from the one before: shares of a card (C). */
const STOCK_STEP = 0.18;
const HOME_STEP = 0.22;
/** The long column to make room for (C): a run of nine over five face-down cards; longer ones lie closer. */
const LONG_UP = 9;
const LONG_DOWN = 5;
const STRIP_UP = 0.27;
const STRIP_DOWN = 0.1;

const ratio = SOLITAIRE.card.height / SOLITAIRE.card.width;
const COLS = SOLITAIRE.spider.columns;
const RUNS = SOLITAIRE.spider.runs;
/** Deals in a full stock. */
const DEALS = (SOLITAIRE.spider.decks * SOLITAIRE.deck.suits * SOLITAIRE.deck.ranks - SOLITAIRE.spider.deal.reduce((a, b) => a + b, 0)) / COLS;

export interface SpiderLayout {
  arrangement: Arrangement;
  /** A card's width and height. */
  w: number;
  h: number;
  /** The place of the stock's lowest deal, and the step to each next one (the next deal to come lies on top). */
  stock: Box;
  stockStep: Box;
  /** The place of the first run home, and the step to each next one. */
  home: Box;
  homeStep: Box;
  /** Each column's top. */
  columns: Box[];
  /** Where each card lies, by its number. */
  cards: Map<SpiderCard, CardSpot>;
  /** The size the table takes. */
  width: number;
  height: number;
}

/** The card width each arrangement allows in the room. */
function widthFor(arrangement: Arrangement, room: { width: number; height: number }): number {
  const long = 1 + LONG_UP * STRIP_UP + LONG_DOWN * STRIP_DOWN;
  if (arrangement === 'top') {
    const across = COLS + (COLS - 1) * GAP;
    return Math.min(room.width / across, room.height / ((1 + GAP + long) * ratio));
  }
  // side: the runs home, the columns, the stock; the runs home one under another fit too
  const across = COLS + 2 + (COLS + 1) * GAP;
  const homes = (1 + (RUNS - 1) * HOME_STEP) * ratio;
  return Math.min(room.width / across, room.height / (long * ratio), room.height / homes);
}

export function chooseSpiderArrangement(room: { width: number; height: number }): Arrangement {
  return widthFor('side', room) > widthFor('top', room) ? 'side' : 'top';
}

export function laySpider(t: SpiderTable, room: { width: number; height: number }, arrangement = chooseSpiderArrangement(room)): SpiderLayout {
  const w = Math.floor(widthFor(arrangement, room) * 10) / 10;
  const h = w * ratio;
  const gap = w * GAP;
  const cards = new Map<SpiderCard, CardSpot>();
  const columns: Box[] = [];
  let stock: Box;
  let stockStep: Box;
  let home: Box;
  let homeStep: Box;
  let columnsTop: number;
  let firstColumn: number;
  let width: number;

  if (arrangement === 'top') {
    width = COLS * w + (COLS - 1) * gap;
    firstColumn = 0;
    columnsTop = h + gap;
    // the runs home from the left, the stock from the right towards them
    home = { x: 0, y: 0 };
    homeStep = { x: w * HOME_STEP * 2, y: 0 };
    stock = { x: width - w, y: 0 };
    stockStep = { x: -w * STOCK_STEP * 2, y: 0 };
  } else {
    width = (COLS + 2) * w + (COLS + 1) * gap;
    firstColumn = w + gap;
    columnsTop = 0;
    home = { x: 0, y: 0 };
    homeStep = { x: 0, y: h * HOME_STEP };
    stock = { x: width - w, y: 0 };
    stockStep = { x: 0, y: h * STOCK_STEP };
  }
  for (let i = 0; i < COLS; i++) columns.push({ x: firstColumn + i * (w + gap), y: columnsTop });

  // columns
  let z = 1;
  let bottom = columnsTop + h;
  t.columns.forEach((col, i) => {
    const steps = columnSteps(t.down[i]!, col.length - t.down[i]!, h, room.height - columnsTop);
    let y = columnsTop;
    col.forEach((card, k) => {
      const up = k >= t.down[i]!;
      cards.set(card, { x: columns[i]!.x, y, z: z++, up });
      if (k < col.length - 1) y += up ? steps.up : steps.down;
    });
    bottom = Math.max(bottom, y + h);
  });

  // the stock: each deal still in it, the next one on top (the first cards of the stock)
  const deals = Math.ceil(t.stock.length / COLS);
  for (let d = 0; d < deals; d++) {
    const lowest = deals - 1 - d; // the deal that comes next lies highest
    const at = { x: stock.x + lowest * stockStep.x, y: stock.y + lowest * stockStep.y };
    for (let k = d * COLS; k < Math.min(t.stock.length, (d + 1) * COLS); k++) cards.set(t.stock[k]!, { x: at.x, y: at.y, z: 500 + lowest, up: false });
  }

  // the runs home: each from its king down, the king on top
  t.home.forEach((run, r) => {
    const at = { x: home.x + r * homeStep.x, y: home.y + r * homeStep.y };
    run.forEach((card, k) => cards.set(card, { x: at.x, y: at.y, z: 600 + r * 20 + (run.length - k), up: true }));
  });

  const sideHeight = arrangement === 'side' ? Math.max(h + (RUNS - 1) * h * HOME_STEP, h + (DEALS - 1) * h * STOCK_STEP) : 0;
  const height = Math.max(room.height, bottom, sideHeight);
  return { arrangement, w, h, stock, stockStep, home, homeStep, columns, cards, width, height };
}
