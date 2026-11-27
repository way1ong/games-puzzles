// What stays on the device (localStorage): settings, the level reached, the game begun of each way, the days of the
// level of the day, statistics, the screen open last. Nothing leaves the device (docs/pour/SPEC.md, "Що зберігається").
// Every read survives a missing or broken value; a saved game carries a format version, and one in another format (or
// one that does not hold together) is dropped rather than break the game.
import { DIFFICULTIES, HELPS, POUR, type Difficulty, type Help } from '../config.ts';
import { stageOf } from '../core/level.ts';
import { validPlay, WAYS, type PourPlay, type Way } from '../core/play.ts';
import { emptyStats, type PourStats } from '../core/stats.ts';

const PREFIX = 'way1ong-pour:v1:';
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

/** As decided on 27.11 (docs/pour/SPEC.md, "Налаштування"). */
export interface Settings {
  lang: string | null;
  /** Patterns on the colours (on by default). */
  patterns: boolean;
  help: Help;
  time: boolean;
  vibration: boolean;
  big: boolean;
  leftHand: boolean;
  theme: Look;
}

export const DEFAULT_SETTINGS: Settings = {
  lang: null,
  patterns: true,
  help: POUR.defaultHelp,
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
    patterns: flag(s.patterns, d.patterns),
    help: oneOf(s.help, HELPS, d.help),
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

/** Where a game is kept: one for levels in a row, one for each difficulty, one for the day. */
export type Slot = 'level' | Difficulty | 'daily';

export const slotOf = (play: Pick<PourPlay, 'way' | 'difficulty'>): Slot => (play.way === 'free' ? play.difficulty! : play.way);

const bottlesShape = (v: unknown): boolean => Array.isArray(v) && v.every((b) => Array.isArray(b) && b.every((c) => Number.isInteger(c)));

/** The colours a slot's deals have. */
function coloursOf(play: PourPlay): number | null {
  if (play.way === 'level') return play.level !== null && play.level >= 1 ? stageOf(play.level).colours : null;
  if (play.way === 'free') return play.difficulty ? POUR.difficulties[play.difficulty] : null;
  return POUR.dailyColours;
}

/** A saved game holds together: its way and place, the deal's colours, its counts, and its pours from the start. */
function wholePlay(play: unknown, slot: Slot): play is PourPlay {
  const p = play as Partial<PourPlay> | null;
  if (!p || !WAYS.includes(p.way as Way)) return false;
  if (p.way === 'level' ? slot !== 'level' || !(Number.isInteger(p.level) && p.level! >= 1) : p.level !== null) return false;
  if (p.way === 'free' ? !DIFFICULTIES.includes(p.difficulty as Difficulty) || slot !== p.difficulty : p.difficulty !== null) return false;
  if (p.way === 'daily' ? slot !== 'daily' || typeof p.daily !== 'string' : p.daily !== null) return false;
  if (!Number.isInteger(p.seed) || !Number.isInteger(p.colours) || !Array.isArray(p.paints)) return false;
  if (!p.paints.every((x) => Number.isInteger(x) && x >= 0 && x < POUR.paints) || new Set(p.paints).size !== p.paints.length) return false;
  if (!bottlesShape(p.start) || !bottlesShape(p.bottles) || !Array.isArray(p.history)) return false;
  if (!p.history.every((h) => h && typeof h === 'object')) return false;
  if (![p.moves, p.undos, p.hints, p.extra, p.restarts].every(isCount) || ms(p.ms) !== p.ms || typeof p.done !== 'boolean') return false;
  if (p.colours !== coloursOf(p as PourPlay) || p.extra! > POUR.helps.free.extra) return false;
  if (p.bottles!.length !== p.colours! + POUR.empty + p.extra!) return false;
  return validPlay(p as PourPlay);
}

interface Saved {
  version: number;
  play: PourPlay;
}

const playKey = (slot: Slot) => `play:${slot}`;

/** The game begun in a slot; of the day — only if it is today's. */
export function loadPlay(slot: Slot, today: string): PourPlay | null {
  const saved = read<Saved>(playKey(slot));
  if (!saved || saved.version !== PLAY_VERSION || !wholePlay(saved.play, slot)) return null;
  if (slot === 'daily' && saved.play.daily !== today) return null;
  return saved.play;
}

export function savePlay(play: PourPlay): void {
  write(playKey(slotOf(play)), { version: PLAY_VERSION, play } satisfies Saved);
}

export function dropPlay(slot: Slot): void {
  remove(playKey(slot));
}

/** The level to play next in levels in a row (1 — none won yet). */
export function loadReached(): number {
  const v = read<unknown>('reached');
  return typeof v === 'number' && Number.isInteger(v) && v >= 1 ? v : 1;
}

export function saveReached(level: number): void {
  write('reached', level);
}

/** How the level of the day went. */
export interface DayResult {
  moves: number;
  clean: boolean;
}

/** The days the level of the day was solved: date "YYYY-MM-DD" → result. */
export type Days = Record<string, DayResult>;

export function loadDays(): Days {
  const v = read<Record<string, Partial<DayResult>>>('days');
  if (!v || typeof v !== 'object') return {};
  const out: Days = {};
  for (const [date, r] of Object.entries(v)) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(date) && r && typeof r === 'object') out[date] = { moves: count(r.moves), clean: r.clean === true };
  }
  return out;
}

export function saveDayResult(date: string, result: DayResult): void {
  write('days', { ...loadDays(), [date]: result });
}

export function loadStats(): PourStats {
  const v = read<Partial<PourStats>>('stats') ?? {};
  const stats = emptyStats();
  for (const d of DIFFICULTIES) {
    const s = v.free?.[d];
    if (!s || typeof s !== 'object') continue;
    stats.free[d] = { played: count(s.played), won: count(s.won), clean: count(s.clean), bestMoves: isCount(s.bestMoves) && s.bestMoves! > 0 ? s.bestMoves! : null };
  }
  if (v.levels && typeof v.levels === 'object') stats.levels = { won: count(v.levels.won), clean: count(v.levels.clean) };
  return stats;
}

export function saveStats(stats: PourStats): void {
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

/** Whether a level has ever been solved on this device: until then the game says how to play. */
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
