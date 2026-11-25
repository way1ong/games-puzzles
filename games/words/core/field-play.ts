// Playing a Word Field: words placed along paths of free cells; a plan — one way to fill the free cells — that
// the hints follow; bonus words; hints; time. Another real word than the hidden one counts when the rest of the
// field can still be filled (decision of 25.11); the search for that is passed in (core/field-solve.ts). Every move
// returns a new state. Pure, no DOM.
import { WORDS } from '../config.ts';
import { touching, type Field, type FieldWord } from './field.ts';

export interface Placed extends FieldWord {
  /** Found by the player, or opened whole by a hint. */
  by: 'player' | 'hint';
}

export interface FieldPlay {
  field: Field;
  /** Words on the field, in the order placed. */
  placed: Placed[];
  /** One way to fill the free cells: the hidden words at first; the hints follow it. */
  plan: FieldWord[];
  /** A word a hint is showing: its path and how many of its first cells are shown. */
  hint: { path: number[]; shown: number } | null;
  /** Real words that could not stay on the field, in the order found. */
  bonus: string[];
  /** Hints asked. */
  hints: number;
  /** Time played, ms. */
  ms: number;
  done: boolean;
}

export type FieldVerdict =
  /** A word of the plan (a hidden word, at first): placed. */
  | 'found'
  /** Another real word: placed — the rest of the field can still be filled. */
  | 'other'
  /** A real word, but with it the rest of the field could not be filled: a bonus word. */
  | 'stuck'
  /** A word found before (on the field or among the bonus words). */
  | 'again'
  /** Shorter than the shortest word. */
  | 'short'
  /** Not a word the game knows. */
  | 'unknown';

export interface FieldRules {
  accepts(text: string): boolean;
  /** A way to fill the free cells with words: null — none; 'unknown' — the search gave up. */
  complete(free: readonly boolean[]): FieldWord[] | null | 'unknown';
}

export function newFieldPlay(field: Field): FieldPlay {
  return { field, placed: [], plan: field.words.map((w) => ({ text: w.text, path: [...w.path] })), hint: null, bonus: [], hints: 0, ms: 0, done: false };
}

/** Which cells are still free (no word placed on them). */
export function freeCells(play: FieldPlay): boolean[] {
  const free = new Array<boolean>(play.field.cells.length).fill(true);
  for (const p of play.placed) for (const c of p.path) free[c] = false;
  return free;
}

/** Whether a path goes through free cells only, each next to the one before, none twice. */
export function isPathOn(play: FieldPlay, path: readonly number[]): boolean {
  const free = freeCells(play);
  const seen = new Set<number>();
  return path.every((c, i) => free[c] === true && !seen.has(c) && !!seen.add(c) && (i === 0 || touching(play.field.cols, path[i - 1]!, c)));
}

const textOf = (play: FieldPlay, path: readonly number[]) => path.map((c) => play.field.cells[c]).join('');
const samePath = (a: readonly number[], b: readonly number[]) => a.length === b.length && a.every((c, i) => c === b[i]);

/** Places a word; the plan loses it (or is replaced); the field is done when no cell is free. */
function place(play: FieldPlay, word: FieldWord, by: Placed['by'], plan: FieldWord[]): FieldPlay {
  const placed = [...play.placed, { text: word.text, path: [...word.path], by }];
  const used = new Set(word.path);
  const hint = play.hint && !play.hint.path.some((c) => used.has(c)) ? play.hint : null;
  const done = placed.reduce((n, p) => n + p.path.length, 0) === play.field.cells.length;
  return { ...play, placed, plan, hint, done };
}

/** The player's path (the cells in the order slid or tapped). */
export function tryFieldPath(play: FieldPlay, path: readonly number[], rules: FieldRules): { play: FieldPlay; verdict: FieldVerdict; text: string } {
  const text = textOf(play, path);
  if (play.done || !isPathOn(play, path)) return { play, verdict: 'unknown', text };
  if (path.length < WORDS.minWord) return { play, verdict: 'short', text };
  // A word of the plan, read either way.
  for (const word of play.plan) {
    const backwards = [...path].reverse();
    if (samePath(word.path, path) || samePath(word.path, backwards)) {
      return { play: place(play, word, 'player', play.plan.filter((w) => w !== word)), verdict: 'found', text: word.text };
    }
  }
  if (!rules.accepts(text)) return { play, verdict: 'unknown', text };
  if (play.bonus.includes(text)) return { play, verdict: 'again', text };
  // Another real word: it stays when the rest can still be filled.
  const free = freeCells(play);
  for (const c of path) free[c] = false;
  const rest = rules.complete(free);
  if (rest === null || rest === 'unknown') return { play: { ...play, bonus: [...play.bonus, text] }, verdict: 'stuck', text };
  return { play: place(play, { text, path: [...path] }, 'player', rest), verdict: 'other', text };
}

/** The plan word a hint shows: the one already shown, else the shortest. */
function hinted(play: FieldPlay): FieldWord | null {
  if (play.hint) return play.plan.find((w) => samePath(w.path, play.hint!.path)) ?? null;
  return [...play.plan].sort((a, b) => a.path.length - b.path.length)[0] ?? null;
}

/** Hint: where a word starts (its first cell is shown). */
export function hintStart(play: FieldPlay): FieldPlay {
  if (play.done) return play;
  if (play.hint) return play;
  const word = hinted(play);
  if (!word) return play;
  return { ...play, hint: { path: [...word.path], shown: 1 }, hints: play.hints + 1 };
}

/** Hint: one more cell of the word's path; the whole path shown places the word. */
export function hintNext(play: FieldPlay): FieldPlay {
  if (play.done) return play;
  if (!play.hint) return hintStart(play);
  const word = hinted(play);
  if (!word) return play;
  const shown = play.hint.shown + 1;
  if (shown >= word.path.length) return hintWord(play);
  return { ...play, hint: { path: play.hint.path, shown }, hints: play.hints + 1 };
}

/** Hint: the whole word is placed. */
export function hintWord(play: FieldPlay): FieldPlay {
  if (play.done) return play;
  const word = hinted(play);
  if (!word) return play;
  const next = place({ ...play, hint: null }, word, 'hint', play.plan.filter((w) => w !== word));
  return { ...next, hints: play.hints + 1 };
}

/** Typed letters (tiles): a path on the free cells that spells them — a word of the plan if there is one. */
export function pathForTiles(play: FieldPlay, tiles: readonly string[], find: (free: readonly boolean[], tiles: readonly string[]) => number[][]): number[] | null {
  const text = tiles.join('');
  const planned = play.plan.find((w) => w.text === text && textOf(play, w.path) === text);
  if (planned) return [...planned.path];
  return find(freeCells(play), tiles)[0] ?? null;
}

export function addFieldTime(play: FieldPlay, ms: number): FieldPlay {
  return play.done || ms <= 0 ? play : { ...play, ms: play.ms + ms };
}
