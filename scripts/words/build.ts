// Makes the word lists of Words from the downloaded sources (npm run words:fetch first):
// games/words/dict/<lang>/answers.txt (crossword words, the most frequent first), accepted.txt (accepted words)
// and NOTICE.txt (sources, licences, credits). The lists are committed; run this again only to change them.
//   npm run words:build
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { WORDS, type WordLang } from '../../games/words/config.ts';
import { plain } from '../../games/words/core/letters.ts';
import { decodeEntry, readCfsa2, type Analysis } from './cfsa2.ts';
import { englishLists, hungarianLists, isHungarianWordFile, ukrainianLists, type WordLists } from './lists.ts';
import { wordfreqList } from './msgpack.ts';
import { SOURCES, sourceDir } from './sources.ts';

const OUT = 'games/words/dict';
/** Magyar Ispell's modules of common and special vocabulary (not names, not the speller's own corrections). */
const HU_MODULES = [
  'alap',
  'godo',
  'godo2',
  'huhyph',
  'szoszablya',
  'eleonora',
  'idegen',
  'ifjusagi',
  'regies',
  'biologia',
  'fizika',
  'foldrajz',
  'informatika',
  'kemia',
  'matematika',
  'orvosi',
  'sport',
  'zene',
  'teologia',
  'nyelveszet',
];

const text = (path: string) => readFileSync(path, 'utf8');
const wordfreq = (name: string) => wordfreqList(gunzipSync(readFileSync(join(sourceDir('wordfreq'), 'wordfreq', 'data', `${name}.msgpack.gz`))));
const blocklist = (lang: string) =>
  text(join(sourceDir('ldnoobw'), lang))
    .split('\n')
    .map((w) => w.trim())
    .filter(Boolean);

function english(): WordLists {
  const esdb = text(join(sourceDir('esdb'), 'data', 'scowl-pre.txt'));
  return englishLists(esdb, wordfreq('large_en'), blocklist('en'));
}

function hungarian(): WordLists {
  const files: { module: string; text: string }[] = [];
  for (const module of HU_MODULES) {
    const dir = join(sourceDir('magyarispell'), 'szotar', module);
    for (const name of readdirSync(dir)) {
      if (/\.\d$/.test(name) && isHungarianWordFile(name)) files.push({ module, text: text(join(dir, name)) });
    }
  }
  return hungarianLists(files, wordfreq('small_hu'), blocklist('hu'));
}

function ukrainian(): WordLists {
  const dict = readFileSync(join(sourceDir('vesum'), 'org', 'languagetool', 'resource', 'uk', 'ukrainian.dict'));
  const freq = wordfreq('large_uk');
  // Millions of analyses: only those that matter are kept — dictionary forms, and forms people use.
  const analyses: Analysis[] = [];
  readCfsa2(new Uint8Array(dict.buffer, dict.byteOffset, dict.byteLength)).walk((seq) => {
    const entry = decodeEntry(seq);
    if (entry && (entry.form === entry.lemma || freq.has(entry.form.toLowerCase()))) analyses.push(entry);
  });
  return ukrainianLists(analyses, freq);
}

const FREQ_NOTE = `answers.txt was chosen and ordered with word frequencies from ${SOURCES.wordfreq.name}: ${SOURCES.wordfreq.credit}.
It is shared under the ${SOURCES.wordfreq.licence} licence (https://creativecommons.org/licenses/by-sa/4.0/).`;

function notice(lang: WordLang): string {
  const lines = [`Word lists of way1ong Words (${lang}). Made by scripts/words/build.ts from:`, ''];
  if (lang === 'en') {
    lines.push(
      `- ${SOURCES.esdb.name} — ${SOURCES.esdb.credit}. ${SOURCES.esdb.licence}:`,
      '',
      text(join(sourceDir('esdb'), 'Copyright')).trim(),
      '',
    );
  }
  if (lang === 'hu') {
    lines.push(
      `- ${SOURCES.magyarispell.name} — ${SOURCES.magyarispell.credit}. ${SOURCES.magyarispell.licence}.`,
      `  accepted.txt and answers.txt hold its words (only words written with Hungarian letters, of ${WORDS.minWord} to ${WORDS.maxLetters} tiles,`,
      '  a "|" marks a compound’s boundary). They are subject to the terms of the Mozilla Public License, v. 2.0;',
      '  you can obtain a copy at https://mozilla.org/MPL/2.0/. The source: ' + SOURCES.magyarispell.where.repo,
      '',
    );
  }
  if (lang === 'uk') {
    lines.push(
      `- ${SOURCES.vesum.name} — ${SOURCES.vesum.credit}. ${SOURCES.vesum.licence} (LICENSE-LGPL-2.1.txt).`,
      '  accepted.txt and answers.txt hold its lemmas in dictionary form (only words written with Ukrainian letters,',
      `  of ${WORDS.minWord} to ${WORDS.maxLetters} letters, without names, abbreviations and offensive words). Each is a plain text file the game`,
      '  reads as it is and can be replaced. The source: https://github.com/brown-uk/dict_uk',
      '',
    );
  }
  lines.push(`- ${FREQ_NOTE}`, '');
  if (lang !== 'uk') lines.push(`- Offensive words were left out with ${SOURCES.ldnoobw.name} (${SOURCES.ldnoobw.licence}): ${SOURCES.ldnoobw.credit}.`, '');
  return `${lines.join('\n')}\n`;
}

/** Hand-made corrections (scripts/words/curated/README.md). */
function curated(lang: WordLang, kind: 'blocked' | 'not-answers'): Set<string> {
  return new Set(
    text(join('scripts', 'words', 'curated', `${lang}-${kind}.txt`))
      .split('\n')
      .map((line) => line.replace(/#.*/, '').trim())
      .filter(Boolean),
  );
}

function corrected(lang: WordLang, lists: WordLists): WordLists {
  const blocked = curated(lang, 'blocked');
  const notAnswers = curated(lang, 'not-answers');
  const keep = (word: string) => !blocked.has(plain(word));
  return {
    answers: lists.answers.filter((w) => keep(w) && !notAnswers.has(plain(w))),
    accepted: lists.accepted.filter(keep),
  };
}

const builders: Record<WordLang, () => WordLists> = { en: english, hu: hungarian, uk: ukrainian };
for (const lang of Object.keys(builders) as WordLang[]) {
  const lists = corrected(lang, builders[lang]());
  const dir = join(OUT, lang);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'answers.txt'), `${lists.answers.join('\n')}\n`);
  writeFileSync(join(dir, 'accepted.txt'), `${lists.accepted.join('\n')}\n`);
  writeFileSync(join(dir, 'NOTICE.txt'), notice(lang));
  if (lang === 'uk') writeFileSync(join(dir, 'LICENSE-LGPL-2.1.txt'), text(join(sourceDir('magyarispell'), 'COPYING.LGPL')));
  console.log(`${lang}: ${lists.answers.length} crossword words, ${lists.accepted.length} accepted`);
}
