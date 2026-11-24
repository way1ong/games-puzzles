import { describe, expect, it } from 'vitest';
import { englishLists, fitsWheel, hungarianLists, hungarianWords, isUkrainianDictionaryForm, ukrainianLists } from './lists.ts';

const freq = (words: Record<string, number>) => new Map(Object.entries(words));

describe('English lists from ESDB', () => {
  const esdb = [
    '35 [] [12dicts]: cat <n>: cats',
    '35 [] [12dicts]: walk <v>',
    '35 [12dicts]: - <v>: walked, walking, walks',
    '35 [12dicts]: A Cv DV: color <n>',
    '35 [12dicts]: B C D: colour <n>',
    '40 [3esl]: A: arsehole <n> (vulgar-1): arseholes',
    '50 [12dicts]: Paris <n/name?>',
    '50 [12dicts]: gonna <v> (informal)',
    '70 [3of6]: zither <n>: zithers',
    '80 [enable]: zymase <n>',
    '35 [12dicts]: giraffe <n>: giraffes',
    '35 [12dicts]: elephant <n>: elephants',
  ].join('\n');
  const lists = englishLists(esdb, freq({ cat: 5, walk: 4, color: 3, colour: 3, gonna: 2, zither: 1, giraffe: 1, elephant: 1 }), ['cat']);

  it('takes common dictionary forms as crossword words, the most frequent first', () => {
    expect(lists.answers).toEqual(['walk', 'giraffe']); // elephant: eight letters, more than the wheel holds
  });

  it('accepts forms and spellings of every country, but not offensive words, names, the rarest words or the too long', () => {
    expect(lists.accepted).toEqual(expect.arrayContaining(['walked', 'walking', 'walks', 'color', 'colour', 'gonna', 'zither', 'zithers', 'giraffe']));
    for (const w of ['cat', 'arsehole', 'arseholes', 'paris', 'Paris', 'zymase', 'giraffes', 'elephant']) expect(lists.accepted).not.toContain(w);
  });
});

describe('Hungarian lists from Magyar Ispell', () => {
  it('reads words, marks and compound boundaries', () => {
    const file = ['# köznevek', 'ablak', 'anyakönyvel[hy:anya|könyvel]', 'állásfoglalás\tállás|foglalás', 'érintőleg\t[adv]', 'Dehát\t[sentint]'].join('\n');
    expect(hungarianWords(file)).toEqual(['ablak', 'anya|könyvel', 'állás|foglalás', 'érintőleg']);
  });

  it('counts two-character letters as one tile when it decides what fits the wheel', () => {
    expect(fitsWheel('hu', 'asszony')).toBe(true); // a s sz o ny — 5 tiles, 7 characters
    expect(fitsWheel('hu', 'házsorok')).toBe(true); // unmarked: h á zs o r o k — 7 tiles
    expect(fitsWheel('hu', 'ház|sorok')).toBe(false); // marked compound: h á z s o r o k — 8 tiles
  });

  it('takes crossword words only from the basic vocabulary, the most frequent first; leaves offensive words out', () => {
    const lists = hungarianLists(
      [
        { module: 'alap', text: 'ablak\nház|tető\nkutya\nbunkó' },
        { module: 'idegen', text: 'pizza' },
      ],
      freq({ kutya: 3, háztető: 2, ablak: 1, pizza: 9, bunkó: 5 }),
      ['bunkó'],
    );
    expect(lists.answers).toEqual(['kutya', 'ház|tető', 'ablak']);
    expect(lists.accepted).toEqual(['ablak', 'ház|tető', 'kutya', 'pizza']);
  });
});

describe('Ukrainian lists from VESUM', () => {
  it('knows a dictionary form by its tags', () => {
    expect(isUkrainianDictionaryForm('noun:anim:m:v_naz')).toBe(true);
    expect(isUkrainianDictionaryForm('noun:inanim:p:v_naz:ns')).toBe(true);
    expect(isUkrainianDictionaryForm('noun:anim:m:v_oru')).toBe(false);
    expect(isUkrainianDictionaryForm('verb:imperf:inf')).toBe(true);
    expect(isUkrainianDictionaryForm('verb:imperf:pres:s:3')).toBe(false);
    expect(isUkrainianDictionaryForm('adj:m:v_naz:compb')).toBe(true);
    expect(isUkrainianDictionaryForm('adj:m:v_naz:compr')).toBe(false);
    expect(isUkrainianDictionaryForm('adv:compb')).toBe(true);
  });

  it('shares a form between its lemmas, keeps rare words for bonus only, leaves names and offensive words out', () => {
    const a = (form: string, lemma: string, tags: string) => ({ form, lemma, tags });
    const lists = ukrainianLists(
      [
        a('кіт', 'кіт', 'noun:anim:m:v_naz'),
        a('котом', 'кіт', 'noun:anim:m:v_oru'),
        a('став', 'став', 'noun:inanim:m:v_naz'),
        a('став', 'стати', 'verb:perf:past:m'),
        a('стати', 'стати', 'verb:perf:inf'),
        a('вебер', 'вебер', 'noun:inanim:m:v_naz'),
        a('Вебер', 'Вебер', 'noun:anim:m:v_naz:prop:lname'),
        a('лихва', 'лихва', 'noun:inanim:f:v_naz:arch'),
        a('дупа', 'дупа', 'noun:inanim:f:v_naz:vulg'),
        a('його', 'він', 'noun:anim:m:v_rod:&pron:pers:3'),
      ],
      freq({ кіт: 1, котом: 9, став: 4, стати: 3, вебер: 4, лихва: 5, дупа: 9 }),
    );
    // став: 4 shared by two lemmas = 2; вебер: 4 shared with the name = 2; кіт: its own form only = 1.
    expect(lists.answers).toEqual(['стати', 'вебер', 'став', 'кіт']);
    expect(lists.accepted).toEqual(['вебер', 'кіт', 'лихва', 'став', 'стати']);
  });
});
