import { describe, expect, it } from 'vitest';
import enAccepted from '../dict/en/accepted.txt?raw';
import enAnswers from '../dict/en/answers.txt?raw';
import huAccepted from '../dict/hu/accepted.txt?raw';
import huAnswers from '../dict/hu/answers.txt?raw';
import ukAccepted from '../dict/uk/accepted.txt?raw';
import ukAnswers from '../dict/uk/answers.txt?raw';
import { WORDS, type FieldStep, type WordLang } from '../config.ts';
import { makeDictionary, type Dictionary } from './dictionary.ts';
import { cutLengths, fieldStepOf, makeFieldDaily, makeFieldLevel, touching, wholePath, type Field } from './field.ts';
import { makeSolver } from './field-solve.ts';
import { makeRand } from './rand.ts';

const TEXTS: Record<WordLang, [string, string]> = { en: [enAnswers, enAccepted], hu: [huAnswers, huAccepted], uk: [ukAnswers, ukAccepted] };
const dictionaries = new Map<string, Dictionary>();
function dict(lang: WordLang, huTiles = true): Dictionary {
  const key = `${lang}:${huTiles}`;
  if (!dictionaries.has(key)) dictionaries.set(key, makeDictionary(lang, ...TEXTS[lang], { huTiles }));
  return dictionaries.get(key)!;
}

/** Every cell holds a tile and belongs to exactly one hidden word; each word goes through touching cells. */
function checkField(field: Field, d: Dictionary, shape: Omit<FieldStep, 'from'>): void {
  expect(field.cols).toBe(shape.cols);
  expect(field.rows).toBe(shape.rows);
  expect(field.cells.length).toBe(shape.cols * shape.rows);
  const owner = new Array<number>(field.cells.length).fill(0);
  const common = new Set(d.answers.map((w) => w.text));
  for (const w of field.words) {
    expect(w.path.length).toBeGreaterThanOrEqual(shape.word.min);
    expect(w.path.length).toBeLessThanOrEqual(shape.word.max);
    w.path.forEach((c, i) => {
      owner[c]!++;
      if (i) expect(touching(field.cols, w.path[i - 1]!, c), `${w.text}: ${w.path[i - 1]} → ${c}`).toBe(true);
    });
    expect(w.path.map((c) => field.cells[c]).join('')).toBe(w.text);
    expect(common.has(w.text), w.text).toBe(true);
  }
  expect(owner.every((n) => n === 1)).toBe(true);
  expect(field.cells.every((t) => t.length > 0)).toBe(true);
  expect(new Set(field.words.map((w) => w.text)).size).toBe(field.words.length);
}

describe('the Word Field: making a field', () => {
  it('goes through every cell once along touching cells, bent differently by different seeds', () => {
    for (const [cols, rows] of [[4, 4], [5, 6], [6, 8]] as const) {
      const shapes = new Set<string>();
      for (let seed = 1; seed <= 20; seed++) {
        const path = wholePath(cols, rows, makeRand(seed), 60 * cols * rows);
        expect(new Set(path).size).toBe(cols * rows);
        path.forEach((c, i) => i && expect(touching(cols, path[i - 1]!, c)).toBe(true));
        shapes.add(path.join(','));
      }
      // a 4 × 4 field has only a few hundred such paths: two seeds of twenty may meet on one
      expect(shapes.size, `${cols} × ${rows}`).toBeGreaterThanOrEqual(cols * rows > 16 ? 20 : 17);
    }
  });

  it('cuts the cells into word lengths of the step, and says when it cannot', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const lengths = cutLengths(42, 4, 7, makeRand(seed));
      expect(lengths.reduce((a, b) => a + b, 0)).toBe(42);
      expect(lengths.every((l) => l >= 4 && l <= 7)).toBe(true);
    }
    expect(() => cutLengths(5, 3, 3, makeRand(1))).toThrow();
  });

  it('touching cells: side by side in a row or above each other, not across the edge of a row', () => {
    expect(touching(4, 0, 1)).toBe(true);
    expect(touching(4, 0, 4)).toBe(true);
    expect(touching(4, 3, 4)).toBe(false);
    expect(touching(4, 0, 5)).toBe(false);
  });

  for (const [lang, huTiles] of [['en', true], ['uk', true], ['hu', true], ['hu', false]] as [WordLang, boolean][]) {
    it(`${lang}${lang === 'hu' ? (huTiles ? ' (one tile)' : ' (two tiles)') : ''}: every step's fields and the daily field hold common words that cover the field`, () => {
      const d = dict(lang, huTiles);
      for (const step of WORDS.field.levels) {
        for (const n of [step.from, step.from + 1, step.from + 7]) {
          const field = makeFieldLevel(d, n);
          checkField(field, d, fieldStepOf(n));
          expect(field.number).toBe(n);
          if (lang === 'hu' && !huTiles) expect(field.cells.every((t) => t.length === 1)).toBe(true);
        }
      }
      const daily = makeFieldDaily(d, '2026-11-25');
      checkField(daily, d, WORDS.field.daily);
      expect(daily.daily).toBe('2026-11-25');
    });
  }

  it('puts no word twice into a field while the words of a length last', () => {
    // Six made-up words of each length 3–5: a 4 × 4 field takes three to five of them.
    const words = ['abc', 'bcd', 'cde', 'def', 'efg', 'fgh', 'abcd', 'bcde', 'cdef', 'defg', 'efgh', 'fghi', 'abcde', 'bcdef', 'cdefg', 'defgh', 'efghi', 'fghij'];
    const small = makeDictionary('en', words.join('\n'), '', { huTiles: true });
    for (let n = 1; n <= 10; n++) {
      const field = makeFieldLevel(small, n);
      expect(new Set(field.words.map((w) => w.text)).size, `level ${n}: ${field.words.map((w) => w.text)}`).toBe(field.words.length);
    }
  });

  it('gives the same field for the same level and day, another for another', () => {
    const d = dict('en');
    expect(makeFieldLevel(d, 12)).toEqual(makeFieldLevel(d, 12));
    expect(makeFieldLevel(d, 12).cells.join('')).not.toBe(makeFieldLevel(d, 13).cells.join(''));
    expect(makeFieldDaily(d, '2026-11-25')).toEqual(makeFieldDaily(d, '2026-11-25'));
    expect(makeFieldDaily(d, '2026-11-25').cells.join('')).not.toBe(makeFieldDaily(d, '2026-11-26').cells.join(''));
  });

  it('every field can be filled, and a filled field finds the hidden words among its word paths', () => {
    for (const lang of ['en', 'uk', 'hu'] as WordLang[]) {
      const d = dict(lang);
      for (const n of [1, 15, 40, 100, 200]) {
        const field = makeFieldLevel(d, n);
        const solver = makeSolver(d, field);
        const all = new Array<boolean>(field.cells.length).fill(true);
        const paths = solver.paths(all).map((p) => p.path.join(','));
        for (const w of field.words) expect(paths, `${lang} ${n}: ${w.text}`).toContain(w.path.join(','));
        const fill = solver.complete(all);
        expect(Array.isArray(fill), `${lang} level ${n}`).toBe(true);
        const covered = (fill as { path: number[] }[]).flatMap((p) => p.path).sort((a, b) => a - b);
        expect(covered).toEqual(field.cells.map((_, i) => i));
      }
    }
  });
});
