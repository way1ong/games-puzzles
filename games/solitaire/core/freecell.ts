// FreeCell, «Вільні клітинки» (docs/solitaire/SPEC.md, "Вільні клітинки"): one deck, eight columns, every card face
// up; free cells that hold one card each (four, three or two); four foundations, each suit from the ace to the king.
// In the columns cards go down in alternating colours; cards in order move together — as many as could be moved one by
// one through the free cells and the empty columns; any card goes to an empty column; nothing comes back from a
// foundation. Cards no longer needed go home by themselves while the player keeps that on (decision of 28.11).
// Pure functions: a state in, a new state out; the screen only shows it.
import { FREE_CELLS, SOLITAIRE, type FreeCells } from '../config.ts';
import { KING, rankOf, shuffledDeck, suitOf, type Card } from './cards.ts';
import { fitsOn } from './klondike.ts';

const RULES = SOLITAIRE.freecell;
const RANKS = SOLITAIRE.deck.ranks;
const SUITS = SOLITAIRE.deck.suits;

/** A place on the table: a column or a free cell (counted from the left), a foundation (by suit). */
export type FreePlace = { kind: 'column'; index: number } | { kind: 'cell'; index: number } | { kind: 'foundation'; suit: number };

export interface FreeTable {
  /** Columns, cards from the bottom up; all face up. */
  columns: Card[][];
  /** The free cells: each empty (null) or holding one card. */
  cells: (Card | null)[];
  /** The top rank on each foundation, by suit (0 — none yet). */
  foundations: number[];
}

/** A card that went home by itself after a move, and where it came from (a column or a free cell). */
export interface AutoHome {
  from: FreePlace;
  card: Card;
}

/** A step that can be taken back: the move, and the cards that went home by themselves after it, in order. */
export interface FreeStep {
  from: FreePlace;
  to: FreePlace;
  count: number;
  auto: AutoHome[];
}

export interface FreeCell extends FreeTable {
  /** The seed the deal was made from. */
  seed: number;
  /** The day of the deal of the day ("YYYY-MM-DD"); null — an ordinary deal. */
  daily: string | null;
  history: FreeStep[];
  hints: number;
  /** Time played, in milliseconds. */
  ms: number;
  done: boolean;
}

/** How many free cells a game has. */
export const cellsOf = (t: FreeTable): FreeCells => (FREE_CELLS.find((n) => n === t.cells.length) ?? RULES.defaultCells);

/** The deal of a seed: RULES.deal cards to each column, one after another, all face up; the free cells empty. */
export function freecellDeal(seed: number, cells: FreeCells, daily: string | null = null): FreeCell {
  const deck = shuffledDeck(seed);
  const columns: Card[][] = [];
  let next = 0;
  for (const count of RULES.deal) {
    columns.push(deck.slice(next, next + count));
    next += count;
  }
  return {
    columns,
    cells: Array.from({ length: cells }, () => null),
    foundations: Array.from({ length: SUITS }, () => 0),
    seed,
    daily,
    history: [],
    hints: 0,
    ms: 0,
    done: false,
  };
}

/** Whether a card goes onto its foundation now. */
export const fitsHome = (t: FreeTable, card: Card): boolean => t.foundations[suitOf(card)] === rankOf(card) - 1;

/**
 * Whether a card that goes home now will never be wanted on the table again (decision of 28.11): an ace or a two, or a
 * card whose both cards of the other colour one rank lower are home already — nothing is left to lie on it. By the
 * foundations alone, so that the solver asks the same.
 */
export function homeForGood(foundations: readonly number[], card: Card): boolean {
  const rank = rankOf(card);
  if (foundations[suitOf(card)] !== rank - 1) return false;
  if (rank <= 2) return true;
  for (let s = 0; s < SUITS; s++) if (s % 2 !== suitOf(card) % 2 && foundations[s]! < rank - 1) return false;
  return true;
}

export const noLongerNeeded = (t: FreeTable, card: Card): boolean => homeForGood(t.foundations, card);

/** Cards in order from the first up: each one rank lower than the one under it, the colours taking turns. */
export function inOrder(cards: readonly Card[]): boolean {
  for (let i = 1; i < cards.length; i++) if (!fitsOn(cards[i]!, cards[i - 1]!)) return false;
  return true;
}

/** Where the cards in order at the top of a column start (the run that can move together); -1 — the column is empty. */
export function orderStart(t: FreeTable, column: number): number {
  const col = t.columns[column]!;
  if (col.length === 0) return -1;
  let s = col.length - 1;
  while (s > 0 && fitsOn(col[s]!, col[s - 1]!)) s -= 1;
  return s;
}

export const freeCellsLeft = (t: FreeTable): number => t.cells.filter((c) => c === null).length;
export const emptyColumns = (t: FreeTable): number => t.columns.filter((c) => c.length === 0).length;

/**
 * How many cards in order may move together to a place: as many as could be moved one by one through the free cells
 * and the empty columns — (free cells + 1) × 2 for each empty column; an empty column the cards go to does not count.
 */
export function moveLimit(t: FreeTable, to: FreePlace): number {
  const intoEmpty = to.kind === 'column' && t.columns[to.index]?.length === 0 ? 1 : 0;
  return (freeCellsLeft(t) + 1) * 2 ** Math.max(0, emptyColumns(t) - intoEmpty);
}

/** The cards that would move from a place (from `index` up, for a column); null if they cannot move together. */
export function movingCards(t: FreeTable, from: FreePlace, index = 0): Card[] | null {
  if (from.kind === 'foundation') return null;
  if (from.kind === 'cell') {
    const card = t.cells[from.index];
    return card === null || card === undefined ? null : [card];
  }
  const col = t.columns[from.index];
  if (!col || index < 0 || index >= col.length) return null;
  const cards = col.slice(index);
  return inOrder(cards) ? cards : null;
}

/** Why cards cannot go to a place: not in order, more than may move together, more than one into a free cell, no place. */
export type Refusal = 'order' | 'too-many' | 'one-card' | 'no-fit';

/** Why the cards from a place (from `index` up, for a column) cannot go to another place now; null — they can. */
export function moveRefusal(t: FreeTable, from: FreePlace, index: number, to: FreePlace): Refusal | null {
  if (from.kind === 'foundation') return 'no-fit';
  const col = from.kind === 'column' ? t.columns[from.index] : null;
  if (from.kind === 'column' && (!col || index < 0 || index >= col.length)) return 'no-fit';
  const cards = movingCards(t, from, index);
  if (!cards) return from.kind === 'column' ? 'order' : 'no-fit';
  if (to.kind === 'foundation') return cards.length === 1 && suitOf(cards[0]!) === to.suit && fitsHome(t, cards[0]!) ? null : 'no-fit';
  if (to.kind === 'cell') {
    if (from.kind === 'cell' || t.cells[to.index] !== null) return 'no-fit';
    return cards.length === 1 ? null : 'one-card';
  }
  if (from.kind === 'column' && from.index === to.index) return 'no-fit';
  const target = t.columns[to.index];
  if (!target) return 'no-fit';
  if (target.length > 0 && !fitsOn(cards[0]!, target[target.length - 1]!)) return 'no-fit';
  return cards.length <= moveLimit(t, to) ? null : 'too-many';
}

/** Whether the cards from a place may go to another place now. */
export const canMove = (t: FreeTable, from: FreePlace, index: number, to: FreePlace): boolean => moveRefusal(t, from, index, to) === null;

const copyTable = (g: FreeCell): FreeCell => ({
  ...g,
  columns: g.columns.map((c) => [...c]),
  cells: [...g.cells],
  foundations: [...g.foundations],
});

const allHome = (t: FreeTable): boolean => t.foundations.every((rank) => rank === KING);

/** Takes the cards off a place (mutates `t`). */
function takeOff(t: FreeTable, from: FreePlace, index: number): Card[] {
  if (from.kind === 'cell') {
    const card = t.cells[from.index]!;
    t.cells[from.index] = null;
    return [card];
  }
  return t.columns[(from as { index: number }).index]!.splice(index);
}

/** Puts cards on a place (mutates `t`). */
function putOn(t: FreeTable, to: FreePlace, cards: readonly Card[]): void {
  if (to.kind === 'foundation') t.foundations[to.suit] = rankOf(cards[0]!);
  else if (to.kind === 'cell') t.cells[to.index] = cards[0]!;
  else t.columns[to.index]!.push(...cards);
}

/**
 * Sends home every card no longer needed at a column's top or in a free cell, one after another, the lowest first,
 * until none is left (mutates `t`); the cards that went, in order.
 */
export function sendHomeSafe(t: FreeTable): AutoHome[] {
  const out: AutoHome[] = [];
  for (;;) {
    let best: AutoHome | null = null;
    const consider = (from: FreePlace, card: Card | null | undefined) => {
      if (card === null || card === undefined || !noLongerNeeded(t, card)) return;
      if (!best || rankOf(card) < rankOf(best.card)) best = { from, card };
    };
    t.columns.forEach((col, index) => consider({ kind: 'column', index }, col[col.length - 1]));
    t.cells.forEach((card, index) => consider({ kind: 'cell', index }, card));
    if (!best) return out;
    const b: AutoHome = best;
    if (b.from.kind === 'cell') t.cells[b.from.index] = null;
    else if (b.from.kind === 'column') t.columns[b.from.index]!.pop();
    t.foundations[suitOf(b.card)] = rankOf(b.card);
    out.push(b);
  }
}

/**
 * Moves cards (from `index` up, for a column) to another place; then, with `autoHome`, the cards no longer needed go
 * home by themselves. Unchanged if the move is not allowed.
 */
export function moveCards(g: FreeCell, from: FreePlace, index: number, to: FreePlace, autoHome: boolean): FreeCell {
  if (g.done || !canMove(g, from, index, to)) return g;
  const next = copyTable(g);
  const cards = takeOff(next, from, index);
  putOn(next, to, cards);
  const auto = autoHome ? sendHomeSafe(next) : [];
  next.history = [...g.history, { from, to, count: cards.length, auto }];
  next.done = allHome(next);
  return next;
}

/**
 * The cards no longer needed go home at the start of a deal (no step to take back: they will never be wanted on the
 * table). Unchanged if none can.
 */
export function settleStart(g: FreeCell): FreeCell {
  const next = copyTable(g);
  return sendHomeSafe(next).length > 0 ? { ...next, done: allHome(next) } : g;
}

/** Takes the last step back: the cards that went home by themselves come back first, then the move. */
export function undoFreeCell(g: FreeCell): FreeCell {
  const last = g.history[g.history.length - 1];
  if (!last) return g;
  const next = copyTable(g);
  next.history = g.history.slice(0, -1);
  next.done = false;
  for (let k = last.auto.length - 1; k >= 0; k--) {
    const a = last.auto[k]!;
    next.foundations[suitOf(a.card)] = rankOf(a.card) - 1;
    putOn(next, a.from, [a.card]);
  }
  let cards: Card[];
  if (last.to.kind === 'foundation') {
    const rank = next.foundations[last.to.suit]!;
    cards = [last.to.suit * RANKS + rank - 1];
    next.foundations[last.to.suit] = rank - 1;
  } else if (last.to.kind === 'cell') {
    cards = [next.cells[last.to.index]!];
    next.cells[last.to.index] = null;
  } else cards = next.columns[last.to.index]!.splice(-last.count);
  putOn(next, last.from, cards);
  return next;
}

/** The next step of finishing by itself: the lowest card that can go home from a column's top or a free cell. */
export function finishStep(t: FreeTable): { from: FreePlace; index: number; to: FreePlace } | null {
  let best: { from: FreePlace; index: number; card: Card } | null = null;
  const consider = (from: FreePlace, index: number, card: Card | null | undefined) => {
    if (card === null || card === undefined || !fitsHome(t, card)) return;
    if (!best || rankOf(card) < rankOf(best.card)) best = { from, index, card };
  };
  t.columns.forEach((col, i) => consider({ kind: 'column', index: i }, col.length - 1, col[col.length - 1]));
  t.cells.forEach((card, i) => consider({ kind: 'cell', index: i }, 0, card));
  if (!best) return null;
  const b: { from: FreePlace; index: number; card: Card } = best;
  return { from: b.from, index: b.index, to: { kind: 'foundation', suit: suitOf(b.card) } };
}

/** Whether the rest goes home card by card with no other move ("Зібрати все"). */
export function canFinish(g: FreeCell): boolean {
  if (g.done) return false;
  let t: FreeCell = { ...copyTable(g), history: [] };
  for (let guard = 0; guard <= SUITS * RANKS; guard++) {
    if (allHome(t)) return true;
    const step = finishStep(t);
    if (!step) return false;
    t = moveCards(t, step.from, step.index, step.to, false);
  }
  return allHome(t);
}

/** A hint given: counted. */
export const countFreeHint = (g: FreeCell): FreeCell => ({ ...g, hints: g.hints + 1 });

/** Time played, added while the game is on the screen. */
export const addFreeTime = (g: FreeCell, ms: number): FreeCell => (g.done || ms <= 0 ? g : { ...g, ms: g.ms + ms });
