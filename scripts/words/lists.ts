// Which words each language's lists hold (docs/words/SPEC.md, "Слова й словники"): crossword words (common
// dictionary forms), accepted words (any real word in dictionary form; English also its plurals and other
// forms) and words left out everywhere (offensive). Pure functions over the sources' text.
import { WORDS, type WordLang } from '../../games/words/config.ts';
import { BOUNDARY, isWordOf, plain, tileCount } from '../../games/words/core/letters.ts';

export interface WordLists {
  /** Crossword words, the most frequent first. */
  answers: string[];
  /** Accepted words, sorted. */
  accepted: string[];
}

/** A word fits the wheel: only the language's letters, from the shortest to the longest word possible. */
export function fitsWheel(lang: WordLang, word: string): boolean {
  if (!isWordOf(lang, word)) return false;
  // Hungarian: counted in tiles, the way that gives the fewest (two-character letters as one).
  const tiles = tileCount(lang, word, { huTiles: true });
  return plain(word).length >= WORDS.minWord && tiles <= WORDS.maxLetters;
}

const byFrequency = (freq: ReadonlyMap<string, number>) => (a: string, b: string) =>
  (freq.get(plain(b)) ?? 0) - (freq.get(plain(a)) ?? 0) || a.localeCompare(b);

/** The `count` most frequent of the candidates that are used at all. */
function mostFrequent(candidates: Iterable<string>, freq: ReadonlyMap<string, number>, count: number): string[] {
  return [...new Set(candidates)].filter((w) => (freq.get(plain(w)) ?? 0) > 0).sort(byFrequency(freq)).slice(0, count);
}

// ---------- English: ESDB ----------

/** "A", "B", "Z", "C", "D", "_" spelling codes with an optional variant level — the part before the lemma. */
const SPELLING = /^[ABZCD_][.=?v~V\-@x]?$/;
const EN_BLOCKED = /\((?:[^)]*[\s,])?(?:offensive|vulgar)/;
const EN_NOT_ANSWER = /\((?:[^)]*[\s,])?(?:informal|colloquial|nonstandard|slang|dated|archaic|rare|derogatory)/;
const EN_NOT_WORD = /<[^>]*\b(upper|name|demonym|abbr|pre|suf|contraction)\??>/;
const annotation = (w: string) => w.replace(/^[-@!]/, '').replace(/[*\-@~!†]$/, '');

/**
 * ESDB's text ("SIZE [TAGS] ...: [SPELLING ...: ]LEMMA <POS>[ (USAGE)][: FORM, FORM ...]"; "-" as the lemma
 * continues the previous one). Sizes: 35 small … 85 every valid word; the smallest size of a line counts.
 */
export function englishLists(esdb: string, freq: ReadonlyMap<string, number>, blockedWords: Iterable<string>): WordLists {
  const { enAnswerSize, enAcceptedSize, answers: count } = WORDS.dictionary;
  const accepted = new Set<string>();
  const candidates = new Set<string>();
  const regional = new Set<string>();
  const blocked = new Set<string>([...blockedWords].map((w) => w.toLowerCase()));
  let lemma = '';
  let lemmaInfo = '';
  for (const line of esdb.split('\n')) {
    if (!line || line.startsWith('#')) continue;
    const parts = line.split(': ');
    const size = Math.min(...(parts[0]!.match(/\b\d+\b/g) ?? ['999']).map(Number));
    let i = 1;
    let spelling = '';
    if (parts[1]?.split(' ').every((t) => SPELLING.test(t))) {
      spelling = parts[1];
      i = 2;
    }
    const info = parts[i] ?? '';
    const head = info.split(' ')[0] ?? '';
    if (head !== '-') {
      lemma = annotation(head);
      lemmaInfo = info;
    }
    const about = `${lemmaInfo} ${info}`;
    const derived = parts
      .slice(i + 1)
      .join(': ')
      .split(', ')
      .map((f) => annotation(f.trim()))
      .filter(Boolean);
    const forms = head === '-' ? derived : [lemma, ...derived];
    if (EN_BLOCKED.test(about)) {
      for (const f of forms) blocked.add(f);
      continue;
    }
    if (EN_NOT_WORD.test(about)) continue;
    // Spelled differently in different countries (color/colour): accepted, never a crossword word.
    if (spelling && !spelling.split(' ').some((t) => t.startsWith('_'))) for (const f of forms) regional.add(f);
    if (size <= enAcceptedSize) for (const f of forms) if (fitsWheel('en', f)) accepted.add(f);
    if (head !== '-' && size <= enAnswerSize && !EN_NOT_ANSWER.test(about) && fitsWheel('en', lemma)) candidates.add(lemma);
  }
  for (const w of blocked) accepted.delete(w);
  const answers = mostFrequent(
    [...candidates].filter((w) => !blocked.has(w) && !regional.has(w)),
    freq,
    count,
  );
  for (const w of answers) accepted.add(w);
  return { answers, accepted: [...accepted].sort() };
}

// ---------- Hungarian: Magyar Ispell ----------

/** Magyar Ispell's word files that hold common words, by part of speech (file name prefix). */
const HU_WORD_FILE = /^(fonev|ige|melleknev|ragozatlan)/;
const HU_NOT_WORD_FILE = /tulajdonnev|kotojeles/;

/**
 * One file of Magyar Ispell: a word per line, optionally "[...]" marks and, after a tab, more fields; a
 * compound's parts are given as "elő|tag" (the boundary is kept, so two letters meeting there stay two).
 */
export function hungarianWords(file: string): string[] {
  const out: string[] = [];
  for (const raw of file.split('\n')) {
    if (!raw || raw.startsWith('#')) continue;
    const fields = raw.split('\t');
    const word = fields[0]!.replace(/\[[^\]]*\]/g, '').trim();
    if (!word || word !== word.toLowerCase()) continue;
    // Compound parts: a field equal to the word once the bars are taken out.
    const split = fields.slice(1).find((f) => f.includes(BOUNDARY) && f.split(BOUNDARY).join('') === word);
    const hy = /\[hy:([^\]]+)\]/.exec(fields[0]!)?.[1];
    const marked = split ?? (hy && hy.split(BOUNDARY).join('') === word ? hy : word);
    out.push(marked);
  }
  return out;
}

export function isHungarianWordFile(name: string): boolean {
  return HU_WORD_FILE.test(name) && !HU_NOT_WORD_FILE.test(name);
}

/**
 * Accepted: every word of the given files that fits the wheel; crossword words: the most frequent of the
 * basic vocabulary ("alap" module).
 */
export function hungarianLists(
  files: { module: string; text: string }[],
  freq: ReadonlyMap<string, number>,
  blockedWords: Iterable<string>,
): WordLists {
  const blocked = new Set([...blockedWords].map((w) => w.toLowerCase()));
  /** Plain word → the word with its compound boundaries, where any file gives them. */
  const accepted = new Map<string, string>();
  const basic = new Set<string>();
  for (const { module, text } of files) {
    for (const word of hungarianWords(text)) {
      const key = plain(word);
      if (!fitsWheel('hu', word) || blocked.has(key)) continue;
      if (!accepted.has(key) || word.includes(BOUNDARY)) accepted.set(key, word);
      if (module === 'alap') basic.add(key);
    }
  }
  const answers = mostFrequent([...basic].map((key) => accepted.get(key)!), freq, WORDS.dictionary.answers);
  return { answers, accepted: [...accepted.values()].sort((a, b) => plain(a).localeCompare(plain(b), 'hu')) };
}

// ---------- Ukrainian: VESUM (LanguageTool build) ----------

const UK_NEVER = /:(prop|fname|lname|patr|abbr|vulg|obsc|bad|alt|subst)(:|$)/;
const UK_NOT_ANSWER = /:(rare|arch|slang|coll|geo|v-u)(:|$)|adjp|pron|numr/;

/** Whether the tags are those of a dictionary form: noun nom. sing. (or plural-only), infinitive, adj. masc. nom., adverb. */
export function isUkrainianDictionaryForm(tags: string): boolean {
  if (tags.startsWith('noun:')) return /:v_naz(:|$)/.test(tags) && (/:(m|f|n):v_naz/.test(tags) || /:ns(:|$)/.test(tags));
  if (tags.startsWith('verb:')) return /:inf(:|$)/.test(tags);
  if (tags.startsWith('adj:')) return /^adj:m:v_naz/.test(tags) && !/:(compr|super|short)(:|$)/.test(tags);
  if (tags === 'adv' || tags.startsWith('adv:')) return !/:(compr|super)(:|$)/.test(tags);
  return false;
}

/**
 * From VESUM's analyses (form, lemma, tags). A form shared by several lemmas lends its frequency to each in an
 * equal share — "став" (pond) is ranked by the share of "став" (he became) it can claim.
 */
export function ukrainianLists(analyses: Iterable<{ form: string; lemma: string; tags: string }>, freq: ReadonlyMap<string, number>): WordLists {
  const lemmasOfForm = new Map<string, Set<string>>();
  const dictionary = new Set<string>();
  /** Never accepted: offensive, non-standard, names, abbreviations, function words. */
  const never = new Set<string>();
  /** Accepted, but not a crossword word: rare, archaic, slang, colloquial… */
  const notAnswer = new Set<string>();
  for (const { form, lemma, tags } of analyses) {
    const key = form.toLowerCase();
    if (freq.has(key)) {
      let set = lemmasOfForm.get(key);
      if (!set) lemmasOfForm.set(key, (set = new Set()));
      // The lemma as written: a name (Вебер) and a common word (вебер) are two lemmas of one form.
      set.add(`${lemma}\t${tags.split(':')[0]}`);
    }
    if (form !== lemma || !fitsWheel('uk', lemma)) continue;
    if (UK_NEVER.test(tags) || /^(conj|prep|part|intj|numr)|pron/.test(tags)) {
      never.add(lemma);
      continue;
    }
    if (!isUkrainianDictionaryForm(tags)) continue;
    dictionary.add(lemma);
    if (UK_NOT_ANSWER.test(tags)) notAnswer.add(lemma);
  }
  const accepted = [...dictionary].filter((w) => !never.has(w));
  // Each crossword candidate is ranked by its own form's frequency, shared among the lemmas that form has.
  const share = new Map<string, number>();
  for (const word of accepted) share.set(word, (freq.get(word) ?? 0) / (lemmasOfForm.get(word)?.size ?? 1));
  const answers = mostFrequent(
    accepted.filter((w) => !notAnswer.has(w)),
    share,
    WORDS.dictionary.answers,
  );
  return { answers, accepted: accepted.sort((a, b) => a.localeCompare(b, 'uk')) };
}
