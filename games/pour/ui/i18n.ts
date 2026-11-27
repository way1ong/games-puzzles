// Texts of the game screen: one dictionary per language (games/pour/i18n/<lang>.json), same keys.
import { pickLang as pick } from '../../../shared/ui/text.ts';
import type en from '../i18n/en.json';

export { fmt, num, plural, type Params, type PluralForms } from '../../../shared/ui/text.ts';
export type Dict = typeof en;

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
  return pick(saved, browser, LANGS, FALLBACK);
}
