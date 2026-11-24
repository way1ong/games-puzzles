// What stays on the device (localStorage): settings, unfinished games, puzzles made in advance, daily results,
// statistics. Nothing leaves the device. Every read survives a missing or broken value; saved games carry a
// format version, and an unknown one is dropped rather than break the game.
import { LEVELS, type Level } from '../config.ts';
import type { Game } from '../core/game.ts';
import type { Puzzle } from '../core/generate.ts';
import { CELLS } from '../core/grid.ts';
import { emptyStats, type LevelStats, type Stats } from '../core/stats.ts';

const PREFIX = 'way1ong-sudoku:v1:';
/** The format of a saved game; a game saved in another format is not continued. */
const GAME_VERSION = 1;

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

export type ErrorMode = 'off' | 'repeats' | 'solution';
export type InputMode = 'cell' | 'digit';
export type Theme = 'system' | 'light' | 'dark';

export interface Settings {
  lang: string | null;
  autoNotes: boolean;
  fillButton: boolean;
  errors: ErrorMode;
  peers: boolean;
  same: boolean;
  counts: boolean;
  input: InputMode;
  time: boolean;
  big: boolean;
  theme: Theme;
  sound: boolean;
  vibration: boolean;
}

/** As approved on 24.11 (docs/sudoku/SPEC.md, "Налаштування"). */
export const DEFAULT_SETTINGS: Settings = {
  lang: null,
  autoNotes: true,
  fillButton: false,
  errors: 'repeats',
  peers: true,
  same: true,
  counts: true,
  input: 'cell',
  time: false,
  big: false,
  theme: 'system',
  sound: false,
  vibration: false,
};

const oneOf = <T extends string>(value: unknown, options: readonly T[], fallback: T): T =>
  options.find((o) => o === value) ?? fallback;
const flag = (value: unknown, fallback: boolean): boolean => (typeof value === 'boolean' ? value : fallback);

export function loadSettings(): Settings {
  const s = read<Partial<Settings>>('settings') ?? {};
  const d = DEFAULT_SETTINGS;
  return {
    lang: typeof s.lang === 'string' ? s.lang : null,
    autoNotes: flag(s.autoNotes, d.autoNotes),
    fillButton: flag(s.fillButton, d.fillButton),
    errors: oneOf(s.errors, ['off', 'repeats', 'solution'], d.errors),
    peers: flag(s.peers, d.peers),
    same: flag(s.same, d.same),
    counts: flag(s.counts, d.counts),
    input: oneOf(s.input, ['cell', 'digit'], d.input),
    time: flag(s.time, d.time),
    big: flag(s.big, d.big),
    theme: oneOf(s.theme, ['system', 'light', 'dark'], d.theme),
    sound: flag(s.sound, d.sound),
    vibration: flag(s.vibration, d.vibration),
  };
}

export function saveSettings(settings: Settings): void {
  write('settings', settings);
}

/** Where a game lives: an ordinary game of a level, or today's daily puzzle of a level. */
export interface Slot {
  daily: boolean;
  level: Level;
}

const slotKey = (slot: Slot) => `${slot.daily ? 'daily' : 'game'}:${slot.level}`;

const isGrid = (text: unknown): text is string => typeof text === 'string' && text.length === CELLS && /^[0-9]+$/.test(text);
const isCells = (list: unknown): list is number[] =>
  Array.isArray(list) && list.length === CELLS && list.every((n) => Number.isInteger(n) && n >= 0);

function validGame(game: unknown, slot: Slot): game is Game {
  const g = game as Partial<Game> | null;
  return (
    !!g &&
    g.level === slot.level &&
    isGrid(g.givens) &&
    isGrid(g.solution) &&
    isCells(g.digits) &&
    isCells(g.notes) &&
    Array.isArray(g.undo) &&
    Array.isArray(g.redo) &&
    typeof g.hints === 'number' &&
    typeof g.ms === 'number' &&
    typeof g.solved === 'boolean'
  );
}

interface Saved {
  version: number;
  game: Game;
}

/** The saved game of a slot; a daily puzzle only if it is today's. */
export function loadGame(slot: Slot, today: string): Game | null {
  const saved = read<Saved>(slotKey(slot));
  if (!saved || saved.version !== GAME_VERSION || !validGame(saved.game, slot)) return null;
  if (slot.daily && saved.game.daily !== today) return null;
  if (!slot.daily && saved.game.daily !== null) return null;
  return saved.game;
}

export function saveGame(slot: Slot, game: Game): void {
  write(slotKey(slot), { version: GAME_VERSION, game } satisfies Saved);
}

export function dropGame(slot: Slot): void {
  remove(slotKey(slot));
}

/** A puzzle of the level made in advance, if one is waiting. */
export function loadReady(level: Level): Puzzle | null {
  const p = read<Puzzle>(`ready:${level}`);
  return p && p.level === level && isGrid(p.givens) && isGrid(p.solution) && typeof p.seed === 'number' ? p : null;
}

export function saveReady(puzzle: Puzzle): void {
  write(`ready:${puzzle.level}`, puzzle);
}

export function dropReady(level: Level): void {
  remove(`ready:${level}`);
}

/** How a daily puzzle went: hints asked and time. */
export interface DayResult {
  hints: number;
  ms: number;
}

/** Daily results: date "YYYY-MM-DD" → level → result. */
export type Days = Record<string, Partial<Record<Level, DayResult>>>;

export function loadDays(): Days {
  const v = read<Days>('days');
  return v && typeof v === 'object' ? v : {};
}

export function saveDayResult(date: string, level: Level, result: DayResult): void {
  const days = loadDays();
  write('days', { ...days, [date]: { ...days[date], [level]: result } });
}

export function loadStats(): Stats {
  const v = read<Partial<Stats>>('stats') ?? {};
  const stats = emptyStats();
  for (const level of LEVELS) {
    const s = v[level] as Partial<LevelStats> | undefined;
    if (!s) continue;
    stats[level] = {
      solved: typeof s.solved === 'number' ? s.solved : 0,
      clean: typeof s.clean === 'number' ? s.clean : 0,
      bestMs: typeof s.bestMs === 'number' ? s.bestMs : null,
    };
  }
  return stats;
}

export function saveStats(stats: Stats): void {
  write('stats', stats);
}

/** The game open last time, to open again; null — the start screen. */
export function loadLast(): Slot | null {
  const v = read<Slot>('last');
  if (!v || typeof v.daily !== 'boolean' || !LEVELS.includes(v.level)) return null;
  return { daily: v.daily, level: v.level };
}

export function saveLast(slot: Slot | null): void {
  if (slot) write('last', slot);
  else remove('last');
}

/** Whether a digit has ever been placed on this device: until then the game shows how to place one. */
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
