import { describe, expect, it } from 'vitest';
import { cellsOf } from './crossword.ts';
import { makeDictionary } from './dictionary.ts';
import type { Level } from './level.ts';
import { layout } from './crossword.ts';
import { makeRand } from './rand.ts';
import { addTime, isShown, missing, newPlay, openCell, openFirstLetter, openWord, tryWord } from './play.ts';
import { makeWord } from './dictionary.ts';

// A small made-up dictionary: crossword words and a few more accepted words.
const dict = makeDictionary('en', 'plane\nplan\nlane\npane\nnap', 'plane\nplan\nlane\npane\nnap\npal\npen\nape', { huTiles: true });
const opts = { huTiles: true };

function level(): Level {
  const words = ['plane', 'plan', 'lane', 'pane', 'nap'].map((w) => makeWord('en', w, opts));
  const grid = layout(words, makeRand(3), 9);
  return { ...grid, lang: 'en', number: 1, daily: null, letters: ['n', 'e', 'p', 'a', 'l'] };
}

describe('playing a level', () => {
  it('finds crossword words, keeps bonus words, says what else happened', () => {
    let play = newPlay(level());
    const placed = play.level.words.map((p) => p.word.text);
    const first = placed[1]!;
    let r = tryWord(play, [...first], dict);
    expect(r.verdict).toBe('found');
    play = r.play;
    expect(play.found).toEqual([first]);
    expect(tryWord(play, [...first], dict).verdict).toBe('again');
    r = tryWord(play, [...'pal'], dict);
    expect(r.verdict).toBe('bonus');
    play = r.play;
    expect(play.bonus).toEqual(['pal']);
    expect(tryWord(play, [...'pal'], dict).verdict).toBe('again');
    expect(tryWord(play, [...'pe'], dict).verdict).toBe('short');
    expect(tryWord(play, [...'lap'], dict).verdict).toBe('unknown'); // a word, but not in this dictionary
    expect(tryWord(play, [...'peel'], dict).verdict).toBe('unknown'); // two e: the wheel has one
  });

  it('shows the cells of found words', () => {
    let play = newPlay(level());
    const p = play.level.words[0]!;
    play = tryWord(play, [...p.word.text], dict).play;
    for (const c of cellsOf(p)) expect(isShown(play, c.row, c.col)).toBe(true);
  });

  it('ends when every crossword word is found', () => {
    let play = newPlay(level());
    for (const p of play.level.words) play = tryWord(play, [...p.word.text], dict).play;
    expect(play.done).toBe(true);
    expect(missing(play)).toHaveLength(0);
    expect(addTime(play, 1000)).toBe(play);
  });

  it('hints: a first letter, a chosen cell, a whole word — each counted; a word opened whole is found', () => {
    let play = newPlay(level());
    const shortest = missing(play)[0]!;
    play = openFirstLetter(play);
    expect(play.hints).toBe(1);
    const start = cellsOf(shortest)[0]!;
    expect(isShown(play, start.row, start.col)).toBe(true);
    const cell = cellsOf(play.level.words[0]!).find((c) => !isShown(play, c.row, c.col))!;
    play = openCell(play, cell.row, cell.col);
    expect(play.hints).toBe(2);
    expect(openCell(play, cell.row, cell.col)).toBe(play); // already open: no hint spent
    expect(openCell(play, 99, 99)).toBe(play);
    const before = missing(play).length;
    play = openWord(play);
    expect(play.hints).toBe(3);
    expect(missing(play).length).toBeLessThan(before);
    // opening the remaining cells one by one finds the words they complete
    for (const p of play.level.words) for (const c of cellsOf(p)) play = openCell(play, c.row, c.col);
    expect(play.done).toBe(true);
  });

  it('counts time until done', () => {
    expect(addTime(addTime(newPlay(level()), 500), 700).ms).toBe(1200);
  });
});
