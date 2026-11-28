// What stays on the device (localStorage): settings, the puzzle begun of each size and of the day, the days of the
// puzzle of the day, statistics, the screen open last. Nothing leaves the device (docs/jigsaw/SPEC.md, "Що
// зберігається"). Every read survives a missing or broken value; a saved puzzle carries a format version, and one in
// another format (or one that does not hold together) is dropped rather than break the game.
import { DIFFICULTIES, JIGSAW, type Difficulty } from '../config.ts';
import { validPlay, type JigsawPlay } from '../core/play.ts';
import { startTurns } from '../core/turns.ts';
import { emptyStats, type JigsawStats, type SizeStats } from '../core/stats.ts';

const PREFIX = 'way1ong-jigsaw:v1:';
/** The format of a saved puzzle; one saved in another format is not continued. */
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

export type Look = 'system' | 'light' | 'dark';

/** docs/jigsaw/SPEC.md, "Налаштування". */
export interface Settings {
  lang: string | null;
  /** The pale picture on the board (decision of 28.11: on, a switch in the menu). */
  ghost: boolean;
  /** Turned pieces (decision of 28.11: off, a switch in the menu). */
  turning: boolean;
  time: boolean;
  vibration: boolean;
  big: boolean;
  leftHand: boolean;
  theme: Look;
}

export const DEFAULT_SETTINGS: Settings = {
  lang: null,
  ghost: JIGSAW.defaultGhost,
  turning: JIGSAW.defaultTurning,
  time: false,
  vibration: false,
  big: false,
  leftHand: false,
  theme: 'system',
};

const oneOf = <T extends string>(value: unknown, options: readonly T[], fallback: T): T => options.find((o) => o === value) ?? fallback;
const flag = (value: unknown, fallback: boolean): boolean => (typeof value === 'boolean' ? value : fallback);
const count = (value: unknown): number => (typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : 0);

export function loadSettings(): Settings {
  const s = read<Partial<Settings>>('settings') ?? {};
  const d = DEFAULT_SETTINGS;
  return {
    lang: typeof s.lang === 'string' ? s.lang : null,
    ghost: flag(s.ghost, d.ghost),
    turning: flag(s.turning, d.turning),
    time: flag(s.time, d.time),
    vibration: flag(s.vibration, d.vibration),
    big: flag(s.big, d.big),
    leftHand: flag(s.leftHand, d.leftHand),
    theme: oneOf(s.theme, ['system', 'light', 'dark'] as const, d.theme),
  };
}

export function saveSettings(settings: Settings): void {
  write('settings', settings);
}

/** Where a puzzle is kept: one of each size of free play, and the puzzle of the day. */
export const SLOTS = [...DIFFICULTIES, 'day'] as const;
export type Slot = (typeof SLOTS)[number];

export const isSlot = (value: string): value is Slot => (SLOTS as readonly string[]).includes(value);

export const slotOf = (play: JigsawPlay): Slot => (play.way === 'daily' ? 'day' : play.difficulty);

/** A saved puzzle holds together and fits its slot: the size of free play, or the day's size and date. */
function wholePlay(play: unknown, slot: Slot): play is JigsawPlay {
  const p = play as JigsawPlay | null;
  if (!p || typeof p !== 'object' || !validPlay(p)) return false;
  return slot === 'day' ? p.way === 'daily' && p.difficulty === JIGSAW.daily : p.way === 'free' && p.difficulty === slot;
}

interface Saved {
  version: number;
  play: JigsawPlay;
}

const playKey = (slot: Slot) => `play:${slot}`;

/** A puzzle saved before pieces could be turned: how they lie comes from its seed, as for a new one. */
function withTurns(play: JigsawPlay | null): JigsawPlay | null {
  if (!play || typeof play !== 'object' || play.turns !== undefined) return play;
  const size = (JIGSAW.sizes as Record<string, { cols: number; rows: number } | undefined>)[play.difficulty];
  return size && Number.isInteger(play.seed) ? { ...play, turns: startTurns(size.cols * size.rows, play.seed) } : play;
}

/** The puzzle begun in a slot; of the day — only if it is today's. */
export function loadPlay(slot: Slot, today: string): JigsawPlay | null {
  const saved = read<Saved>(playKey(slot));
  if (!saved || saved.version !== PLAY_VERSION) return null;
  const play = withTurns(saved.play);
  if (!wholePlay(play, slot)) return null;
  if (play.way === 'daily' && play.daily !== today) return null;
  return play;
}

export function savePlay(play: JigsawPlay): void {
  write(playKey(slotOf(play)), { version: PLAY_VERSION, play } satisfies Saved);
}

export function dropPlay(slot: Slot): void {
  remove(playKey(slot));
}

/** How a puzzle of the day went. */
export interface DayResult {
  ms: number;
  clean: boolean;
}

/** The days the puzzle of the day was put together: date "YYYY-MM-DD" → result. */
export type Days = Record<string, DayResult>;

export function loadDays(): Days {
  const v = read<Record<string, Partial<DayResult>>>('days');
  if (!v || typeof v !== 'object') return {};
  const out: Days = {};
  for (const [date, r] of Object.entries(v)) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(date) && r && typeof r === 'object') out[date] = { ms: count(r.ms), clean: r.clean === true };
  }
  return out;
}

export function saveDayResult(date: string, result: DayResult): void {
  write('days', { ...loadDays(), [date]: result });
}

export function loadStats(): JigsawStats {
  const v = read<Partial<Record<Difficulty, Partial<SizeStats>>>>('stats') ?? {};
  const stats = emptyStats();
  for (const d of DIFFICULTIES) {
    const s = v[d];
    if (s && typeof s === 'object') {
      const best = typeof s.bestMs === 'number' && Number.isFinite(s.bestMs) && s.bestMs >= 0 ? Math.round(s.bestMs) : null;
      stats[d] = { played: count(s.played), won: count(s.won), clean: count(s.clean), bestMs: best };
    }
  }
  return stats;
}

export function saveStats(stats: JigsawStats): void {
  write('stats', stats);
}

/** The screen open last time, to open again; '' — the start screen. */
export function loadLast(): string {
  const v = read<unknown>('last');
  return typeof v === 'string' ? v : '';
}

export function saveLast(route: string): void {
  if (route) write('last', route);
  else remove('last');
}

/** Whether a puzzle has ever been put together on this device: until then the game says how to play. */
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
