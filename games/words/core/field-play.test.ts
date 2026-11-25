import { describe, expect, it } from 'vitest';
import { makeDictionary, type Dictionary } from './dictionary.ts';
import type { Field } from './field.ts';
import { addFieldTime, freeCells, hintNext, hintStart, hintWord, newFieldPlay, pathForTiles, tryFieldPath, type FieldRules } from './field-play.ts';
import { makeSolver } from './field-solve.ts';

// A small field of made-up words (letters only matter):
//   a b c      cells 0 1 2
//   d e f            3 4 5
// hidden: "abc" (0 1 2) and "def" (3 4 5); "ade" (0 3 4) and "bcf" (1 2 5) are another way to fill it.
const FIELD: Field = {
  lang: 'en',
  number: 1,
  daily: null,
  cols: 3,
  rows: 2,
  cells: ['a', 'b', 'c', 'd', 'e', 'f'],
  words: [
    { text: 'abc', path: [0, 1, 2] },
    { text: 'def', path: [3, 4, 5] },
  ],
};
const make = (accepted: string): Dictionary => makeDictionary('en', 'abc\ndef', accepted, { huTiles: true });
const rulesOf = (d: Dictionary): FieldRules => {
  const solver = makeSolver(d, FIELD);
  return { accepts: d.accepts, complete: (free) => solver.complete(free) };
};
const both = rulesOf(make('ade\nbcf\nabf'));
const onlyAde = rulesOf(make('ade'));

describe('playing a Word Field', () => {
  it('places a hidden word slid either way; the plan keeps the rest', () => {
    const p0 = newFieldPlay(FIELD);
    const forward = tryFieldPath(p0, [0, 1, 2], both);
    expect(forward.verdict).toBe('found');
    expect(forward.play.placed.map((w) => w.text)).toEqual(['abc']);
    expect(forward.play.plan.map((w) => w.text)).toEqual(['def']);
    const backward = tryFieldPath(p0, [2, 1, 0], both);
    expect(backward.verdict).toBe('found');
    expect(backward.text).toBe('abc');
    expect(freeCells(backward.play)).toEqual([false, false, false, true, true, true]);
  });

  it('says what else happened: too short, not a word, cells that do not touch or are taken', () => {
    const p0 = newFieldPlay(FIELD);
    expect(tryFieldPath(p0, [0, 1], both).verdict).toBe('short');
    expect(tryFieldPath(p0, [1, 4, 5], both).verdict).toBe('unknown');
    // "abf" is a word, but b and f do not touch
    const apart = tryFieldPath(p0, [0, 1, 5], both);
    expect(apart.verdict).toBe('unknown');
    expect(apart.play).toBe(p0);
    const taken = tryFieldPath(tryFieldPath(p0, [0, 1, 2], both).play, [2, 5, 4], both);
    expect(taken.verdict).toBe('unknown');
  });

  it('places another real word when the rest can still be filled, and the hints follow the new plan', () => {
    const r = tryFieldPath(newFieldPlay(FIELD), [0, 3, 4], both);
    expect(r.verdict).toBe('other');
    expect(r.play.placed.map((w) => w.text)).toEqual(['ade']);
    expect(r.play.plan).toEqual([{ text: 'bcf', path: [1, 2, 5] }]);
    const hinted = hintStart(r.play);
    expect(hinted.hint).toEqual({ path: [1, 2, 5], shown: 1 });
  });

  it('keeps another real word as a bonus word when the rest could not be filled with it', () => {
    const r = tryFieldPath(newFieldPlay(FIELD), [0, 3, 4], onlyAde);
    expect(r.verdict).toBe('stuck');
    expect(r.play.placed).toEqual([]);
    expect(r.play.bonus).toEqual(['ade']);
    expect(tryFieldPath(r.play, [0, 3, 4], onlyAde).verdict).toBe('again');
  });

  it('is done when every cell holds a word', () => {
    const one = tryFieldPath(newFieldPlay(FIELD), [0, 1, 2], both).play;
    expect(one.done).toBe(false);
    const two = tryFieldPath(one, [3, 4, 5], both).play;
    expect(two.done).toBe(true);
    expect(tryFieldPath(two, [0, 1, 2], both).play).toBe(two);
  });

  it('hints: where a word starts, one more letter, then the word itself — each counted', () => {
    const start = hintStart(newFieldPlay(FIELD));
    expect(start.hint).toEqual({ path: [0, 1, 2], shown: 1 });
    expect(start.hints).toBe(1);
    expect(hintStart(start)).toBe(start);
    const next = hintNext(start);
    expect(next.hint).toEqual({ path: [0, 1, 2], shown: 2 });
    const last = hintNext(next);
    expect(last.hint).toBeNull();
    expect(last.placed).toEqual([{ text: 'abc', path: [0, 1, 2], by: 'hint' }]);
    expect(last.hints).toBe(3);
    const whole = hintWord(newFieldPlay(FIELD));
    expect(whole.placed[0]).toMatchObject({ text: 'abc', by: 'hint' });
    expect(whole.hints).toBe(1);
  });

  it('drops a hint whose word the player has just placed', () => {
    const hinted = hintStart(newFieldPlay(FIELD));
    const r = tryFieldPath(hinted, [0, 1, 2], both);
    expect(r.play.hint).toBeNull();
  });

  it('finds typed letters on the field: a word of the plan first, else any path that spells them', () => {
    const solver = makeSolver(make('ade\nbcf'), FIELD);
    const p0 = newFieldPlay(FIELD);
    expect(pathForTiles(p0, ['d', 'e', 'f'], solver.find)).toEqual([3, 4, 5]);
    expect(pathForTiles(p0, ['a', 'd', 'e'], solver.find)).toEqual([0, 3, 4]);
    expect(pathForTiles(p0, ['f', 'a', 'b'], solver.find)).toBeNull();
  });

  it('counts time until done', () => {
    const p = addFieldTime(newFieldPlay(FIELD), 1500);
    expect(p.ms).toBe(1500);
    expect(addFieldTime(p, -5)).toBe(p);
  });
});
