// Dictionaries: the same keys and parameters in every language, every plural form the language needs, and
// a name for everything the game looks up by name.
import { describe, expect, it } from 'vitest';
import { STORIES, STORY_IDS } from '../core/cases.ts';
import { ALL_DAILY_FRAMES } from '../core/daily.ts';
import { AWAYS, CIRCUMSTANCE_KINDS, LEVELS, VISITS } from '../core/facts.ts';
import { REGIONS } from '../core/game.ts';
import { PERSON_IDS } from '../core/people.ts';
import { ROOM_IDS, SPOTS } from '../core/rooms.ts';
import { ORDINARY } from '../core/things.ts';
import { ALL_CLUES } from '../core/traits.ts';
import en from './en.json';
import hu from './hu.json';
import uk from './uk.json';

type Tree = { [key: string]: string | Tree };

const dictionaries: Record<string, Tree> = { en, hu, uk };
const PLURAL_FORMS = new Set(['zero', 'one', 'two', 'few', 'many', 'other']);

const isPlural = (value: Tree) => Object.keys(value).every((k) => PLURAL_FORMS.has(k));

/** Key path → its texts (all forms of a plural set). */
function texts(tree: Tree, prefix = ''): Map<string, Record<string, string>> {
  const out = new Map<string, Record<string, string>>();
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') out.set(path, { text: value });
    else if (isPlural(value)) out.set(path, value as Record<string, string>);
    else for (const [p, t] of texts(value, path)) out.set(p, t);
  }
  return out;
}

const params = (forms: Record<string, string>) =>
  [...new Set(Object.values(forms).flatMap((t) => [...t.matchAll(/\{(\w+)\}/g)].map((m) => m[1])))].sort();

const reference = texts(en);

describe.each(Object.entries(dictionaries))('dictionary %s', (lang, dict) => {
  const own = texts(dict);

  it('has the same keys as English', () => {
    expect([...own.keys()].sort()).toEqual([...reference.keys()].sort());
  });

  it('has the same parameters in every text', () => {
    for (const [key, forms] of reference) {
      const mine = own.get(key);
      if (mine) expect(params(mine), key).toEqual(params(forms));
    }
  });

  it('has exactly the plural forms this language uses, and no empty text', () => {
    const needed = new Intl.PluralRules(lang).resolvedOptions().pluralCategories.slice().sort();
    for (const [key, forms] of own) {
      if (!('text' in forms)) expect(Object.keys(forms).sort(), key).toEqual(needed);
      for (const t of Object.values(forms)) expect(t.trim(), key).not.toBe('');
    }
  });
});

it('Ukrainian texts use the typographic apostrophe', () => {
  for (const [key, forms] of texts(uk)) {
    for (const t of Object.values(forms)) expect(t.includes("'"), key).toBe(false);
  }
});

// ---------- what the game looks up by name must be in the dictionary ----------

const keys = (tree: Tree | string | undefined) => Object.keys((tree ?? {}) as Tree).sort();

it('names every thing, trait, place, region, room, person and story of the game — and nothing else', () => {
  expect(keys(en.things)).toEqual([...ORDINARY, ...ALL_CLUES].sort());
  expect(keys(en.traits)).toEqual([...ALL_CLUES].sort());
  expect(keys(en.where)).toEqual([...new Set(ROOM_IDS.flatMap((room) => SPOTS[room].map((s) => s.where)))].sort());
  expect(keys(en.regions)).toEqual([...REGIONS].sort());
  expect(keys(en.rooms)).toEqual([...ROOM_IDS].sort());
  expect(keys(en.people)).toEqual([...PERSON_IDS].sort());
  expect(keys(en.stories)).toEqual([...STORY_IDS, ...ALL_DAILY_FRAMES].sort());
  expect(keys(en.levels)).toEqual([...LEVELS].sort());
  expect(keys(en.visits)).toEqual([...VISITS].sort());
  expect(keys(en.away)).toEqual([...AWAYS].sort());
  expect(keys(en.circumstances)).toEqual([...CIRCUMSTANCE_KINDS].sort());
  // the intro has a line for every level but the easy one
  for (const level of LEVELS) expect(level === 'easy' || level in en.intro, level).toBe(true);
});

it('every story ending names the one who did it', () => {
  for (const [lang, dict] of Object.entries(dictionaries)) {
    for (const [id, story] of Object.entries(dict.stories as Tree)) expect((story as Tree).ending, `${lang} ${id}`).toContain('{name}');
  }
});

it('a hard case has the words of every suspect’s statement, with the time in them — and no other case has any', () => {
  for (const [lang, dict] of Object.entries(dictionaries)) {
    for (const id of STORY_IDS) {
      const says = ((dict.stories as Tree)[id] as Tree).says as Tree | undefined;
      const speakers = STORIES[id].statements.length > 0 ? STORIES[id].suspects.map((s) => s.person).sort() : [];
      expect(keys(says), `${lang} ${id}`).toEqual(speakers);
      for (const text of Object.values(says ?? {})) expect(text, `${lang} ${id}`).toContain('{time}');
    }
  }
});
