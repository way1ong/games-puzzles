// Loading a language's word lists. Each list is a plain text file of its own next to the game (their licences
// want them as separate, replaceable files — games/words/dict/<lang>/NOTICE.txt); the browser keeps them with
// the game's other files, so they work offline too.
import type { WordLang } from '../config.ts';
import { makeDictionary, type Dictionary } from '../core/dictionary.ts';
import enAccepted from '../dict/en/accepted.txt?url';
import enAnswers from '../dict/en/answers.txt?url';
import enNotice from '../dict/en/NOTICE.txt?url';
import huAccepted from '../dict/hu/accepted.txt?url';
import huAnswers from '../dict/hu/answers.txt?url';
import huNotice from '../dict/hu/NOTICE.txt?url';
import ukAccepted from '../dict/uk/accepted.txt?url';
import ukAnswers from '../dict/uk/answers.txt?url';
import ukLicence from '../dict/uk/LICENSE-LGPL-2.1.txt?url';
import ukNotice from '../dict/uk/NOTICE.txt?url';

/** Each language's lists, the notice of their sources and the full licence text their licence asks to go with them. */
const FILES: Record<WordLang, { answers: string; accepted: string; notice: string; licence: string | null }> = {
  en: { answers: enAnswers, accepted: enAccepted, notice: enNotice, licence: null },
  hu: { answers: huAnswers, accepted: huAccepted, notice: huNotice, licence: null },
  uk: { answers: ukAnswers, accepted: ukAccepted, notice: ukNotice, licence: ukLicence },
};

const loaded = new Map<string, Promise<Dictionary>>();

/**
 * A file's text. The one-file build (the claude.ai test page) carries the files inside the page as data:
 * addresses, and a page there may not fetch even those: they are read here instead.
 */
export async function loadText(url: string): Promise<string> {
  if (url.startsWith('data:')) return fromDataUrl(url);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  return response.text();
}

/** The text a data: address carries (base64 or percent-encoded UTF-8). */
export function fromDataUrl(url: string): string {
  const comma = url.indexOf(',');
  if (comma < 0) throw new Error('Not a data: address');
  const data = url.slice(comma + 1);
  if (!url.slice(0, comma).endsWith(';base64')) return decodeURIComponent(data);
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

/** The language's dictionary for the tile setting (loaded once per visit). */
export function loadDictionary(lang: WordLang, huTiles: boolean): Promise<Dictionary> {
  const key = `${lang}:${huTiles}`;
  let promise = loaded.get(key);
  if (!promise) {
    const files = FILES[lang];
    promise = Promise.all([loadText(files.answers), loadText(files.accepted)]).then(([answers, accepted]) =>
      makeDictionary(lang, answers, accepted, { huTiles }),
    );
    promise.catch(() => loaded.delete(key));
    loaded.set(key, promise);
  }
  return promise;
}

/** The sources and licences of a language's lists, as written next to them. */
export function loadNotice(lang: WordLang): Promise<string> {
  return loadText(FILES[lang].notice);
}

/** Whether a language's lists come with a full licence text to show. */
export const hasLicence = (lang: WordLang): boolean => FILES[lang].licence !== null;

/** The full licence text that comes with a language's lists. */
export function loadLicence(lang: WordLang): Promise<string> {
  const url = FILES[lang].licence;
  return url ? loadText(url) : Promise.reject(new Error(`No licence text for ${lang}`));
}
