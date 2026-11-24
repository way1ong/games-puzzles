// What stays on the device (localStorage): settings, the level reached in each language, the level being played,
// today's daily puzzle, daily results, statistics, reported words. Nothing leaves the device. Every read
// survives a missing or broken value; saved plays carry a format version, and an unknown one is dropped.
import { WORD_LANGS, type WordLang } from '../config.ts';
import type { Play } from '../core/play.ts';

const PREFIX = 'way1ong-words:v1:';
const PLAY_VERSION = 1;

function read<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw === null ? null : (JSON.parse(raw) as T);
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Storage full or blocked: the game goes on without saving.
  }
}

function remove(key: string): void {
  try {
    window.localStorage.removeItem(PREFIX + key);
  } catch {
    // Nothing to remove.
  }
}

export type InputMode = 'both' | 'swipe' | 'tap';
export type Theme = 'system' | 'light' | 'dark';

export interface Settings {
  lang: string | null;
  input: InputMode;
  showCells: boolean;
  showLeft: boolean;
  showBonus: boolean;
  time: boolean;
  grace: boolean;
  huTiles: boolean;
  big: boolean;
  theme: Theme;
  sound: boolean;
  vibration: boolean;
}

/** As decided on 24.11 (docs/words/SPEC.md, "Налаштування"). */
export const DEFAULT_SETTINGS: Settings = {
  lang: null,
  input: 'both',
  showCells: true,
  showLeft: true,
  showBonus: true,
  time: false,
  grace: true,
  huTiles: true,
  big: false,
  theme: 'system',
  sound: false,
  vibration: false,
};

const oneOf = <T extends string>(value: unknown, options: readonly T[], fallback: T): T => options.find((o) => o === value) ?? fallback;
const flag = (value: unknown, fallback: boolean): boolean => (typeof value === 'boolean' ? value : fallback);

export function loadSettings(): Settings {
  const s = read<Partial<Settings>>('settings') ?? {};
  const d = DEFAULT_SETTINGS;
  return {
    lang: typeof s.lang === 'string' ? s.lang : null,
    input: oneOf(s.input, ['both', 'swipe', 'tap'], d.input),
    showCells: flag(s.showCells, d.showCells),
    showLeft: flag(s.showLeft, d.showLeft),
    showBonus: flag(s.showBonus, d.showBonus),
    time: flag(s.time, d.time),
    grace: flag(s.grace, d.grace),
    huTiles: flag(s.huTiles, d.huTiles),
    big: flag(s.big, d.big),
    theme: oneOf(s.theme, ['system', 'light', 'dark'], d.theme),
    sound: flag(s.sound, d.sound),
    vibration: flag(s.vibration, d.vibration),
  };
}

export function saveSettings(settings: Settings): void {
  write('settings', settings);
}

/** One track of play: a language, and for Hungarian whether two-character letters are one tile. */
export interface Track {
  lang: WordLang;
  tiles: boolean;
}

const trackKey = (t: Track) => `${t.lang}:${t.lang === 'hu' && !t.tiles ? 'letters' : 'tiles'}`;

/** The next level to play in this track (from 1). */
export function loadLevelReached(track: Track): number {
  const n = read<number>(`reached:${trackKey(track)}`);
  return typeof n === 'number' && Number.isInteger(n) && n >= 1 ? n : 1;
}

export function saveLevelReached(track: Track, n: number): void {
  write(`reached:${trackKey(track)}`, n);
}

interface Saved {
  version: number;
  play: Play;
}

function validPlay(play: unknown): play is Play {
  const p = play as Partial<Play> | null;
  return (
    !!p &&
    !!p.level &&
    Array.isArray(p.level.letters) &&
    Array.isArray(p.level.words) &&
    Array.isArray(p.found) &&
    Array.isArray(p.bonus) &&
    Array.isArray(p.opened) &&
    typeof p.hints === 'number' &&
    typeof p.ms === 'number' &&
    typeof p.done === 'boolean'
  );
}

/** The level being played in a track; the daily one only if it is today's. */
export function loadPlay(track: Track, daily: string | null): Play | null {
  const saved = read<Saved>(`${daily ? 'daily' : 'play'}:${trackKey(track)}`);
  if (!saved || saved.version !== PLAY_VERSION || !validPlay(saved.play) || saved.play.level.lang !== track.lang) return null;
  if (saved.play.level.daily !== daily) return null;
  return saved.play;
}

export function savePlay(track: Track, play: Play): void {
  write(`${play.level.daily ? 'daily' : 'play'}:${trackKey(track)}`, { version: PLAY_VERSION, play } satisfies Saved);
}

export function dropPlay(track: Track): void {
  remove(`play:${trackKey(track)}`);
}

/** Daily results: date → language → hints asked. */
export type Days = Record<string, Partial<Record<WordLang, { hints: number; ms: number }>>>;

export function loadDays(): Days {
  const v = read<Days>('days');
  return v && typeof v === 'object' ? v : {};
}

export function saveDayResult(date: string, lang: WordLang, result: { hints: number; ms: number }): void {
  const days = loadDays();
  write('days', { ...days, [date]: { ...days[date], [lang]: result } });
}

export interface LangStats {
  levels: number;
  words: number;
  bonus: number;
  hints: number;
  dailies: number;
}

export type Stats = Record<WordLang, LangStats>;

const emptyLang = (): LangStats => ({ levels: 0, words: 0, bonus: 0, hints: 0, dailies: 0 });

export function loadStats(): Stats {
  const v = read<Partial<Stats>>('stats') ?? {};
  const out = Object.fromEntries(WORD_LANGS.map((lang) => [lang, emptyLang()])) as Stats;
  for (const lang of WORD_LANGS) {
    const s = v[lang];
    if (!s) continue;
    for (const k of Object.keys(out[lang]) as (keyof LangStats)[]) if (typeof s[k] === 'number') out[lang][k] = s[k];
  }
  return out;
}

/** Adds a finished level (or daily puzzle) to the statistics. */
export function recordDone(play: Play): void {
  const stats = loadStats();
  const s = stats[play.level.lang];
  stats[play.level.lang] = {
    levels: s.levels + (play.level.daily ? 0 : 1),
    words: s.words + play.found.length,
    bonus: s.bonus + play.bonus.length,
    hints: s.hints + play.hints,
    dailies: s.dailies + (play.level.daily ? 1 : 0),
  };
  write('stats', stats);
}

export interface Reported {
  lang: WordLang;
  word: string;
  verdict: string;
}

export function loadReported(): Reported[] {
  const v = read<Reported[]>('reported');
  return Array.isArray(v) ? v.filter((r) => r && typeof r.word === 'string' && typeof r.lang === 'string') : [];
}

export function addReported(entry: Reported): void {
  const list = loadReported();
  if (!list.some((r) => r.lang === entry.lang && r.word === entry.word)) write('reported', [...list, entry]);
}

/** Whether the screen was ever opened on a daily puzzle or a level: where to open next time. */
export function loadLast(): 'level' | 'daily' | null {
  const v = read<string>('last');
  return v === 'level' || v === 'daily' ? v : null;
}

export function saveLast(last: 'level' | 'daily' | null): void {
  if (last) write('last', last);
  else remove('last');
}

export function loadTipDone(): boolean {
  return read<boolean>('tipDone') === true;
}

export function saveTipDone(): void {
  write('tipDone', true);
}

/** Clears everything but the settings. */
export function clearAll(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k?.startsWith(PREFIX) && k !== `${PREFIX}settings`) keys.push(k);
    }
    for (const k of keys) window.localStorage.removeItem(k);
  } catch {
    // Nothing to clear.
  }
}
