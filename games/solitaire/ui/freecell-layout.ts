// Where everything of FreeCell lies on the table (docs/solitaire/SPEC.md, "Вільні клітинки"): the size of a card and the
// place of every card, free cell and foundation, for the room the table has. Two arrangements, as in Klondike
// (layout.ts): the free cells (on the left) and the foundations (on the right) in a row above the eight columns (a
// phone upright, a computer), or at the sides of the columns, one under another (a phone on its side) — whichever gives
// larger cards with room for a long column. Columns lie closer the longer they are. Pure: sizes in, positions out
// (CSS pixels).
import { SOLITAIRE } from '../config.ts';
import { cardOf, type Card } from '../core/cards.ts';
import type { FreeTable } from '../core/freecell.ts';
import { columnSteps, type Arrangement, type Box, type CardSpot } from './layout.ts';

/** Spaces as shares of a card's width (C). */
const GAP = 0.1;
/** The long column to make room for (C): the seven cards dealt and a run of five on them; longer ones lie closer. */
const LONG = 12;
const STRIP = 0.27;

const ratio = SOLITAIRE.card.height / SOLITAIRE.card.width;
const COLS = SOLITAIRE.freecell.columns;
const SUITS = SOLITAIRE.deck.suits;

export interface FreeLayout {
  arrangement: Arrangement;
  /** A card's width and height. */
  w: number;
  h: number;
  cells: Box[];
  foundations: Box[];
  /** Each column's top. */
  columns: Box[];
  /** Where each card lies. */
  cards: Map<Card, CardSpot>;
  /** The size the table takes. */
  width: number;
  height: number;
}

/** The card width each arrangement allows in the room. */
function widthFor(arrangement: Arrangement, room: { width: number; height: number }, cells: number): number {
  const long = 1 + (LONG - 1) * STRIP;
  if (arrangement === 'top') {
    const across = COLS + (COLS - 1) * GAP;
    return Math.min(room.width / across, room.height / ((1 + GAP + long) * ratio));
  }
  // side: the cells' column, the columns, the foundations' column — four places one under another fit too
  const across = COLS + 2 + (COLS + 1) * GAP + 2 * GAP;
  const stack = Math.max(SUITS, cells) * (ratio + 0.6 * GAP);
  return Math.min(room.width / across, room.height / (long * ratio), room.height / stack);
}

export function chooseFreeArrangement(room: { width: number; height: number }, cells: number): Arrangement {
  return widthFor('side', room, cells) > widthFor('top', room, cells) ? 'side' : 'top';
}

export function layFreeCell(t: FreeTable, room: { width: number; height: number }, arrangement = chooseFreeArrangement(room, t.cells.length)): FreeLayout {
  const cellCount = t.cells.length;
  const w = Math.floor(widthFor(arrangement, room, cellCount) * 10) / 10;
  const h = w * ratio;
  const gap = w * GAP;
  const cards = new Map<Card, CardSpot>();
  const cells: Box[] = [];
  const foundations: Box[] = [];
  const columns: Box[] = [];
  let width: number;
  let sideHeight = 0;

  if (arrangement === 'top') {
    width = COLS * w + (COLS - 1) * gap;
    const x = (i: number) => i * (w + gap);
    for (let k = 0; k < cellCount; k++) cells.push({ x: x(k), y: 0 });
    for (let s = 0; s < SUITS; s++) foundations.push({ x: x(COLS - SUITS + s), y: 0 });
    for (let i = 0; i < COLS; i++) columns.push({ x: x(i), y: h + gap });
  } else {
    width = (COLS + 2) * w + (COLS + 1) * gap + 2 * gap;
    const step = h + gap * 0.6;
    for (let k = 0; k < cellCount; k++) cells.push({ x: 0, y: k * step });
    for (let s = 0; s < SUITS; s++) foundations.push({ x: width - w, y: s * step });
    for (let i = 0; i < COLS; i++) columns.push({ x: w + 2 * gap + i * (w + gap), y: 0 });
    sideHeight = Math.max(SUITS, cellCount) * step;
  }

  // columns
  let z = 1;
  let bottom = 0;
  t.columns.forEach((col, i) => {
    const top = columns[i]!;
    const steps = columnSteps(0, col.length, h, room.height - top.y);
    col.forEach((card, k) => {
      const y = top.y + k * steps.up;
      cards.set(card, { x: top.x, y, z: z++, up: true });
      bottom = Math.max(bottom, y + h);
    });
  });
  // free cells
  t.cells.forEach((card, k) => {
    if (card !== null) cards.set(card, { x: cells[k]!.x, y: cells[k]!.y, z: z++, up: true });
  });
  // foundations: each pile at its place, the top one last
  t.foundations.forEach((rank, s) => {
    for (let r = 1; r <= rank; r++) cards.set(cardOf(s, r), { x: foundations[s]!.x, y: foundations[s]!.y, z: z++, up: true });
  });

  const height = Math.max(room.height, bottom, arrangement === 'side' ? sideHeight : h);
  return { arrangement, w, h, cells, foundations, columns, cards, width, height };
}
