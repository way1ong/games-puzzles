// Making a level from the language's words and a seed. A level has a main word (the longest), whose tiles —
// shuffled — make the wheel; its crossword holds common words made of those tiles. Level N is the same for every
// player of a language (in Hungarian: of the same tile setting), and main words do not repeat until the
// language has no more of that length. Pure, no DOM.
import { seedFromText } from '../../../shared/core/rng.ts';
import { WORDS, type LevelStep, type WordLang } from '../config.ts';
import { layout, type Crossword } from './crossword.ts';
import { maskOf, tileMode, type Dictionary, type Word } from './dictionary.ts';
import { makeRand, shuffled, type Rand } from './rand.ts';

export interface Level extends Crossword {
  lang: WordLang;
  /** The level's number (from 1), or null for a daily puzzle. */
  number: number | null;
  /** The day ("YYYY-MM-DD") of a daily puzzle; null — a level of the sequence. */
  daily: string | null;
  /** The wheel, in the order shown at the start. */
  letters: string[];
}

export function stepOf(number: number): LevelStep {
  const steps = WORDS.levels as readonly LevelStep[];
  return [...steps].reverse().find((s) => number >= s.from) ?? steps[0]!;
}

/** Crossword words that can be made of the tiles; with `enough`, stops once it has found that many. */
function makeable(dict: Dictionary, tiles: readonly string[], enough = Infinity): Word[] {
  const have = new Map<string, number>();
  for (const t of tiles) have.set(t, (have.get(t) ?? 0) + 1);
  const [lo, hi] = maskOf(dict.lang, tiles);
  const out: Word[] = [];
  for (const w of dict.answers) {
    if (w.tiles.length > tiles.length || w.mask[0] & ~lo || w.mask[1] & ~hi) continue;
    let ok = true;
    for (const [tile, n] of w.counts) {
      if ((have.get(tile) ?? 0) < n) {
        ok = false;
        break;
      }
    }
    if (ok && out.push(w) >= enough) break;
  }
  return out;
}

const cache = new WeakMap<Dictionary, Map<number, Word[]>>();

/**
 * Main words with this many tiles that give enough crossword words, in the order the levels use them: from the
 * more common to the rarer, in groups shuffled within (the same order for everybody).
 */
export function mainWords(dict: Dictionary, letters: number, minWords: number): Word[] {
  let byLength = cache.get(dict);
  if (!byLength) cache.set(dict, (byLength = new Map()));
  const key = letters * 1000 + minWords;
  const known = byLength.get(key);
  if (known) return known;
  const seen = new Set<string>();
  const candidates = dict.answers.filter((w) => {
    if (w.tiles.length !== letters || seen.has(w.key)) return false;
    seen.add(w.key); // one main word for each set of tiles
    return makeable(dict, w.tiles, minWords).length >= minWords;
  });
  const rand = makeRand(seedFromText(`way1ong-words:${dict.lang}:${tileMode(dict)}:main:${letters}`));
  const ordered: Word[] = [];
  for (let i = 0; i < candidates.length; i += WORDS.levelGroup) ordered.push(...shuffled(rand, candidates.slice(i, i + WORDS.levelGroup)));
  byLength.set(key, ordered);
  return ordered;
}

/** The wheel: the main word's tiles in an order that does not spell it. */
function wheelOf(main: Word, rand: Rand): string[] {
  for (let i = 0; i < WORDS.layoutTries; i++) {
    const order = shuffled(rand, main.tiles);
    if (order.join('') !== main.tiles.join('')) return order;
  }
  return [...main.tiles].reverse();
}

/** The crossword of a main word: the main word first, then other common words, the longer first. */
function crosswordOf(dict: Dictionary, main: Word, words: { min: number; max: number }, rand: Rand): Crossword {
  const others = makeable(dict, main.tiles).filter((w) => w.text !== main.text);
  let best: Crossword | null = null;
  for (let attempt = 0; attempt < WORDS.layoutTries; attempt++) {
    // The more common words are offered first; which of them come is up to the seed.
    const offered = shuffled(rand, others.slice(0, words.max * 2)).sort((a, b) => b.tiles.length - a.tiles.length);
    const grid = layout([main, ...offered].slice(0, words.max + attempt), rand, WORDS.maxGridSide);
    const kept = { ...grid, words: grid.words.slice(0, words.max) };
    if (!best || kept.words.length > best.words.length) best = kept;
    if (kept.words.length >= words.min) break;
  }
  return best!;
}

function build(dict: Dictionary, main: Word, words: { min: number; max: number }, seed: string, number: number | null, daily: string | null): Level {
  const rand = makeRand(seedFromText(seed));
  const grid = crosswordOf(dict, main, words, rand);
  return { ...grid, lang: dict.lang, number, daily, letters: wheelOf(main, rand) };
}

/** Level `number` (from 1) of the language's sequence. */
export function makeLevel(dict: Dictionary, number: number): Level {
  const step = stepOf(number);
  const mains = mainWords(dict, step.letters, step.words.min);
  if (!mains.length) throw new Error(`No main words of ${step.letters} tiles in ${dict.lang}`);
  const main = mains[(number - step.from) % mains.length]!;
  return build(dict, main, step.words, `way1ong-words:${dict.lang}:${tileMode(dict)}:level:${number}`, number, null);
}

/** The daily puzzle of a day: the same for every player of the language. */
export function makeDaily(dict: Dictionary, dateKey: string): Level {
  const { letters, words } = WORDS.daily;
  const mains = mainWords(dict, letters, words.min);
  if (!mains.length) throw new Error(`No main words of ${letters} tiles in ${dict.lang}`);
  const seed = `way1ong-words:${dict.lang}:${tileMode(dict)}:daily:${dateKey}`;
  const main = mains[makeRand(seedFromText(seed)).int(mains.length)]!;
  return build(dict, main, words, seed, null, dateKey);
}
