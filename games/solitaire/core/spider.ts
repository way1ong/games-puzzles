// Spider, «Павук» (docs/solitaire/SPEC.md, "Павук"): two decks, ten columns, cards laid down by rank of any suit,
// moved together only as a run of one suit; a run from the king down to the ace goes home by itself. Pure functions:
// a state in, a new state out; the screen only shows it.
//
// A card is a number 0…103: its rank is card % 13 + 1; its suit depends on how many suits the game has — with one,
// all are spades; with two, spades and hearts; with four, every suit (spiderSuit). The same face comes up to eight
// times, so the number, not the face, tells the cards apart.
import { nextInt } from '../../../shared/core/rng.ts';
import { SOLITAIRE, type SpiderSuits } from '../config.ts';
import { KING, cardOf, type Card } from './cards.ts';

export type SpiderCard = number;

const RANKS = SOLITAIRE.deck.ranks;
const RULES = SOLITAIRE.spider;
/** Cards in the two decks. */
export const SPIDER_DECK = RULES.decks * SOLITAIRE.deck.suits * RANKS;

export const spiderRank = (card: SpiderCard): number => (card % RANKS) + 1;

/** The suit (cards.ts: 0 spades, 1 hearts, 2 clubs, 3 diamonds) for the number of suits the game has. */
export function spiderSuit(card: SpiderCard, suits: SpiderSuits): number {
  const pack = Math.floor(card / RANKS);
  return suits === 1 ? 0 : pack % suits;
}

/** The face of a card as in one deck (cards.ts): to draw it and to name it. */
export const faceOf = (card: SpiderCard, suits: SpiderSuits): Card => cardOf(spiderSuit(card, suits), spiderRank(card));

export interface SpiderTable {
  /** Columns, cards from the bottom up; the first `down[i]` of column i lie face down. */
  columns: SpiderCard[][];
  down: number[];
  /** The stock, dealt from its start: a card to each column a deal. */
  stock: SpiderCard[];
  /** The runs gone home, each from the king down to the ace, in the order they went. */
  home: SpiderCard[][];
}

/** A run that went home after a step: the column it left, its cards, and whether a card turned up under it. */
export interface RunHome {
  column: number;
  cards: SpiderCard[];
  flipped: boolean;
}

/** A step that can be taken back. */
export type SpiderStep =
  | { kind: 'move'; from: number; to: number; count: number; flipped: boolean; run: RunHome | null }
  | { kind: 'deal'; runs: RunHome[] };

export interface Spider extends SpiderTable {
  suits: SpiderSuits;
  /** The seed the deal was made from. */
  seed: number;
  /** The day of the deal of the day ("YYYY-MM-DD"); null — an ordinary deal. */
  daily: string | null;
  history: SpiderStep[];
  hints: number;
  /** Time played, in milliseconds. */
  ms: number;
  done: boolean;
}

/** Both decks in the order the seed gives (Fisher–Yates with the shared generator), the same on every device. */
export function spiderDeck(seed: number): SpiderCard[] {
  const deck = Array.from({ length: SPIDER_DECK }, (_, i) => i);
  let state = seed >>> 0;
  for (let i = deck.length - 1; i > 0; i--) {
    const draw = nextInt(state, i + 1);
    state = draw.state;
    [deck[i], deck[draw.value]] = [deck[draw.value]!, deck[i]!];
  }
  return deck;
}

/** The deal of a seed: RULES.deal cards to each column, the top one face up; the rest is the stock. */
export function spiderDeal(seed: number, suits: SpiderSuits, daily: string | null = null): Spider {
  const deck = spiderDeck(seed);
  const columns: SpiderCard[][] = [];
  let next = 0;
  for (const count of RULES.deal) {
    columns.push(deck.slice(next, next + count));
    next += count;
  }
  return {
    columns,
    down: columns.map((c) => c.length - 1),
    stock: deck.slice(next),
    home: [],
    suits,
    seed,
    daily,
    history: [],
    hints: 0,
    ms: 0,
    done: false,
  };
}

/** Whether `card` lies in order on `under` within a run: one rank lower, the same suit. */
export const followsInRun = (card: SpiderCard, under: SpiderCard, suits: SpiderSuits): boolean =>
  spiderRank(under) === spiderRank(card) + 1 && spiderSuit(under, suits) === spiderSuit(card, suits);

/** The lowest index from which the cards of a column up to its top form one run (they move together); -1 — empty. */
export function runStart(t: SpiderTable, suits: SpiderSuits, column: number): number {
  const col = t.columns[column]!;
  if (col.length === 0) return -1;
  let s = col.length - 1;
  while (s - 1 >= t.down[column]! && followsInRun(col[s]!, col[s - 1]!, suits)) s -= 1;
  return s;
}

/** Whether the cards of a column from `index` up may go onto another column now. */
export function canMoveRun(t: SpiderTable, suits: SpiderSuits, from: number, index: number, to: number): boolean {
  if (from === to) return false;
  const col = t.columns[from];
  const target = t.columns[to];
  if (!col || !target || index < 0 || index >= col.length) return false;
  if (index < runStart(t, suits, from)) return false;
  if (target.length === 0) return true;
  return spiderRank(target[target.length - 1]!) === spiderRank(col[index]!) + 1;
}

/** Why the stock cannot be dealt now: nothing left, or an empty column (the classic rule); null — it can. */
export function dealBlock(t: SpiderTable): 'empty-stock' | 'empty-column' | null {
  if (t.stock.length === 0) return 'empty-stock';
  return t.columns.some((c) => c.length === 0) ? 'empty-column' : null;
}

const copyTable = (g: Spider): Spider => ({
  ...g,
  columns: g.columns.map((c) => [...c]),
  down: [...g.down],
  stock: [...g.stock],
  home: g.home.map((r) => [...r]),
});

/** The card left on top of a column turns face up; true if one did. */
function turnUp(t: SpiderTable, column: number): boolean {
  const col = t.columns[column]!;
  if (col.length > 0 && t.down[column]! >= col.length) {
    t.down[column] = col.length - 1;
    return true;
  }
  return false;
}

/** A whole run from the king down to the ace on top of a column goes home (mutates `t`); null — none. */
function runGoesHome(t: SpiderTable, suits: SpiderSuits, column: number): RunHome | null {
  const col = t.columns[column]!;
  if (col.length < RANKS || col.length - RANKS < t.down[column]!) return null;
  const top = col.length - 1;
  if (spiderRank(col[top]!) !== 1) return null;
  for (let k = top; k > col.length - RANKS; k--) if (!followsInRun(col[k]!, col[k - 1]!, suits)) return null;
  if (spiderRank(col[col.length - RANKS]!) !== KING) return null;
  const cards = col.splice(col.length - RANKS, RANKS);
  t.home.push(cards);
  return { column, cards, flipped: turnUp(t, column) };
}

/** Moves the cards of a column from `index` up onto another column; unchanged if the move is not allowed. */
export function moveRun(g: Spider, from: number, index: number, to: number): Spider {
  if (g.done || !canMoveRun(g, g.suits, from, index, to)) return g;
  const next = copyTable(g);
  const moving = next.columns[from]!.splice(index);
  next.columns[to]!.push(...moving);
  const flipped = turnUp(next, from);
  const run = runGoesHome(next, g.suits, to);
  next.history = [...g.history, { kind: 'move', from, to, count: moving.length, flipped, run }];
  next.done = next.home.length === RULES.runs;
  return next;
}

/** Deals a card from the stock face up onto each column (the classic rule: not while a column is empty). */
export function dealRow(g: Spider): Spider {
  if (g.done || dealBlock(g) !== null) return g;
  const next = copyTable(g);
  const cards = next.stock.splice(0, next.columns.length);
  cards.forEach((card, i) => next.columns[i]!.push(card));
  const runs: RunHome[] = [];
  for (let i = 0; i < next.columns.length; i++) {
    const run = runGoesHome(next, g.suits, i);
    if (run) runs.push(run);
  }
  next.history = [...g.history, { kind: 'deal', runs }];
  next.done = next.home.length === RULES.runs;
  return next;
}

/** A run that went home comes back onto its column (the card under it face down again, if it turned up). */
function runBack(t: SpiderTable, run: RunHome): void {
  if (run.flipped) t.down[run.column]! += 1;
  t.columns[run.column]!.push(...run.cards);
  t.home.pop();
}

/** Takes the last step back (a move or a deal from the stock, with any run that went home after it). */
export function undoSpider(g: Spider): Spider {
  const last = g.history[g.history.length - 1];
  if (!last) return g;
  const next = copyTable(g);
  next.history = g.history.slice(0, -1);
  next.done = false;
  if (last.kind === 'move') {
    if (last.run) runBack(next, last.run);
    if (last.flipped) next.down[last.from]! += 1;
    next.columns[last.from]!.push(...next.columns[last.to]!.splice(next.columns[last.to]!.length - last.count));
    return next;
  }
  for (let k = last.runs.length - 1; k >= 0; k--) runBack(next, last.runs[k]!);
  const back = next.columns.map((col) => col.pop()!);
  next.stock = [...back, ...next.stock];
  return next;
}

/** A hint given: counted. */
export const countSpiderHint = (g: Spider): Spider => ({ ...g, hints: g.hints + 1 });

/** Time played, added while the game is on the screen. */
export const addSpiderTime = (g: Spider, ms: number): Spider => (g.done || ms <= 0 ? g : { ...g, ms: g.ms + ms });
