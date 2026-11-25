import { describe, expect, it } from 'vitest';
import enAccepted from '../dict/en/accepted.txt?raw';
import enAnswers from '../dict/en/answers.txt?raw';
import huAccepted from '../dict/hu/accepted.txt?raw';
import huAnswers from '../dict/hu/answers.txt?raw';
import ukAccepted from '../dict/uk/accepted.txt?raw';
import ukAnswers from '../dict/uk/answers.txt?raw';
import { WORDS, type WordLang } from '../config.ts';
import { cellsOf, layout, type Crossword } from './crossword.ts';
import { canMake, makeDictionary, makeWord, type Dictionary } from './dictionary.ts';
import { mainWords, makeDaily, makeLevel, stepOf } from './level.ts';
import { makeRand } from './rand.ts';

const TEXTS: Record<WordLang, [string, string]> = { en: [enAnswers, enAccepted], hu: [huAnswers, huAccepted], uk: [ukAnswers, ukAccepted] };
const dictionaries = new Map<string, Dictionary>();
function dict(lang: WordLang, huTiles = true): Dictionary {
  const key = `${lang}:${huTiles}`;
  if (!dictionaries.has(key)) dictionaries.set(key, makeDictionary(lang, ...TEXTS[lang], { huTiles }));
  return dictionaries.get(key)!;
}

/** Every run of two or more letters in a row or a column is exactly one placed word; all words are linked. */
function checkCrossword(grid: Crossword): void {
  const cells = new Map<string, string>();
  for (const p of grid.words) {
    for (const c of cellsOf(p)) {
      expect(c.row).toBeGreaterThanOrEqual(0);
      expect(c.col).toBeGreaterThanOrEqual(0);
      expect(c.row).toBeLessThan(grid.height);
      expect(c.col).toBeLessThan(grid.width);
      const key = `${c.row},${c.col}`;
      if (cells.has(key)) expect(cells.get(key)).toBe(c.tile);
      cells.set(key, c.tile);
    }
  }
  const starts = new Set(grid.words.map((p) => `${p.dir}:${p.row},${p.col}:${p.word.tiles.length}`));
  for (const dir of ['across', 'down'] as const) {
    const [outer, inner] = dir === 'across' ? [grid.height, grid.width] : [grid.width, grid.height];
    for (let a = 0; a < outer; a++) {
      let run = 0;
      for (let b = 0; b <= inner; b++) {
        const key = dir === 'across' ? `${a},${b}` : `${b},${a}`;
        if (b < inner && cells.has(key)) {
          run++;
          continue;
        }
        if (run >= 2) {
          const start = dir === 'across' ? `${a},${b - run}` : `${b - run},${a}`;
          expect(starts.has(`${dir}:${start}:${run}`), `${dir} run at ${start}`).toBe(true);
        }
        run = 0;
      }
    }
  }
  // linked: every word shares a cell with a word placed before it
  grid.words.forEach((p, i) => {
    if (i === 0) return;
    const mine = new Set(cellsOf(p).map((c) => `${c.row},${c.col}`));
    expect(grid.words.slice(0, i).some((q) => cellsOf(q).some((c) => mine.has(`${c.row},${c.col}`)))).toBe(true);
  });
}

describe('crossword layout', () => {
  it('crosses words on shared letters and never lets them touch side by side', () => {
    const words = ['planet', 'plan', 'net', 'lane', 'pent', 'ant', 'tan'].map((w) => makeWord('en', w, { huTiles: true }));
    const grid = layout(words, makeRand(5), WORDS.maxGridSide);
    expect(grid.words.length).toBeGreaterThanOrEqual(4);
    expect(grid.words[0]!.word.text).toBe('planet');
    checkCrossword(grid);
  });

  it('keeps within the biggest grid', () => {
    const words = ['abcdefghij', 'abc'].map((w) => makeWord('en', w, { huTiles: true }));
    expect(layout(words, makeRand(1), 9).words.map((p) => p.word.text)).toEqual(['abc']);
  });
});

describe('levels', () => {
  for (const lang of ['en', 'hu', 'uk'] as const) {
    it(`${lang}: levels grow, hold common words made of the wheel, lay out cleanly and do not repeat`, () => {
      const d = dict(lang);
      const answers = new Set(d.answers.map((w) => w.text));
      const mainsSeen = new Map<number, Set<string>>();
      for (const number of [1, 2, 3, 10, 11, 12, 30, 31, 32, 80, 81, 82, 150]) {
        const level = makeLevel(d, number);
        const step = stepOf(number);
        expect(level.letters).toHaveLength(step.letters);
        expect(level.words.length).toBeGreaterThanOrEqual(step.words.min);
        expect(level.words.length).toBeLessThanOrEqual(step.words.max);
        expect(level.words[0]!.word.tiles).toHaveLength(step.letters);
        for (const p of level.words) {
          expect(answers.has(p.word.text)).toBe(true);
          expect(canMake(p.word.tiles, level.letters)).toBe(true);
        }
        expect(level.letters.join('')).not.toBe(level.words[0]!.word.tiles.join(''));
        checkCrossword(level);
        const seen = mainsSeen.get(step.letters) ?? new Set();
        expect(seen.has(level.words[0]!.word.key)).toBe(false);
        seen.add(level.words[0]!.word.key);
        mainsSeen.set(step.letters, seen);
        expect(makeLevel(d, number)).toEqual(level); // the same for everybody
      }
    }, 60_000);
  }

  it('has enough main words for long play in every language', () => {
    for (const lang of ['en', 'hu', 'uk'] as const) {
      for (const step of WORDS.levels) {
        const next = WORDS.levels.find((s) => s.from > step.from);
        const span = next ? next.from - step.from : 0;
        expect(mainWords(dict(lang), step.letters, step.words.min).length, `${lang} ${step.letters}`).toBeGreaterThan(span);
      }
    }
  }, 60_000);

  it('gives the same daily puzzle on the same day, another on another day', () => {
    const d = dict('uk');
    const a = makeDaily(d, '2026-11-24');
    expect(makeDaily(d, '2026-11-24')).toEqual(a);
    expect(makeDaily(d, '2026-11-25').letters.join('')).not.toBe(a.letters.join(''));
    expect(a.letters).toHaveLength(WORDS.daily.letters);
    checkCrossword(a);
  }, 60_000);

  it('Hungarian: the tile setting changes the levels, both kinds work', () => {
    const withTiles = makeLevel(dict('hu', true), 40);
    const withLetters = makeLevel(dict('hu', false), 40);
    expect(withTiles.letters.join('')).not.toBe(withLetters.letters.join(''));
    checkCrossword(withTiles);
    checkCrossword(withLetters);
  }, 60_000);
});
