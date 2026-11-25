// Short meanings of crossword words (docs/words/SPEC.md, "Значення слів"): a line per word in
// games/words/meanings/<lang>.txt — the word, a tab, its meaning. Own text of way1ong, not taken from other
// dictionaries. Pure, no DOM.

/** Word (as the crossword shows it, in small letters) → its meaning. */
export type Meanings = ReadonlyMap<string, string>;

/** The meanings in a file's text. Blank lines and lines starting with # are skipped, so is a line without a tab. */
export function parseMeanings(text: string): Meanings {
  const out = new Map<string, string>();
  for (const raw of text.split('\n')) {
    const line = raw.replace(/\r$/, '');
    if (!line.trim() || line.startsWith('#')) continue;
    const tab = line.indexOf('\t');
    if (tab <= 0) continue;
    const word = line.slice(0, tab).trim().toLowerCase();
    const meaning = line.slice(tab + 1).trim();
    if (word && meaning && !out.has(word)) out.set(word, meaning);
  }
  return out;
}

/** The meaning of a word; null — none written yet. */
export const meaningOf = (meanings: Meanings, word: string): string | null => meanings.get(word.toLowerCase()) ?? null;
