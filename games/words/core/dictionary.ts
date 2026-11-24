// A language's words for one game: crossword words (the most frequent first) and accepted words, each as tiles.
// Built from the lists in games/words/dict/<lang>/ (scripts/words/build.ts). Pure, no DOM.
import { WORDS, type WordLang } from '../config.ts';
import { ALPHABETS, plain, tilesOf, type TileOptions } from './letters.ts';

export interface Word {
  /** As shown and saved: letters only. */
  text: string;
  tiles: readonly string[];
  /** The tiles sorted — two words with the same key are made of the same tiles. */
  key: string;
  /** How many of each tile the word has. */
  counts: readonly (readonly [string, number])[];
  /** Which tiles the word has, as bits (two 32-bit halves): a quick "cannot be made" before counting. */
  mask: readonly [number, number];
}

export interface Dictionary {
  lang: WordLang;
  options: TileOptions;
  /** Crossword words, the most frequent first. */
  answers: readonly Word[];
  /** Whether a word (as tiles joined) is accepted. */
  accepts(text: string): boolean;
  /** Accepted words that can be made of these tiles (bonus words of a level). */
  makeableFrom(tiles: readonly string[]): Word[];
}

const SEP = '\u0000';
export const keyOf = (tiles: readonly string[]): string => [...tiles].sort().join(SEP);

/** The bit of each tile: the language's letters, then the Hungarian two-character letters. */
const TILE_INDEX: Record<WordLang, Map<string, number>> = Object.fromEntries(
  (Object.keys(ALPHABETS) as WordLang[]).map((lang) => [lang, new Map([...ALPHABETS[lang], ...WORDS.huTiles].map((t, i) => [t, i]))]),
) as Record<WordLang, Map<string, number>>;

export function maskOf(lang: WordLang, tiles: readonly string[]): [number, number] {
  let lo = 0;
  let hi = 0;
  for (const t of tiles) {
    const i = TILE_INDEX[lang].get(t) ?? 63;
    if (i < 32) lo |= 1 << i;
    else hi |= 1 << (i - 32);
  }
  return [lo, hi];
}

export function makeWord(lang: WordLang, marked: string, options: TileOptions): Word {
  const tiles = tilesOf(lang, marked, options);
  return { text: plain(marked), tiles, key: keyOf(tiles), counts: [...counts(tiles)], mask: maskOf(lang, tiles) };
}

/** How many of each tile a list of tiles has. */
function counts(tiles: readonly string[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const t of tiles) out.set(t, (out.get(t) ?? 0) + 1);
  return out;
}

/** Whether the word can be made of the tiles (each tile used at most as many times as it is there). */
export function canMake(word: readonly string[], tiles: readonly string[]): boolean {
  const have = counts(tiles);
  for (const t of word) {
    const n = have.get(t) ?? 0;
    if (!n) return false;
    have.set(t, n - 1);
  }
  return true;
}

const lines = (text: string): string[] =>
  text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

export function makeDictionary(lang: WordLang, answersText: string, acceptedText: string, options: TileOptions): Dictionary {
  const fits = (w: Word) => w.tiles.length >= WORDS.minWord && w.tiles.length <= WORDS.maxLetters;
  const answers = lines(answersText)
    .map((m) => makeWord(lang, m, options))
    .filter(fits);
  const accepted = lines(acceptedText)
    .map((m) => makeWord(lang, m, options))
    .filter(fits);
  const texts = new Set([...accepted.map((w) => w.text), ...answers.map((w) => w.text)]);
  return {
    lang,
    options,
    answers,
    accepts: (text) => texts.has(text),
    makeableFrom(tiles) {
      const seen = new Set<string>();
      return [...answers, ...accepted].filter((w) => {
        if (seen.has(w.text) || w.tiles.length > tiles.length || !canMake(w.tiles, tiles)) return false;
        seen.add(w.text);
        return true;
      });
    },
  };
}
