// Texts of the game screen: one dictionary per language (games/blocks/i18n/<lang>.json), same keys.
import type en from '../i18n/en.json';

export type Dict = typeof en;
export type PluralForms = { other: string } & Partial<Record<Intl.LDMLPluralRule, string>>;
export type Params = Record<string, string | number>;

const modules = import.meta.glob<Dict>('../i18n/*.json', { eager: true, import: 'default' });
const dictionaries = new Map<string, Dict>(
  Object.entries(modules).map(([path, d]) => [path.replace(/^.*\/([a-z]+)\.json$/, '$1'), d]),
);

/** Languages in the order of the dictionaries' file names. */
export const LANGS = [...dictionaries.keys()];
export const FALLBACK = 'en';

export function dict(lang: string): Dict {
  return dictionaries.get(lang) ?? (dictionaries.get(FALLBACK) as Dict);
}

/** The saved choice, else the first browser language we have, else English. */
export function pickLang(saved: string | null, browser: readonly string[]): string {
  if (saved && dictionaries.has(saved)) return saved;
  for (const tag of browser) {
    const code = tag.toLowerCase().split('-')[0] ?? '';
    if (dictionaries.has(code)) return code;
  }
  return FALLBACK;
}

export function fmt(text: string, params: Params = {}): string {
  return text.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match));
}

export function plural(lang: string, n: number, forms: PluralForms, params: Params = {}): string {
  const text = forms[new Intl.PluralRules(lang).select(n)] ?? forms.other;
  return fmt(text, params);
}

export function num(lang: string, n: number): string {
  return new Intl.NumberFormat(lang).format(n);
}
