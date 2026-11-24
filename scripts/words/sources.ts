// Where the word lists of Words come from (docs/words/SPEC.md, "Джерела словників і ліцензії"): pinned
// versions, so the lists can be built again the same way, and the licence each source is used under.
// `npm run words:fetch` downloads them into node_modules/.cache/words-sources; `npm run words:build` makes
// games/words/dict/ from them. Only data is downloaded: no program from these sources is run.

export interface GitSource {
  kind: 'git';
  repo: string;
  commit: string;
}

export interface FileSource {
  kind: 'zip';
  /** A zip archive (a Java .jar or a Python .whl is one): only read, never run. */
  url: string;
}

export interface Source {
  name: string;
  where: GitSource | FileSource;
  /** The licence we use it under, as its authors state it. */
  licence: string;
  credit: string;
}

export const SOURCES = {
  /** English: lemmas, inflections, how common each word is (sizes), usage notes. */
  esdb: {
    name: 'English Speller Database (ESDB, formerly SCOWL)',
    where: { kind: 'git', repo: 'https://github.com/en-wl/wordlist', commit: '1e5b7d3a72f47a71da5d28686c1dd4b397178485' },
    licence: 'MIT-like permission notice of ESDB (file Copyright of the source, reproduced in NOTICE.txt)',
    credit: 'Copyright 2000-2026 by Kevin Atkinson; 12dicts and ENABLE2K by Alan Beale and others',
  },
  /** Hungarian: lemmas by part of speech, compound boundaries. */
  magyarispell: {
    name: 'Magyar Ispell',
    where: { kind: 'git', repo: 'https://github.com/laszlonemeth/magyarispell', commit: '455229e26eaf5c9ed5bb7a4456c131fc0985e399' },
    licence: 'MPL 1.1 or later; used under the Mozilla Public License 2.0',
    credit: 'Németh László, Godó Ferenc and the Magyar Ispell contributors',
  },
  /** Ukrainian: VESUM built for LanguageTool — every form with its lemma and tags. */
  vesum: {
    name: 'VESUM (Великий електронний словник української мови), morfologik-ukrainian-lt 6.8.6',
    where: { kind: 'zip', url: 'https://repo1.maven.org/maven2/ua/net/nlp/morfologik-ukrainian-lt/6.8.6/morfologik-ukrainian-lt-6.8.6.jar' },
    licence: 'GNU Lesser General Public License 2.1 or later',
    credit: 'ВЕСУМ: Андрій Рисін, Василь Старко та учасники проєкту brown-uk/dict_uk',
  },
  /** How often words are used (Hungarian, Ukrainian, English). */
  wordfreq: {
    name: 'wordfreq 3.1.1 (data)',
    where: { kind: 'zip', url: 'https://files.pythonhosted.org/packages/py3/w/wordfreq/wordfreq-3.1.1-py3-none-any.whl' },
    licence: 'Creative Commons Attribution-ShareAlike 4.0 (data)',
    credit:
      'Robyn Speer, wordfreq; data from Google Books Ngrams, the Leeds Internet Corpus, Wikipedia, ParaCrawl, OPUS OpenSubtitles 2018 (OpenSubtitles), SUBTLEX word lists by Marc Brysbaert et al. (freely available data) and Twitter',
  },
  /** Offensive words (English and Hungarian) — only to leave them out. */
  ldnoobw: {
    name: 'List of Dirty, Naughty, Obscene, and Otherwise Bad Words',
    where: {
      kind: 'git',
      repo: 'https://github.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words',
      commit: '5faf2ba42d7b1c0977169ec3611df25a3c08eb13',
    },
    licence: 'Creative Commons Attribution 4.0',
    credit: 'Shutterstock and the LDNOOBW contributors',
  },
} satisfies Record<string, Source>;

export type SourceId = keyof typeof SOURCES;

/** Where the downloaded sources are kept (not in the repository). */
export const CACHE_DIR = 'node_modules/.cache/words-sources';

export const sourceDir = (id: SourceId): string => `${CACHE_DIR}/${id}`;
