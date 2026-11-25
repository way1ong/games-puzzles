// Loading a language's word meanings (games/words/meanings/<lang>.txt; docs/words/SPEC.md, "Значення слів"): a file
// next to the game that the browser keeps with the game's other files, so it works offline too; read on the first
// need, once per visit.
import type { WordLang } from '../config.ts';
import { parseMeanings, type Meanings } from '../core/meanings.ts';
import enMeanings from '../meanings/en.txt?url';
import huMeanings from '../meanings/hu.txt?url';
import ukMeanings from '../meanings/uk.txt?url';
import { loadText } from './dict-load.ts';

const FILES: Record<WordLang, string> = { en: enMeanings, hu: huMeanings, uk: ukMeanings };

const loaded = new Map<WordLang, Promise<Meanings>>();

/** The language's meanings (an empty set when the file cannot be read: the game goes on without them). */
export function loadMeanings(lang: WordLang): Promise<Meanings> {
  let promise = loaded.get(lang);
  if (!promise) {
    promise = loadText(FILES[lang]).then(parseMeanings);
    promise.catch(() => loaded.delete(lang));
    loaded.set(lang, promise);
  }
  return promise.catch(() => new Map());
}
