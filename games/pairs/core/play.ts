// Playing one layout: taking pairs off, taking moves back, shuffling the pictures left, hints; the time played.
// Pure functions: a state in, a new state out (docs/pairs/SPEC.md). The screen only shows the state.
import { PAIRS } from '../config.ts';
import { dealOf, reshuffle, type Pair } from './deal.ts';
import { LAYOUTS, slotsOf, type LayoutName } from './layouts.ts';
import { solve } from './solve.ts';
import { isFree, pairsNow, tableOf, type Table } from './table.ts';

/** A step that can be taken back: a pair taken off, or a shuffle (the pictures as they were before it). */
export type Step = { take: Pair } | { shuffle: number[] };

export interface PairsPlay {
  layout: LayoutName;
  /** The level's number; null — the layout of the day. */
  number: number | null;
  /** The day of the layout of the day ("YYYY-MM-DD"); null — a level. */
  daily: string | null;
  /** The seed the deal was made from (shuffles draw from it too). */
  seed: number;
  /** The picture on each place (an index into PICTURES). */
  kinds: number[];
  /** Which places still hold a tile. */
  present: boolean[];
  history: Step[];
  hints: number;
  shuffles: number;
  /** Time played, in milliseconds. */
  ms: number;
  done: boolean;
}

const tables = new Map<string, Table>();

/** The table of a layout (made once). */
export function tableFor(layout: LayoutName): Table {
  let table = tables.get(layout);
  if (!table) tables.set(layout, (table = tableOf(slotsOf(LAYOUTS[layout]))));
  return table;
}

/** A new game of a layout from a seed; null if the seed gives no deal (the caller takes the next one). */
export function newPlay(layout: LayoutName, seed: number, number: number | null, daily: string | null): PairsPlay | null {
  const deal = dealOf(tableFor(layout), seed);
  if (!deal) return null;
  return { layout, number, daily, seed, kinds: deal.kinds, present: deal.kinds.map(() => true), history: [], hints: 0, shuffles: 0, ms: 0, done: false };
}

export type TakeVerdict = 'taken' | 'same' | 'blocked' | 'different';

/** Takes two tiles off if both are free and show the same picture. */
export function take(play: PairsPlay, a: number, b: number): { play: PairsPlay; verdict: TakeVerdict } {
  if (a === b) return { play, verdict: 'same' };
  const table = tableFor(play.layout);
  if (!isFree(table, play.present, a) || !isFree(table, play.present, b)) return { play, verdict: 'blocked' };
  if (play.kinds[a] !== play.kinds[b]) return { play, verdict: 'different' };
  const present = [...play.present];
  present[a] = false;
  present[b] = false;
  return { play: { ...play, present, history: [...play.history, { take: [a, b] }], done: present.every((p) => !p) }, verdict: 'taken' };
}

/** Takes the last step back (a pair or a shuffle). */
export function undo(play: PairsPlay): PairsPlay {
  const last = play.history.at(-1);
  if (!last) return play;
  const history = play.history.slice(0, -1);
  if ('shuffle' in last) return { ...play, kinds: [...last.shuffle], history, done: false };
  const present = [...play.present];
  present[last.take[0]] = true;
  present[last.take[1]] = true;
  return { ...play, present, history, done: false };
}

/**
 * Shuffles left under a limit (PAIRS.shuffleLimits; null — no limit, then null): a shuffle taken back by undo still
 * counts, so undo cannot buy shuffles back.
 */
export function shufflesLeft(play: PairsPlay, limit: number | null): number | null {
  return limit === null ? null : Math.max(0, limit - play.shuffles);
}

/**
 * The pictures left laid again so that the rest can be won; counted. Unchanged if no way was found, or if no shuffle
 * is left under the limit.
 */
export function shuffle(play: PairsPlay, limit: number | null = null): PairsPlay {
  if (play.done || shufflesLeft(play, limit) === 0) return play;
  const table = tableFor(play.layout);
  // Each shuffle draws from its own seed: the game's seed and how many shuffles came before.
  for (let attempt = 0; attempt < 8; attempt++) {
    const kinds = reshuffle(table, play.kinds, play.present, (play.seed + 7919 * (play.shuffles + 1) + attempt) >>> 0);
    if (kinds) return { ...play, kinds, history: [...play.history, { shuffle: [...play.kinds] }], shuffles: play.shuffles + 1 };
  }
  return play;
}

/** How the game stands: tiles left, and pairs that can be taken off now. */
export function standing(play: PairsPlay): { left: number; pairs: number } {
  return { left: play.present.filter(Boolean).length, pairs: pairsNow(tableFor(play.layout), play.kinds, play.present) };
}

/**
 * What a hint says: a pair that keeps the game winnable; or that it cannot be won from here — with how many
 * steps back it can again (null: not within the steps looked at); or 'unknown' when the search gave up (then any
 * pair that can be taken, if there is one); or that the table is already empty.
 */
export type Hint = { kind: 'pair'; pair: Pair } | { kind: 'stuck'; back: number | null } | { kind: 'unknown'; pair: Pair | null } | { kind: 'done' };

export function hintFor(play: PairsPlay): Hint {
  if (play.done) return { kind: 'done' };
  const table = tableFor(play.layout);
  const solved = solve(table, play.kinds, play.present);
  if (solved !== null && solved !== 'unknown') return { kind: 'pair', pair: solved[0]! };
  if (solved === 'unknown') return { kind: 'unknown', pair: anyPair(table, play) };
  let back: number | null = null;
  let state = play;
  for (let k = 1; k <= Math.min(PAIRS.lookBack, play.history.length); k++) {
    state = undo(state);
    const again = solve(table, state.kinds, state.present, PAIRS.solveSteps / 4);
    if (again !== null && again !== 'unknown') {
      back = k;
      break;
    }
  }
  return { kind: 'stuck', back };
}

/** Any two free tiles with the same picture, or null. */
export function anyPair(table: Table, play: PairsPlay): Pair | null {
  const seen = new Map<number, number>();
  for (let i = 0; i < play.present.length; i++) {
    if (!isFree(table, play.present, i)) continue;
    const other = seen.get(play.kinds[i]!);
    if (other !== undefined) return [other, i];
    seen.set(play.kinds[i]!, i);
  }
  return null;
}

/** A hint given: counted. */
export function countHint(play: PairsPlay): PairsPlay {
  return { ...play, hints: play.hints + 1 };
}

/** Time played, added while the game is on the screen. */
export function addTime(play: PairsPlay, ms: number): PairsPlay {
  return play.done || ms <= 0 ? play : { ...play, ms: play.ms + ms };
}
