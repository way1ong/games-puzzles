// Letters of each language and how a word splits into the tiles of the wheel. In Hungarian, cs, gy, ly, ny,
// sz, ty and zs make one tile when the setting is on; a word list marks with "|" a compound's boundary, so
// that two letters meeting across it are not taken for one ("ház|sor": z and s, not zs). Pure, no DOM.
import { WORDS, type WordLang } from '../config.ts';

/** Lowercase letters a word of the language may hold (accented letters are letters of their own). */
export const ALPHABETS: Readonly<Record<WordLang, string>> = {
  en: 'abcdefghijklmnopqrstuvwxyz',
  hu: 'aábcdeéfghiíjklmnoóöőpqrstuúüűvwxyz',
  uk: 'абвгґдеєжзиіїйклмнопрстуфхцчшщьюя',
};

export const BOUNDARY = '|';

export interface TileOptions {
  /** Hungarian: two-character letters as one tile. */
  huTiles: boolean;
}

/** Whether a word (with optional "|" boundaries) is made only of the language's letters. */
export function isWordOf(lang: WordLang, word: string): boolean {
  if (!word || word.startsWith(BOUNDARY) || word.endsWith(BOUNDARY)) return false;
  const letters = ALPHABETS[lang];
  return [...word].every((ch) => ch === BOUNDARY || letters.includes(ch));
}

/** The word as shown: without boundary marks. */
export const plain = (word: string): string => word.split(BOUNDARY).join('');

/** The tiles of a word: letters, or in Hungarian with the setting on, two-character letters as one. */
export function tilesOf(lang: WordLang, word: string, options: TileOptions): string[] {
  const parts = word.split(BOUNDARY);
  if (lang !== 'hu' || !options.huTiles) return parts.flatMap((part) => [...part]);
  const pairs = WORDS.huTiles as readonly string[];
  const out: string[] = [];
  for (const part of parts) {
    const chars = [...part];
    for (let i = 0; i < chars.length; i++) {
      const pair = `${chars[i]}${chars[i + 1] ?? ''}`;
      if (pairs.includes(pair)) {
        out.push(pair);
        i++;
      } else out.push(chars[i]!);
    }
  }
  return out;
}

/** How many tiles the word takes on the wheel. */
export const tileCount = (lang: WordLang, word: string, options: TileOptions): number => tilesOf(lang, word, options).length;
