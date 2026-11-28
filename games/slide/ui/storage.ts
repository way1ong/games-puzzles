// What stays on the device (localStorage): settings, the level reached in "Clear the way" and in "The chest", the game
// begun on each screen, the days of each mode's puzzle of the day, statistics, the screen open last. Nothing leaves the
// device (docs/slide/SPEC.md, "Що зберігається"). Every read survives a missing or broken value; a saved game carries a
// format version, and one in another format (or one that does not hold together) is dropped rather than break the game.
import { DIFFICULTIES, FACES, FIFTEEN_KINDS, SLIDE, THEME_CHOICES, type Difficulty, type Face, type FifteenKind, type ThemeChoice } from '../config.ts';
import { levelPuzzle } from '../core/level.ts';
import { fifteenFewest, validPlay, type BoxPlay, type FifteenPlay, type SlidePlay, type UnblockPlay } from '../core/play.ts';
import type { PoolPuzzle } from '../core/pool.ts';
import { emptyStats, type FifteenStats, type SlideStats, type UnblockStats, type WaysStats } from '../core/stats.ts';

const PREFIX = 'way1ong-slide:v1:';
/** The format of a saved game; one saved in another format is not continued. */
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

/** docs/slide/SPEC.md, "Налаштування". */
export interface Settings {
  lang: string | null;
  /** What the tiles of the fifteen show (decision of 27.11: both in the menu). */
  faces: Face;
  /** The look of "Clear the way" (decision of 28.11): drawn for each puzzle, or always one. */
  unblockTheme: ThemeChoice;
  /** "The chest": Hard no longer than SLIDE.box.hardCap moves (decision of 28.11: «зроби опційно»; off). */
  boxShort: boolean;
  time: boolean;
  vibration: boolean;
  big: boolean;
  leftHand: boolean;
  theme: Look;
}

export const DEFAULT_SETTINGS: Settings = {
  lang: null,
  faces: SLIDE.fifteen.defaultFace,
  unblockTheme: 'random',
  boxShort: false,
  time: false,
  vibration: false,
  big: false,
  leftHand: false,
  theme: 'system',
};

const oneOf = <T extends string>(value: unknown, options: readonly T[], fallback: T): T => options.find((o) => o === value) ?? fallback;
const flag = (value: unknown, fallback: boolean): boolean => (typeof value === 'boolean' ? value : fallback);
const count = (value: unknown): number => (typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : 0);
const isCount = (value: unknown): boolean => typeof value === 'number' && Number.isInteger(value) && value >= 0;
const ms = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0);

export function loadSettings(): Settings {
  const s = read<Partial<Settings>>('settings') ?? {};
  const d = DEFAULT_SETTINGS;
  return {
    lang: typeof s.lang === 'string' ? s.lang : null,
    faces: oneOf(s.faces, FACES, d.faces),
    unblockTheme: oneOf(s.unblockTheme, THEME_CHOICES, d.unblockTheme),
    boxShort: flag(s.boxShort, d.boxShort),
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

/**
 * The screens of a game, and where each keeps its game: the fifteen by size and its day; "Clear the way" — levels,
 * free play, the day; "The chest" — the same.
 */
export const SLOTS = [
  'fifteen-easy',
  'fifteen-medium',
  'fifteen-hard',
  'fifteen-expert',
  'fifteen-master',
  'fifteen-day',
  'levels',
  'unblock-easy',
  'unblock-medium',
  'unblock-hard',
  'unblock-day',
  'box-levels',
  'box-easy',
  'box-medium',
  'box-hard',
  'box-day',
] as const;
export type Slot = (typeof SLOTS)[number];

/** The modes with a set of puzzles made in advance: levels in a row, free play and the day. */
export type PoolMode = 'unblock' | 'box';

export const isSlot = (value: string): value is Slot => (SLOTS as readonly string[]).includes(value);

export function slotOf(play: SlidePlay): Slot {
  if (play.mode === 'fifteen') return play.way === 'daily' ? 'fifteen-day' : `fifteen-${play.difficulty!}`;
  if (play.way === 'level') return play.mode === 'box' ? 'box-levels' : 'levels';
  return play.way === 'daily' ? `${play.mode}-day` : `${play.mode}-${play.difficulty!}`;
}

/**
 * What a slot holds: its mode and way, and the difficulty of free play (the fifteen's size kind; "Clear the way" and
 * "The chest" — one of DIFFICULTIES).
 */
export function slotKind(slot: Slot): { mode: 'fifteen' | PoolMode; way: 'free' | 'daily' | 'level'; difficulty: FifteenKind | null } {
  if (slot === 'levels') return { mode: 'unblock', way: 'level', difficulty: null };
  const [mode, rest] = slot.split('-') as ['fifteen' | PoolMode, string];
  if (rest === 'levels') return { mode, way: 'level', difficulty: null };
  if (rest === 'day') return { mode, way: 'daily', difficulty: null };
  return { mode, way: 'free', difficulty: rest as FifteenKind };
}

/** The difficulty of a pool mode's free play slot (its slot holds one of DIFFICULTIES). */
export const poolDifficulty = (slot: Slot): Difficulty => slotKind(slot).difficulty as Difficulty;

/** The sets of puzzles of the modes that have them, and the puzzle of the day of each. */
export interface PuzzleSets {
  pool(mode: PoolMode): readonly PoolPuzzle[];
  day(mode: PoolMode, date: string): PoolPuzzle;
}

/**
 * A saved game holds together: its mode, way and place; its board fits the slot (the fifteen's size; the level's
 * puzzle, or a puzzle of the mode's set with its fewest moves); its counts; and its moves lead from its start.
 */
function wholePlay(play: unknown, slot: Slot, sets: PuzzleSets): play is SlidePlay {
  const p = play as Partial<SlidePlay> | null;
  const kind = slotKind(slot);
  if (!p || p.mode !== kind.mode || p.way !== kind.way) return false;
  if (kind.way === 'free' ? p.difficulty !== kind.difficulty : p.difficulty !== null) return false;
  if (kind.way === 'daily' ? typeof p.daily !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(p.daily) : p.daily !== null) return false;
  if (!Number.isInteger(p.seed) || !Array.isArray(p.history) || !p.history.every((x) => x && typeof x === 'object')) return false;
  if (![p.undos, p.hints, p.restarts].every(isCount) || ms(p.ms) !== p.ms || typeof p.done !== 'boolean') return false;
  if (p.mode === 'fifteen') {
    const f = p as Partial<FifteenPlay>;
    // saved before the fewest moves were counted (28.11): counted now from its start
    if (f.fewest === undefined && Array.isArray(f.start)) f.fewest = fifteenFewest(f.start);
    const size = kind.way === 'daily' ? SLIDE.fifteen.dailySize : SLIDE.fifteen.sizes[kind.difficulty!];
    if (f.size !== size || !isCount(f.moves) || !isCount(f.picture) || !Array.isArray(f.start) || !Array.isArray(f.tiles)) return false;
  } else {
    const mode = kind.mode as PoolMode;
    const u = p as Partial<UnblockPlay | BoxPlay>;
    if (!Array.isArray(u.places) || typeof u.board !== 'string' || !isCount(u.fewest)) return false;
    const pool = sets.pool(mode);
    let puzzle: PoolPuzzle | undefined;
    if (kind.way === 'level') puzzle = Number.isInteger(u.level) && u.level! >= 1 ? levelPuzzle(pool, u.level!, SLIDE[mode]) : undefined;
    else if (kind.way === 'daily') puzzle = sets.day(mode, u.daily!);
    else puzzle = pool.find((q) => q.text === u.board);
    if (!puzzle || puzzle.text !== u.board || puzzle.moves !== u.fewest) return false;
    if (kind.way !== 'level' && u.level !== null) return false;
  }
  return validPlay(p as SlidePlay);
}

interface Saved {
  version: number;
  play: SlidePlay;
}

const playKey = (slot: Slot) => `play:${slot}`;

/** The game begun in a slot; of a day — only if it is today's. */
export function loadPlay(slot: Slot, today: string, sets: PuzzleSets): SlidePlay | null {
  const saved = read<Saved>(playKey(slot));
  if (!saved || saved.version !== PLAY_VERSION || !wholePlay(saved.play, slot, sets)) return null;
  if (saved.play.way === 'daily' && saved.play.daily !== today) return null;
  return saved.play;
}

export function savePlay(play: SlidePlay): void {
  write(playKey(slotOf(play)), { version: PLAY_VERSION, play } satisfies Saved);
}

export function dropPlay(slot: Slot): void {
  remove(playKey(slot));
}

/** Where a mode keeps its level reached ("Clear the way" — as before "The chest" came). */
const reachedKey = (mode: PoolMode) => (mode === 'unblock' ? 'reached' : `reached:${mode}`);

/** The level to play next in a mode's levels in a row (1 — none solved yet). */
export function loadReached(mode: PoolMode): number {
  const v = read<unknown>(reachedKey(mode));
  return typeof v === 'number' && Number.isInteger(v) && v >= 1 ? v : 1;
}

export function saveReached(mode: PoolMode, level: number): void {
  write(reachedKey(mode), level);
}

/** How a puzzle of the day went. */
export interface DayResult {
  moves: number;
  clean: boolean;
}

/** The days a mode's puzzle of the day was solved: date "YYYY-MM-DD" → result. */
export type Days = Record<string, DayResult>;

export function loadDays(mode: SlidePlay['mode']): Days {
  const v = read<Record<string, Partial<DayResult>>>(`days:${mode}`);
  if (!v || typeof v !== 'object') return {};
  const out: Days = {};
  for (const [date, r] of Object.entries(v)) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(date) && r && typeof r === 'object') out[date] = { moves: count(r.moves), clean: r.clean === true };
  }
  return out;
}

export function saveDayResult(mode: SlidePlay['mode'], date: string, result: DayResult): void {
  write(`days:${mode}`, { ...loadDays(mode), [date]: result });
}

/** Statistics; a part missing (a mode added since: "The chest") or broken starts from nothing. */
export function loadStats(): SlideStats {
  type Ways = { levels?: Partial<UnblockStats>; free?: Partial<Record<Difficulty, Partial<UnblockStats>>> };
  const v = read<{ fifteen?: Partial<Record<FifteenKind, Partial<FifteenStats>>>; unblock?: Ways; box?: Ways }>('stats') ?? {};
  const stats = emptyStats();
  const unblock = (s: Partial<UnblockStats> | undefined): UnblockStats | null =>
    s && typeof s === 'object' ? { played: count(s.played), won: count(s.won), clean: count(s.clean), perfect: count(s.perfect) } : null;
  const ways = (saved: Ways | undefined, into: WaysStats) => {
    for (const d of DIFFICULTIES) {
      const u = unblock(saved?.free?.[d]);
      if (u) into.free[d] = u;
    }
    const levels = unblock(saved?.levels);
    if (levels) into.levels = levels;
  };
  for (const k of FIFTEEN_KINDS) {
    const f = v.fifteen?.[k];
    if (f && typeof f === 'object') stats.fifteen[k] = { played: count(f.played), won: count(f.won), clean: count(f.clean), bestMoves: isCount(f.bestMoves) && f.bestMoves! > 0 ? f.bestMoves! : null };
  }
  ways(v.unblock, stats.unblock);
  ways(v.box, stats.box);
  return stats;
}

export function saveStats(stats: SlideStats): void {
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

/** Whether a puzzle of a mode has ever been solved on this device: until then the game says how to play. */
export function loadTipDone(mode: SlidePlay['mode']): boolean {
  return read<boolean>(`tipDone:${mode}`) === true;
}

export function saveTipDone(mode: SlidePlay['mode']): void {
  write(`tipDone:${mode}`, true);
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
