// Playing a level: words the player makes on the wheel, crossword words found, bonus words, letters opened by
// hints, time. Pure: every action returns a new state (or the same one when nothing changes).
import { WORDS } from '../config.ts';
import { cellsOf, type Placed } from './crossword.ts';
import { canMake, type Dictionary } from './dictionary.ts';
import type { Level } from './level.ts';

export interface Play {
  level: Level;
  /** Crossword words found (their texts), in the order found; a word opened whole by hints counts too. */
  found: string[];
  /** Real words made of the wheel's letters that are not in the crossword. */
  bonus: string[];
  /** Cells opened by hints ("row,col"). */
  opened: string[];
  /** Hints asked. */
  hints: number;
  /** Time played, ms. */
  ms: number;
  done: boolean;
}

export type Verdict =
  /** A crossword word, found now. */
  | 'found'
  /** A real word, not in this crossword. */
  | 'bonus'
  /** Found before. */
  | 'again'
  /** Too few letters. */
  | 'short'
  /** Not a word of the dictionary. */
  | 'unknown';

export function newPlay(level: Level): Play {
  return { level, found: [], bonus: [], opened: [], hints: 0, ms: 0, done: false };
}

const cellKey = (row: number, col: number): string => `${row},${col}`;

/** Every cell of the crossword, with its tile and the words through it. */
export function cellsOfLevel(level: Level): Map<string, { row: number; col: number; tile: string; words: Placed[] }> {
  const out = new Map<string, { row: number; col: number; tile: string; words: Placed[] }>();
  for (const p of level.words) {
    for (const c of cellsOf(p)) {
      const key = cellKey(c.row, c.col);
      const cell = out.get(key) ?? { ...c, words: [] };
      cell.words.push(p);
      out.set(key, cell);
    }
  }
  return out;
}

/** Whether a cell shows its letter: its word is found, or a hint opened it. */
export function isShown(play: Play, row: number, col: number): boolean {
  const key = cellKey(row, col);
  if (play.opened.includes(key)) return true;
  return play.level.words.some((p) => play.found.includes(p.word.text) && cellsOf(p).some((c) => c.row === row && c.col === col));
}

/** A word is complete when every one of its cells shows. */
const complete = (play: Play, p: Placed): boolean => cellsOf(p).every((c) => isShown(play, c.row, c.col));

/** Marks words opened whole by hints as found, and the level done when every word is. */
function settle(play: Play): Play {
  const found = [...play.found];
  for (const p of play.level.words) if (!found.includes(p.word.text) && complete({ ...play, found }, p)) found.push(p.word.text);
  const done = play.level.words.every((p) => found.includes(p.word.text));
  return { ...play, found, done };
}

/** The player made a word of these tiles on the wheel. */
export function tryWord(play: Play, tiles: readonly string[], dict: Dictionary): { play: Play; verdict: Verdict; text: string } {
  const text = tiles.join('');
  if (tiles.length < WORDS.minWord) return { play, verdict: 'short', text };
  if (play.found.includes(text) || play.bonus.includes(text)) return { play, verdict: 'again', text };
  const inCrossword = play.level.words.some((p) => p.word.text === text);
  if (play.done || !canMake(tiles, play.level.letters)) return { play, verdict: 'unknown', text };
  if (inCrossword) return { play: settle({ ...play, found: [...play.found, text] }), verdict: 'found', text };
  if (dict.accepts(text)) return { play: { ...play, bonus: [...play.bonus, text] }, verdict: 'bonus', text };
  return { play, verdict: 'unknown', text };
}

/** Words not found yet, the shortest first (the gentlest to hint). */
export function missing(play: Play): Placed[] {
  return play.level.words.filter((p) => !play.found.includes(p.word.text)).sort((a, b) => a.word.tiles.length - b.word.tiles.length);
}

/** Hint: the first hidden letter of a word not found yet. */
export function openFirstLetter(play: Play): Play {
  for (const p of missing(play)) {
    const hidden = cellsOf(p).find((c) => !isShown(play, c.row, c.col));
    if (hidden) return settle({ ...play, opened: [...play.opened, cellKey(hidden.row, hidden.col)], hints: play.hints + 1 });
  }
  return play;
}

/** Hint: the letter of a cell the player chose. */
export function openCell(play: Play, row: number, col: number): Play {
  if (play.done || isShown(play, row, col) || !cellsOfLevel(play.level).has(cellKey(row, col))) return play;
  return settle({ ...play, opened: [...play.opened, cellKey(row, col)], hints: play.hints + 1 });
}

/** Hint: a whole word not found yet (the shortest). */
export function openWord(play: Play): Play {
  const word = missing(play)[0];
  if (!word) return play;
  return settle({ ...play, found: [...play.found, word.word.text], hints: play.hints + 1 });
}

export function addTime(play: Play, ms: number): Play {
  return play.done || ms <= 0 ? play : { ...play, ms: play.ms + ms };
}
