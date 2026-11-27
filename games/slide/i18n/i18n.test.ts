// Dictionaries: the same keys and parameters in every language, every plural form the language needs; the names of
// every look's pieces (docs/slide/SPEC.md, "Три теми навмання").
import { describe, expect, it } from 'vitest';
import en from './en.json';
import hu from './hu.json';
import uk from './uk.json';
import { THEMES } from '../config.ts';

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

it('names the pieces of every look', () => {
  for (const d of [en, hu, uk]) expect(Object.keys(d.pieces).sort()).toEqual([...THEMES].sort());
});
