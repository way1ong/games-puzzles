// The meanings of crossword words (docs/words/SPEC.md, "Значення слів"): the file format, and each language's
// list — a meaning for every crossword word of the levels of the trial, each a short line of its own words.
import { describe, expect, it } from 'vitest';
import enAccepted from '../dict/en/accepted.txt?raw';
import enAnswers from '../dict/en/answers.txt?raw';
import huAccepted from '../dict/hu/accepted.txt?raw';
import huAnswers from '../dict/hu/answers.txt?raw';
import ukAccepted from '../dict/uk/accepted.txt?raw';
import ukAnswers from '../dict/uk/answers.txt?raw';
import enMeanings from '../meanings/en.txt?raw';
import huMeanings from '../meanings/hu.txt?raw';
import ukMeanings from '../meanings/uk.txt?raw';
import { WORDS, type WordLang } from '../config.ts';
import { makeDictionary } from './dictionary.ts';
import { makeLevel } from './level.ts';
import { meaningOf, parseMeanings } from './meanings.ts';

const FILES: Record<WordLang, { answers: string; accepted: string; meanings: string }> = {
  en: { answers: enAnswers, accepted: enAccepted, meanings: enMeanings },
  hu: { answers: huAnswers, accepted: huAccepted, meanings: huMeanings },
  uk: { answers: ukAnswers, accepted: ukAccepted, meanings: ukMeanings },
};
const LANGS = Object.keys(FILES) as WordLang[];

describe('parseMeanings', () => {
  it('reads word<TAB>meaning lines; skips comments, blank lines and lines without a tab', () => {
    const m = parseMeanings('# a comment\n\nдім\tБудинок, де живуть.\nбез табуляції\nКіт\tТварина.\r\n');
    expect([...m]).toEqual([
      ['дім', 'Будинок, де живуть.'],
      ['кіт', 'Тварина.'],
    ]);
    expect(meaningOf(m, 'ДІМ')).toBe('Будинок, де живуть.');
    expect(meaningOf(m, 'сон')).toBeNull();
  });

  it('keeps the first meaning of a word written twice', () => {
    expect(meaningOf(parseMeanings('сон\tПерший.\nсон\tДругий.'), 'сон')).toBe('Перший.');
  });
});

describe.each(LANGS)('the meanings of %s', (lang) => {
  const files = FILES[lang];
  const lines = files.meanings.split('\n').filter((l) => l.trim() && !l.startsWith('#'));
  const meanings = parseMeanings(files.meanings);

  it('has a word, one tab and a meaning on every line, each word once', () => {
    const bad = lines.filter((l) => l.split('\t').length !== 2 || l !== l.trim() || l.split('\t').some((part) => part !== part.trim() || !part));
    expect(bad).toEqual([]);
    expect(meanings.size).toBe(lines.length);
  });

  it('gives meanings to crossword words only, written as the crossword shows them', () => {
    const answers = new Set(files.answers.split('\n').map((w) => w.trim()));
    expect([...meanings.keys()].filter((w) => !answers.has(w))).toEqual([]);
  });

  it('keeps each meaning short: a sentence of its own words, no numbers, without the word itself', () => {
    const problems: string[] = [];
    for (const [word, meaning] of meanings) {
      const first = meaning[0]!;
      if (meaning.length > WORDS.meanings.max) problems.push(`${word}: ${meaning.length} characters`);
      if (first === first.toLowerCase() || first !== first.toUpperCase()) problems.push(`${word}: starts with a small letter`);
      if (!meaning.endsWith('.')) problems.push(`${word}: no full stop at the end`);
      if (/\d/.test(meaning)) problems.push(`${word}: a number`);
      if (new RegExp(`(^|[^\\p{L}])${word}($|[^\\p{L}])`, 'iu').test(meaning)) problems.push(`${word}: explained by itself`);
      if (lang === 'uk' && meaning.includes("'")) problems.push(`${word}: the Ukrainian apostrophe is ’`);
    }
    expect(problems).toEqual([]);
  });

  it(`has a meaning for every crossword word of levels 1–${WORDS.meanings.trialLevels}`, () => {
    const missing = new Set<string>();
    // the Hungarian tile setting seeds the levels of every language (games/words/core/level.ts): both of them
    for (const huTiles of [true, false]) {
      const dict = makeDictionary(lang, files.answers, files.accepted, { huTiles });
      for (let n = 1; n <= WORDS.meanings.trialLevels; n++) {
        for (const placed of makeLevel(dict, n).words) if (meaningOf(meanings, placed.word.text) === null) missing.add(placed.word.text);
      }
    }
    expect([...missing]).toEqual([]);
  });
});
