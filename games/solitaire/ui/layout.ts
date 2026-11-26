// Where everything lies on the table (docs/solitaire/SPEC.md, "Екрани й керування"): the size of a card and the place
// of every card and empty place, for the room the table has. Two arrangements: the stock, the waste and the
// foundations in a row above the columns (a phone upright, a computer), or at the sides of the columns (a phone on
// its side), whichever gives larger cards with room for a long column. Columns lie closer the longer they are.
// Pure: sizes in, positions out (CSS pixels).
import { SOLITAIRE } from '../config.ts';
import type { Card } from '../core/cards.ts';
import type { Table } from '../core/klondike.ts';

/** Spaces as shares of a card's width (gaps between places) or height (strips of cards in a column) (C). */
const GAP = 0.12;
const STRIP_UP = 0.27;
const STRIP_DOWN = 0.1;
const STRIP_DOWN_MIN = 0.05;
/**
 * The least strip of a face-up card under another face-up card, CSS px, while the column fits: a finger takes the
 * cards from there on, so it is a target of at least the WCAG 2.2 AA minimum (SPEC, "Екрани й керування").
 */
const STRIP_UP_MIN_PX = 24;
/** The waste's fan: how far each of the last turned cards lies from the one under it. */
const FAN = 0.32;
/**
 * The long column to make room for: a king down to a five, over six face-down cards. Longer ones (rare) lie closer
 * (columnSteps), so the cards can stay larger.
 */
const LONG_UP = 9;
const LONG_DOWN = 6;

export type Arrangement = 'top' | 'side';

export interface Box {
  x: number;
  y: number;
}

export interface CardSpot extends Box {
  /** Paint order: higher lies over lower. */
  z: number;
  up: boolean;
}

export interface TableLayout {
  arrangement: Arrangement;
  /** A card's width and height. */
  w: number;
  h: number;
  /** The places: the stock, the waste (next to the stock; its fan spreads away from it), each foundation, each column's top. */
  stock: Box;
  waste: Box;
  /** Which way the waste fans out from its place. */
  fan: 'left' | 'right' | 'down';
  foundations: Box[];
  columns: Box[];
  /** Where each card lies, by card number. */
  cards: Map<Card, CardSpot>;
  /** The size the table takes. */
  width: number;
  height: number;
}

const ratio = SOLITAIRE.card.height / SOLITAIRE.card.width;
const COLS = SOLITAIRE.klondike.columns;
const SUITS = SOLITAIRE.deck.suits;

/** The card width each arrangement allows in the room. */
function widthFor(arrangement: Arrangement, room: { width: number; height: number }): number {
  // a long column: the card itself, its strips
  const long = 1 + LONG_UP * STRIP_UP + LONG_DOWN * STRIP_DOWN;
  if (arrangement === 'top') {
    const across = COLS + (COLS - 1) * GAP;
    return Math.min(room.width / across, room.height / ((1 + GAP + long) * ratio));
  }
  // side: the stock's column, the columns, the foundations' column — the four foundations, one under another, fit too
  const across = COLS + 2 + (COLS + 1) * GAP + 2 * GAP;
  const homes = SUITS * (ratio + 0.6 * GAP);
  return Math.min(room.width / across, room.height / (long * ratio), room.height / homes);
}

export function chooseArrangement(room: { width: number; height: number }): Arrangement {
  return widthFor('side', room) > widthFor('top', room) ? 'side' : 'top';
}

/**
 * The steps between the cards of a column so that it fits in `space` (the height from its top down): face-up cards
 * at least STRIP_UP_MIN_PX apart while that fits; a column too long for it lies closer, the face-down cards first.
 */
export function columnSteps(down: number, up: number, h: number, space: number): { down: number; up: number } {
  let stepDown = STRIP_DOWN * h;
  let stepUp = Math.max(STRIP_UP * h, STRIP_UP_MIN_PX);
  const need = () => h + down * stepDown + Math.max(0, up - 1) * stepUp;
  if (need() > space) stepDown = STRIP_DOWN_MIN * h;
  if (need() > space && up > 1) stepUp = Math.max(0, (space - h - down * stepDown) / (up - 1));
  return { down: stepDown, up: stepUp };
}

export function layTable(t: Table, room: { width: number; height: number }, leftHand: boolean, arrangement = chooseArrangement(room)): TableLayout {
  const w = Math.floor(widthFor(arrangement, room) * 10) / 10;
  const h = w * ratio;
  const gap = w * GAP;
  const cards = new Map<Card, CardSpot>();
  let stock: Box;
  let waste: Box;
  let fan: 'left' | 'right' | 'down';
  const foundations: Box[] = [];
  const columns: Box[] = [];
  let columnsTop: number;
  let width: number;

  if (arrangement === 'top') {
    width = COLS * w + (COLS - 1) * gap;
    const x = (i: number) => i * (w + gap);
    columnsTop = h + gap;
    for (let s = 0; s < SUITS; s++) foundations.push({ x: x(leftHand ? COLS - SUITS + s : s), y: 0 });
    stock = { x: x(leftHand ? 0 : COLS - 1), y: 0 };
    // the waste next to the stock; its fan spreads towards the foundations
    waste = { x: x(leftHand ? 1 : COLS - 2), y: 0 };
    fan = leftHand ? 'right' : 'left';
    for (let i = 0; i < COLS; i++) columns.push({ x: x(i), y: columnsTop });
  } else {
    width = (COLS + 2) * w + (COLS + 1) * gap + 2 * gap;
    // the stock under the hand that plays: on the right, or on the left for the left hand
    const sideX = leftHand ? 0 : width - w;
    const homeX = leftHand ? width - w : 0;
    const firstColumn = w + 2 * gap;
    columnsTop = 0;
    stock = { x: sideX, y: 0 };
    waste = { x: sideX, y: h + gap };
    fan = 'down';
    for (let s = 0; s < SUITS; s++) foundations.push({ x: homeX, y: s * (h + gap * 0.6) });
    for (let i = 0; i < COLS; i++) columns.push({ x: firstColumn + i * (w + gap), y: 0 });
  }

  // columns
  let z = 1;
  let bottom = 0;
  t.columns.forEach((col, i) => {
    const space = room.height - columns[i]!.y;
    const steps = columnSteps(t.down[i]!, col.length - t.down[i]!, h, space);
    let y = columns[i]!.y;
    col.forEach((card, k) => {
      const up = k >= t.down[i]!;
      cards.set(card, { x: columns[i]!.x, y, z: z++, up });
      bottom = Math.max(bottom, y + h);
      y += up ? steps.up : steps.down;
    });
  });

  // the stock: all at its place, face down
  for (let k = t.talon.length - 1; k >= t.pos; k--) cards.set(t.talon[k]!, { x: stock.x, y: stock.y, z: z++, up: false });
  // the waste: the older cards under the fan's first place, the last turned ones fanned out
  const shown = Math.min(t.pos, Math.max(1, t.fan));
  for (let k = 0; k < t.pos; k++) {
    const inFan = Math.max(0, k - (t.pos - shown));
    const off = fan === 'down' ? { x: 0, y: inFan * STRIP_UP * h } : { x: (fan === 'right' ? 1 : -1) * inFan * FAN * w, y: 0 };
    cards.set(t.talon[k]!, { x: waste.x + off.x, y: waste.y + off.y, z: z++, up: true });
  }
  // foundations: each pile at its place, the top one last
  t.foundations.forEach((rank, s) => {
    for (let r = 1; r <= rank; r++) cards.set(s * SOLITAIRE.deck.ranks + r - 1, { x: foundations[s]!.x, y: foundations[s]!.y, z: z++, up: true });
  });

  const height = Math.max(room.height, bottom, arrangement === 'side' ? SUITS * (h + gap * 0.6) : columnsTop + h);
  return { arrangement, w, h, stock, waste, fan, foundations, columns, cards, width, height };
}
