// What stays on the device (localStorage): settings, the level reached and its unfinished layout, today's layout
// of the day, the results of the days, statistics. Nothing leaves the device (docs/pairs/SPEC.md, "Що
// зберігається"). Every read survives a missing or broken value; a saved layout carries a format version, and
// one in another format (or one that does not fit its layout) is dropped rather than break the game.
import { PICTURES } from '../config.ts';
import { LAYOUTS, isLayoutName, slotsOf } from '../core/layouts.ts';
import type { PairsPlay, Step } from '../core/play.ts';
import { emptyStats, type Stats } from '../core/stats.ts';

const PREFIX = 'way1ong-pairs:v1:';
/** The format of a saved layout; one saved in another format is not continued. */
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

export type Theme = 'system' | 'light' | 'dark';

export interface Settings {
  lang: string | null;
  /** Shade the tiles that cannot be taken now. */
  dim: boolean;
  /** Show how many pairs can be taken now. */
  pairs: boolean;
  time: boolean;
  big: boolean;
  theme: Theme;
}

/** As approved on 25.11 (docs/pairs/SPEC.md, "Налаштування"). */
export const DEFAULT_SETTINGS: Settings = {
  lang: null,
  dim: true,
  pairs: true,
  time: false,
  big: false,
  theme: 'system',
};

const oneOf = <T extends string>(value: unknown, options: readonly T[], fallback: T): T =>
  options.find((o) => o === value) ?? fallback;
const flag = (value: unknown, fallback: boolean): boolean => (typeof value === 'boolean' ? value : fallback);
const count = (value: unknown): number => (typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : 0);

export function loadSettings(): Settings {
  const s = read<Partial<Settings>>('settings') ?? {};
  const d = DEFAULT_SETTINGS;
  return {
    lang: typeof s.lang === 'string' ? s.lang : null,
    dim: flag(s.dim, d.dim),
    pairs: flag(s.pairs, d.pairs),
    time: flag(s.time, d.time),
    big: flag(s.big, d.big),
    theme: oneOf(s.theme, ['system', 'light', 'dark'], d.theme),
  };
}

export function saveSettings(settings: Settings): void {
  write('settings', settings);
}

/** The level to play next (the first one at the start). */
export function loadLevel(): number {
  return Math.max(1, count(read<number>('level')));
}

export function saveLevel(level: number): void {
  write('level', level);
}

/** Where a layout lives: the current level, or today's layout of the day. */
export type Slot = 'level' | 'daily';

const isIndex = (n: unknown, size: number): n is number => Number.isInteger(n) && (n as number) >= 0 && (n as number) < size;

function validStep(step: unknown, size: number): step is Step {
  const s = step as { take?: unknown; shuffle?: unknown } | null;
  if (!s) return false;
  if (Array.isArray(s.take)) return s.take.length === 2 && s.take.every((i) => isIndex(i, size));
  return Array.isArray(s.shuffle) && s.shuffle.length === size && s.shuffle.every((k) => isIndex(k, PICTURES.length));
}

function validPlay(play: unknown): play is PairsPlay {
  const p = play as Partial<PairsPlay> | null;
  if (!p || typeof p.layout !== 'string' || !isLayoutName(p.layout)) return false;
  const size = slotsOf(LAYOUTS[p.layout]).length;
  return (
    (p.number === null || (Number.isInteger(p.number) && (p.number as number) >= 1)) &&
    (p.daily === null || typeof p.daily === 'string') &&
    (p.number === null) !== (p.daily === null) &&
    Number.isInteger(p.seed) &&
    Array.isArray(p.kinds) &&
    p.kinds.length === size &&
    p.kinds.every((k) => isIndex(k, PICTURES.length)) &&
    Array.isArray(p.present) &&
    p.present.length === size &&
    p.present.every((b) => typeof b === 'boolean') &&
    Array.isArray(p.history) &&
    p.history.every((s) => validStep(s, size)) &&
    typeof p.hints === 'number' &&
    typeof p.shuffles === 'number' &&
    typeof p.ms === 'number' &&
    typeof p.done === 'boolean'
  );
}

interface Saved {
  version: number;
  play: PairsPlay;
}

const playKey = (slot: Slot) => `play:${slot}`;

/** The saved layout of a place: the level's if it is the level reached, the day's if it is today's. */
export function loadPlay(slot: Slot, level: number, today: string): PairsPlay | null {
  const saved = read<Saved>(playKey(slot));
  if (!saved || saved.version !== PLAY_VERSION || !validPlay(saved.play)) return null;
  const p = saved.play;
  if (slot === 'level' ? p.number !== level : p.daily !== today) return null;
  return p;
}

export function savePlay(slot: Slot, play: PairsPlay): void {
  write(playKey(slot), { version: PLAY_VERSION, play } satisfies Saved);
}

export function dropPlay(slot: Slot): void {
  remove(playKey(slot));
}

/** How a layout of the day went: hints, shuffles and time. */
export interface DayResult {
  hints: number;
  shuffles: number;
  ms: number;
}

/** Results of the days: date "YYYY-MM-DD" → result. */
export type Days = Record<string, DayResult>;

export function loadDays(): Days {
  const v = read<Days>('days');
  if (!v || typeof v !== 'object') return {};
  const out: Days = {};
  for (const [date, r] of Object.entries(v)) {
    if (r && typeof r === 'object') out[date] = { hints: count(r.hints), shuffles: count(r.shuffles), ms: typeof r.ms === 'number' ? r.ms : 0 };
  }
  return out;
}

export function saveDayResult(date: string, result: DayResult): void {
  write('days', { ...loadDays(), [date]: result });
}

export function loadStats(): Stats {
  const v = read<Partial<Stats>>('stats') ?? emptyStats();
  return { levels: count(v.levels), levelsClean: count(v.levelsClean), days: count(v.days), daysClean: count(v.daysClean) };
}

export function saveStats(stats: Stats): void {
  write('stats', stats);
}

/** The layout open last time, to open again; null — the start screen. */
export function loadLast(): Slot | null {
  const v = read<string>('last');
  return v === 'level' || v === 'daily' ? v : null;
}

export function saveLast(slot: Slot | null): void {
  if (slot) write('last', slot);
  else remove('last');
}

/** Whether a pair has ever been taken on this device: until then the game says how to play. */
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
