// Klondike, «Косинка» (docs/solitaire/SPEC.md, "Косинка: як грати"): the deal, the moves, taking moves back, and
// finishing when nothing is left to choose. Pure functions: a state in, a new state out; the screen only shows it.
//
// The stock and the waste are one row, `talon`: the waste is talon[0, pos) with its top at pos − 1, the stock is
// talon[pos, …), turned from its start. Turning the waste over when the stock is empty only sets pos to 0 — the
// cards keep their order, as with a real deck.
import { SOLITAIRE, type Draw } from '../config.ts';
import { DECK, KING, isRed, rankOf, shuffledDeck, suitOf, type Card } from './cards.ts';

/** A place on the table: a column (counted from the left), the waste, a foundation (by suit). */
export type Place = { kind: 'column'; index: number } | { kind: 'waste' } | { kind: 'foundation'; suit: number };

export interface Table {
  /** Columns, cards from the bottom up; the first `down[i]` of column i lie face down. */
  columns: Card[][];
  down: number[];
  talon: Card[];
  pos: number;
  /** Cards of the last turn of the stock still on top of the waste (the screen fans them out). */
  fan: number;
  /** The top rank on each foundation, by suit (0 — none yet). */
  foundations: number[];
}

/** A step that can be taken back. */
export type Step =
  | { kind: 'draw'; pos: number; fan: number }
  | { kind: 'move'; from: Place; to: Place; count: number; flipped: boolean; fan: number };

export interface Klondike extends Table {
  draw: Draw;
  /** The seed the deal was made from. */
  seed: number;
  /** The day of the deal of the day ("YYYY-MM-DD"); null — an ordinary deal. */
  daily: string | null;
  history: Step[];
  hints: number;
  /** Time played, in milliseconds. */
  ms: number;
  done: boolean;
}

/** The deal of a seed: column i gets i + 1 cards, its top one face up; the rest is the stock. */
export function deal(seed: number, draw: Draw, daily: string | null = null): Klondike {
  const deck = shuffledDeck(seed);
  const columns: Card[][] = [];
  let next = 0;
  for (let i = 0; i < SOLITAIRE.klondike.columns; i++) {
    columns.push(deck.slice(next, next + i + 1));
    next += i + 1;
  }
  return {
    columns,
    down: columns.map((c) => c.length - 1),
    talon: deck.slice(next),
    pos: 0,
    fan: 0,
    foundations: Array.from({ length: SOLITAIRE.deck.suits }, () => 0),
    draw,
    seed,
    daily,
    history: [],
    hints: 0,
    ms: 0,
    done: false,
  };
}

export const wasteTop = (t: Table): Card | null => (t.pos > 0 ? t.talon[t.pos - 1]! : null);
export const stockLeft = (t: Table): number => t.talon.length - t.pos;

/** Whether a card may lie on another in a column: one rank lower, the other colour. */
export const fitsOn = (card: Card, under: Card): boolean => rankOf(under) === rankOf(card) + 1 && isRed(under) !== isRed(card);

/** Whether a card goes onto its foundation now. */
export const fitsFoundation = (t: Table, card: Card): boolean => t.foundations[suitOf(card)] === rankOf(card) - 1;

/** Whether cards (the first lowest in the pile) may be put on a column. */
export function fitsColumn(t: Table, cards: readonly Card[], column: number): boolean {
  const col = t.columns[column]!;
  const first = cards[0]!;
  return col.length === 0 ? rankOf(first) === KING : col.length > t.down[column]! && fitsOn(first, col[col.length - 1]!);
}

/** Cards in order on a column from `index` up: each one rank lower than the one under it, the colours taking turns. */
function inOrder(cards: readonly Card[]): boolean {
  for (let i = 1; i < cards.length; i++) if (!fitsOn(cards[i]!, cards[i - 1]!)) return false;
  return true;
}

/** The cards that would move from a place (from `index` up, for a column); null if they cannot move together. */
export function movingCards(t: Table, from: Place, index = 0): Card[] | null {
  if (from.kind === 'waste') return t.pos > 0 ? [t.talon[t.pos - 1]!] : null;
  if (from.kind === 'foundation') {
    const rank = t.foundations[from.suit]!;
    return rank > 0 ? [from.suit * SOLITAIRE.deck.ranks + rank - 1] : null;
  }
  const col = t.columns[from.index]!;
  if (index < t.down[from.index]! || index >= col.length) return null;
  const cards = col.slice(index);
  return inOrder(cards) ? cards : null;
}

/** Whether the cards from a place may go to another place now. */
export function canMove(t: Table, from: Place, index: number, to: Place): boolean {
  const cards = movingCards(t, from, index);
  if (!cards) return false;
  if (to.kind === 'waste') return false;
  if (to.kind === 'foundation') return cards.length === 1 && suitOf(cards[0]!) === to.suit && fitsFoundation(t, cards[0]!);
  if (from.kind === 'column' && from.index === to.index) return false;
  return fitsColumn(t, cards, to.index);
}

const copyTable = (t: Klondike): Klondike => ({
  ...t,
  columns: t.columns.map((c) => [...c]),
  down: [...t.down],
  talon: [...t.talon],
  foundations: [...t.foundations],
});

const allHome = (t: Table): boolean => t.foundations.every((rank) => rank === KING);

/** Turns cards from the stock (one or three), or the waste over when the stock is empty. Unchanged if both are empty. */
export function drawCards(g: Klondike): Klondike {
  if (g.done || g.talon.length === 0) return g;
  const step: Step = { kind: 'draw', pos: g.pos, fan: g.fan };
  if (g.pos < g.talon.length) {
    const pos = Math.min(g.pos + g.draw, g.talon.length);
    return { ...g, pos, fan: pos - g.pos, history: [...g.history, step] };
  }
  return { ...g, pos: 0, fan: 0, history: [...g.history, step] };
}

/** Moves cards (from `index` up, for a column) to another place; the card left on top of a column turns face up. */
export function moveCards(g: Klondike, from: Place, index: number, to: Place): Klondike {
  if (g.done || !canMove(g, from, index, to)) return g;
  const next = copyTable(g);
  let cards: Card[];
  let flipped = false;
  let fan = g.fan;
  if (from.kind === 'waste') {
    cards = next.talon.splice(next.pos - 1, 1);
    next.pos -= 1;
    next.fan = Math.max(0, g.fan - 1);
  } else if (from.kind === 'foundation') {
    cards = [from.suit * SOLITAIRE.deck.ranks + next.foundations[from.suit]! - 1];
    next.foundations[from.suit]! -= 1;
  } else {
    const col = next.columns[from.index]!;
    cards = col.splice(index);
    if (col.length > 0 && next.down[from.index] === col.length) {
      next.down[from.index]! -= 1;
      flipped = true;
    }
  }
  if (to.kind === 'foundation') next.foundations[to.suit] = rankOf(cards[0]!);
  else if (to.kind === 'column') next.columns[to.index]!.push(...cards);
  next.history = [...g.history, { kind: 'move', from, to, count: cards.length, flipped, fan }];
  next.done = allHome(next);
  return next;
}

/** Takes the last step back (a turn of the stock, or a move with the card it turned face up). */
export function undo(g: Klondike): Klondike {
  const last = g.history.at(-1);
  if (!last) return g;
  const next = copyTable(g);
  next.history = g.history.slice(0, -1);
  next.done = false;
  if (last.kind === 'draw') {
    next.pos = last.pos;
    next.fan = last.fan;
    return next;
  }
  let cards: Card[];
  if (last.to.kind === 'foundation') {
    const rank = next.foundations[last.to.suit]!;
    cards = [last.to.suit * SOLITAIRE.deck.ranks + rank - 1];
    next.foundations[last.to.suit] = rank - 1;
  } else if (last.to.kind === 'column') {
    cards = next.columns[last.to.index]!.splice(-last.count);
  } else return g;
  if (last.from.kind === 'waste') {
    next.talon.splice(next.pos, 0, cards[0]!);
    next.pos += 1;
  } else if (last.from.kind === 'foundation') {
    next.foundations[last.from.suit] = rankOf(cards[0]!);
  } else {
    if (last.flipped) next.down[last.from.index]! += 1;
    next.columns[last.from.index]!.push(...cards);
  }
  next.fan = last.fan;
  return next;
}

/** Whether no card in the columns lies face down any more. */
export const allOpen = (t: Table): boolean => t.down.every((d) => d === 0);

/**
 * The next step of finishing by itself: the lowest card that can go onto its foundation from a column top or the
 * waste; when none can, a turn of the stock. Null — nothing to do.
 */
export function finishStep(t: Table): { from: Place; index: number; to: Place } | 'draw' | null {
  let best: { from: Place; index: number; card: Card } | null = null;
  const consider = (from: Place, index: number, card: Card | undefined) => {
    if (card === undefined || !fitsFoundation(t, card)) return;
    if (!best || rankOf(card) < rankOf(best.card)) best = { from, index, card };
  };
  t.columns.forEach((col, i) => consider({ kind: 'column', index: i }, col.length - 1, col[col.length - 1]));
  if (t.pos > 0) consider({ kind: 'waste' }, 0, t.talon[t.pos - 1]);
  if (best) {
    const b: { from: Place; index: number; card: Card } = best;
    return { from: b.from, index: b.index, to: { kind: 'foundation', suit: suitOf(b.card) } };
  }
  return t.talon.length > 0 ? 'draw' : null;
}

/**
 * Whether the rest can be put on the foundations without a choice (SPEC, "«Зібрати все»"): no card face down in
 * the columns, and finishing by itself gets every card home. With three cards a turn this is tried out, since a card
 * of the stock is not always reachable.
 */
export function canFinish(g: Klondike): boolean {
  if (g.done || !allOpen(g)) return false;
  let t: Klondike = { ...copyTable(g), history: [] };
  // Each pass through the stock gets at least one card home, or nothing more will: a bound on the steps.
  for (let guard = 0; guard < DECK * (t.talon.length + 3); guard++) {
    if (allHome(t)) return true;
    const step = finishStep(t);
    if (!step) return false;
    t = step === 'draw' ? drawCards(t) : moveCards(t, step.from, step.index, step.to);
  }
  return allHome(t);
}

/** Time played, added while the game is on the screen. */
export function addTime(g: Klondike, ms: number): Klondike {
  return g.done || ms <= 0 ? g : { ...g, ms: g.ms + ms };
}

/** A hint given: counted. */
export function countHint(g: Klondike): Klondike {
  return { ...g, hints: g.hints + 1 };
}
