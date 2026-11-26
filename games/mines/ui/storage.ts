// What stays on the device (localStorage): settings, the field begun of each level and of the day, the results of the
// days, statistics, the screen open last, what a tap does, how big fields were seen. Nothing leaves the device
// (docs/mines/SPEC.md, "Що зберігається"). Every read survives a missing or broken value; a saved field carries a
// format version, and one in another format (or one that does not hold together) is dropped rather than break the game.
import { AFTER_MINE, LEVELS, MINES, STARTS, THEMES, type AfterMine, type Level, type Start, type Theme } from '../config.ts';
import { startArea, type Field } from '../core/field.ts';
import { CLOSED_CELL, OPEN, type MinesPlay } from '../core/play.ts';
import { emptyStats, type MinesStats } from '../core/stats.ts';
import type { Mode } from './tools-view.ts';

const PREFIX = 'way1ong-mines:v1:';
/** The format of a saved field; one saved in another format is not continued. */
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

/** As approved on 26.11 (docs/mines/SPEC.md, "Налаштування"). */
export interface Settings {
  lang: string | null;
  /** What hides in the field: mines or flowers. */
  field: Theme;
  start: Start;
  afterMine: AfterMine;
  /** A tap on a number with its flags opens its other neighbours. */
  chord: boolean;
  /** Flags without a mine shown at once. */
  wrongFlags: boolean;
  time: boolean;
  vibration: boolean;
  big: boolean;
  leftHand: boolean;
  theme: Look;
}

export const DEFAULT_SETTINGS: Settings = {
  lang: null,
  field: 'mines',
  start: 'game',
  afterMine: 'restart',
  chord: true,
  wrongFlags: false,
  time: false,
  vibration: false,
  big: false,
  leftHand: false,
  theme: 'system',
};

const oneOf = <T extends string>(value: unknown, options: readonly T[], fallback: T): T => options.find((o) => o === value) ?? fallback;
const flag = (value: unknown, fallback: boolean): boolean => (typeof value === 'boolean' ? value : fallback);
const count = (value: unknown): number => (typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : 0);
const ms = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0);

export function loadSettings(): Settings {
  const s = read<Partial<Settings>>('settings') ?? {};
  const d = DEFAULT_SETTINGS;
  return {
    lang: typeof s.lang === 'string' ? s.lang : null,
    field: oneOf(s.field, THEMES, d.field),
    start: oneOf(s.start, STARTS, d.start),
    afterMine: oneOf(s.afterMine, AFTER_MINE, d.afterMine),
    chord: flag(s.chord, d.chord),
    wrongFlags: flag(s.wrongFlags, d.wrongFlags),
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

/** A field holds together: its level's size and mines, in order and on the field, none in or next to the first place. */
function validField(field: unknown, level: Level): field is Field {
  const f = field as Partial<Field> | null;
  const rule = MINES.levels[level];
  const cells = rule.width * rule.height;
  if (!f || f.width !== rule.width || f.height !== rule.height || !Array.isArray(f.mines) || f.mines.length !== rule.mines) return false;
  if (!Number.isInteger(f.start) || f.start! < 0 || f.start! >= cells) return false;
  const mines = f.mines;
  if (!mines.every((m, i) => Number.isInteger(m) && m >= 0 && m < cells && (i === 0 || m > mines[i - 1]!))) return false;
  const near = new Set(startArea(rule, f.start!));
  return mines.every((m) => !near.has(m));
}

/** A saved field holds together: its level and field, cells of the right kind, the mine shown among them, its counts. */
function validPlay(play: unknown, level: Level, daily: boolean): play is MinesPlay {
  const p = play as Partial<MinesPlay> | null;
  const rule = MINES.levels[level];
  const cells = rule.width * rule.height;
  if (!p || p.level !== level || (p.daily !== null) !== daily || (p.daily !== null && typeof p.daily !== 'string')) return false;
  if (!Number.isInteger(p.seed) || !STARTS.includes(p.start as Start)) return false;
  if (p.field !== null && !validField(p.field, level)) return false;
  if (p.field === null && p.start !== 'player') return false;
  if (typeof p.cells !== 'string' || p.cells.length !== cells || !/^[.FO]*$/.test(p.cells)) return false;
  if (p.field === null && p.cells !== CLOSED_CELL.repeat(cells)) return false;
  if (p.boom !== null && !(Number.isInteger(p.boom) && p.field?.mines.includes(p.boom!) && p.cells[p.boom!] === OPEN)) return false;
  if (!Array.isArray(p.boomOpened) || !p.boomOpened.every((c) => Number.isInteger(c) && c >= 0 && c < cells)) return false;
  // an open mine is only the one being shown
  if (p.field && p.field.mines.some((m) => p.cells![m] === OPEN && m !== p.boom)) return false;
  return count(p.hints) === p.hints && count(p.mistakes) === p.mistakes && ms(p.ms) === p.ms && typeof p.done === 'boolean' && (!p.done || p.boom === null);
}

interface Saved {
  version: number;
  play: MinesPlay;
}

const playKey = (level: Level, daily: boolean) => (daily ? `daily:${level}` : `play:${level}`);

/** The saved field of a level; of the day — only if it is today's. */
export function loadPlay(level: Level, today: string | null): MinesPlay | null {
  const daily = today !== null;
  const saved = read<Saved>(playKey(level, daily));
  if (!saved || saved.version !== PLAY_VERSION || !validPlay(saved.play, level, daily)) return null;
  if (daily && saved.play.daily !== today) return null;
  return saved.play;
}

export function savePlay(play: MinesPlay): void {
  write(playKey(play.level, play.daily !== null), { version: PLAY_VERSION, play } satisfies Saved);
}

export function dropPlay(level: Level, daily: boolean): void {
  remove(playKey(level, daily));
}

/** How a field of the day went. */
export interface DayResult {
  hints: number;
  mistakes: number;
  ms: number;
}

/** Results of the days: date "YYYY-MM-DD" → level → result. */
export type Days = Record<string, Partial<Record<Level, DayResult>>>;

export function loadDays(): Days {
  const v = read<Record<string, Partial<Record<Level, Partial<DayResult>>>>>('days');
  if (!v || typeof v !== 'object') return {};
  const out: Days = {};
  for (const [date, byLevel] of Object.entries(v)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !byLevel || typeof byLevel !== 'object') continue;
    for (const level of LEVELS) {
      const r = byLevel[level];
      if (r && typeof r === 'object') (out[date] ??= {})[level] = { hints: count(r.hints), mistakes: count(r.mistakes), ms: ms(r.ms) };
    }
  }
  return out;
}

export function saveDayResult(date: string, level: Level, result: DayResult): void {
  const days = loadDays();
  write('days', { ...days, [date]: { ...days[date], [level]: result } });
}

export function loadStats(): MinesStats {
  const v = read<Partial<Record<Level, Partial<MinesStats[Level]>>>>('stats') ?? {};
  const stats = emptyStats();
  for (const level of LEVELS) {
    const s = v[level];
    if (!s || typeof s !== 'object') continue;
    stats[level] = { played: count(s.played), won: count(s.won), clean: count(s.clean), bestMs: typeof s.bestMs === 'number' && s.bestMs > 0 ? s.bestMs : null };
  }
  return stats;
}

export function saveStats(stats: MinesStats): void {
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

/** What a tap does (the switch under the field), remembered. */
export function loadMode(): Mode {
  return read<unknown>('mode') === 'flag' ? 'flag' : 'open';
}

export function saveMode(mode: Mode): void {
  write('mode', mode);
}

/** For each level, whether its fields were last seen whole (else zoomed in). */
export function loadWhole(): Partial<Record<Level, boolean>> {
  const v = read<Partial<Record<Level, unknown>>>('whole') ?? {};
  const out: Partial<Record<Level, boolean>> = {};
  for (const level of LEVELS) if (typeof v[level] === 'boolean') out[level] = v[level] as boolean;
  return out;
}

export function saveWhole(level: Level, whole: boolean): void {
  write('whole', { ...loadWhole(), [level]: whole });
}

/** Whether a field has ever been cleared on this device: until then the game says how to play. */
export function loadTipDone(): boolean {
  return read<boolean>('tipDone') === true;
}

export function saveTipDone(): void {
  write('tipDone', true);
}

/** Whether the player has moved or zoomed a big field once: until then the game says how. */
export function loadZoomTipDone(): boolean {
  return read<boolean>('zoomTipDone') === true;
}

export function saveZoomTipDone(): void {
  write('zoomTipDone', true);
}

/** Clears everything but the settings (and what a tap does). */
export function clearAll(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k?.startsWith(PREFIX) && k !== `${PREFIX}settings` && k !== `${PREFIX}mode`) keys.push(k);
    }
    for (const k of keys) window.localStorage.removeItem(k);
  } catch {
    // Nothing to clear.
  }
}

