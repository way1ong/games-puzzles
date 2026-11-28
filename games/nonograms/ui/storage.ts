// What stays on the device (localStorage): settings, each started picture of the album, today's picture of the day,
// the solved pictures, the results of the days, statistics, the screen open last and how big grids were seen; the
// pictures in colour apart — each started one, the solved ones, their statistics (docs/nonograms/SPEC.md,
// "Кольорові малюнки"). Nothing leaves the device (docs/nonograms/SPEC.md, "Що зберігається"). Every read survives a
// missing or broken value; a saved picture carries a format version, and one in another format (or one that does not
// hold together) is dropped rather than break the game.
import { SIZES, type Size } from '../config.ts';
import type { Clues } from '../core/clues.ts';
import type { ColourClues } from '../core/colour-clues.ts';
import { CROSS, colourSolved, type ColourPlay, type ColourStep } from '../core/colour-play.ts';
import { isSolved, type Mark, type Play, type SecondTap, type Step } from '../core/play.ts';
import type { Picture } from '../core/picture.ts';
import { emptyStats, type Stats } from '../core/stats.ts';

const PREFIX = 'way1ong-nonograms:v1:';
/** The format of a saved picture; one saved in another format is not continued. */
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

/** As approved on 25.11 (docs/nonograms/SPEC.md, "Налаштування"). */
export interface Settings {
  lang: string | null;
  secondTap: SecondTap;
  /** Mistakes shown at once. */
  mistakes: boolean;
  autoCross: boolean;
  time: boolean;
  vibration: boolean;
  /** The numbers of a finished line fade. */
  fade: boolean;
  /** The row and the column under the finger are highlighted. */
  highlight: boolean;
  /** The picture's name from the start (else after solving). */
  nameFirst: boolean;
  /** The solved picture in colour. */
  colour: boolean;
  leftHand: boolean;
  big: boolean;
  theme: Theme;
}

export const DEFAULT_SETTINGS: Settings = {
  lang: null,
  secondTap: 'clear',
  mistakes: false,
  autoCross: true,
  time: false,
  vibration: false,
  fade: true,
  highlight: true,
  nameFirst: false,
  colour: true,
  leftHand: false,
  big: false,
  theme: 'system',
};

const oneOf = <T extends string | number>(value: unknown, options: readonly T[], fallback: T): T => options.find((o) => o === value) ?? fallback;
const flag = (value: unknown, fallback: boolean): boolean => (typeof value === 'boolean' ? value : fallback);
const count = (value: unknown): number => (typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : 0);
const ms = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0);

export function loadSettings(): Settings {
  const s = read<Partial<Settings>>('settings') ?? {};
  const d = DEFAULT_SETTINGS;
  return {
    lang: typeof s.lang === 'string' ? s.lang : null,
    secondTap: oneOf(s.secondTap, ['clear', 'cross'] as const, d.secondTap),
    mistakes: flag(s.mistakes, d.mistakes),
    autoCross: flag(s.autoCross, d.autoCross),
    time: flag(s.time, d.time),
    vibration: flag(s.vibration, d.vibration),
    fade: flag(s.fade, d.fade),
    highlight: flag(s.highlight, d.highlight),
    nameFirst: flag(s.nameFirst, d.nameFirst),
    colour: flag(s.colour, d.colour),
    leftHand: flag(s.leftHand, d.leftHand),
    big: flag(s.big, d.big),
    theme: oneOf(s.theme, ['system', 'light', 'dark'] as const, d.theme),
  };
}

export function saveSettings(settings: Settings): void {
  write('settings', settings);
}

const isMark = (m: unknown): m is Mark => m === 0 || m === 1 || m === 2;

function validStep(step: unknown, cells: number): step is Step {
  const s = step as Partial<Step> | null;
  return (
    !!s &&
    Array.isArray(s.cells) &&
    Array.isArray(s.before) &&
    s.cells.length > 0 &&
    s.cells.length === s.before.length &&
    s.cells.every((c) => Number.isInteger(c) && c >= 0 && c < cells) &&
    s.before.every(isMark)
  );
}

/** A saved picture holds together: its picture's size, marks of the right kind, steps within the grid, solved or not as the marks say. */
function validPlay(play: unknown, picture: Picture, clues: Clues): play is Play {
  const p = play as Partial<Play> | null;
  const cells = picture.size * picture.size;
  return (
    !!p &&
    p.id === picture.id &&
    p.size === picture.size &&
    (p.daily === null || typeof p.daily === 'string') &&
    Array.isArray(p.marks) &&
    p.marks.length === cells &&
    p.marks.every(isMark) &&
    Array.isArray(p.history) &&
    p.history.every((s) => validStep(s, cells)) &&
    count(p.hints) === p.hints &&
    ms(p.ms) === p.ms &&
    typeof p.done === 'boolean' &&
    p.done === isSolved(p.marks, clues)
  );
}

interface Saved {
  version: number;
  play: Play;
}

const playKey = (daily: boolean, picture: Picture) => (daily ? 'daily' : `play:${picture.id}`);

/** The saved play of an album picture; of the picture of the day — only if it is today's and this picture. */
export function loadPlay(picture: Picture, clues: Clues, today: string | null): Play | null {
  const saved = read<Saved>(playKey(today !== null, picture));
  if (!saved || saved.version !== PLAY_VERSION || !validPlay(saved.play, picture, clues)) return null;
  if (saved.play.daily !== today) return null;
  return saved.play;
}

export function savePlay(play: Play, picture: Picture): void {
  write(playKey(play.daily !== null, picture), { version: PLAY_VERSION, play } satisfies Saved);
}

/** The ids of the album's solved pictures (a picture of the day solved counts too). */
export function loadSolved(): Set<string> {
  const v = read<unknown>('solved');
  return new Set(Array.isArray(v) ? v.filter((id): id is string => typeof id === 'string') : []);
}

export function addSolved(id: string): void {
  const solved = loadSolved();
  solved.add(id);
  write('solved', [...solved]);
}

/** How a picture of the day went. */
export interface DayResult {
  hints: number;
  ms: number;
}

/** Results of the days: date "YYYY-MM-DD" → result. */
export type Days = Record<string, DayResult>;

export function loadDays(): Days {
  const v = read<Record<string, Partial<DayResult>>>('days');
  if (!v || typeof v !== 'object') return {};
  const out: Days = {};
  for (const [date, r] of Object.entries(v)) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(date) && r && typeof r === 'object') out[date] = { hints: count(r.hints), ms: ms(r.ms) };
  }
  return out;
}

export function saveDayResult(date: string, result: DayResult): void {
  write('days', { ...loadDays(), [date]: result });
}

function readStats(key: string): Stats {
  const v = read<Partial<Record<Size, Partial<Stats[Size]>>>>(key) ?? {};
  const stats = emptyStats();
  for (const size of SIZES) {
    const s = v[size];
    if (!s || typeof s !== 'object') continue;
    stats[size] = { solved: count(s.solved), hints: count(s.hints), bestMs: typeof s.bestMs === 'number' && s.bestMs > 0 ? s.bestMs : null };
  }
  return stats;
}

export function loadStats(): Stats {
  return readStats('stats');
}

export function saveStats(stats: Stats): void {
  write('stats', stats);
}

// ---------- pictures in colour: their own keys, apart from the black-and-white ones ----------

/** The format of a saved picture in colour; one saved in another format is not continued. */
const COLOUR_PLAY_VERSION = 1;

const isColourMark = (m: unknown, paints: number): m is number => Number.isInteger(m) && (m as number) >= CROSS && (m as number) <= paints;

function validColourStep(step: unknown, cells: number, paints: number): step is ColourStep {
  const s = step as Partial<ColourStep> | null;
  return (
    !!s &&
    Array.isArray(s.cells) &&
    Array.isArray(s.before) &&
    s.cells.length > 0 &&
    s.cells.length === s.before.length &&
    s.cells.every((c) => Number.isInteger(c) && c >= 0 && c < cells) &&
    s.before.every((m) => isColourMark(m, paints))
  );
}

/** A saved colour play holds together: its picture's size, marks of its paints, steps within the grid, solved or not as the marks say. */
function validColourPlay(play: unknown, picture: Picture, clues: ColourClues): play is ColourPlay {
  const p = play as Partial<ColourPlay> | null;
  const cells = picture.size * picture.size;
  const paints = clues.paints.length;
  return (
    !!p &&
    p.id === picture.id &&
    p.size === picture.size &&
    Array.isArray(p.marks) &&
    p.marks.length === cells &&
    p.marks.every((m) => isColourMark(m, paints)) &&
    Array.isArray(p.history) &&
    p.history.every((s) => validColourStep(s, cells, paints)) &&
    count(p.hints) === p.hints &&
    ms(p.ms) === p.ms &&
    typeof p.done === 'boolean' &&
    p.done === colourSolved(p.marks, clues)
  );
}

interface SavedColour {
  version: number;
  /** The picture's paints when it was saved (their letters in order): its marks mean these. */
  paints: string;
  play: ColourPlay;
}

const colourKey = (picture: Picture) => `colour:${picture.id}`;

/** The saved play of a picture in colour; dropped when its paints are no longer the picture's. */
export function loadColourPlay(picture: Picture, clues: ColourClues): ColourPlay | null {
  const saved = read<SavedColour>(colourKey(picture));
  if (!saved || saved.version !== COLOUR_PLAY_VERSION || saved.paints !== clues.paints.join('')) return null;
  return validColourPlay(saved.play, picture, clues) ? saved.play : null;
}

export function saveColourPlay(play: ColourPlay, picture: Picture, clues: ColourClues): void {
  write(colourKey(picture), { version: COLOUR_PLAY_VERSION, paints: clues.paints.join(''), play } satisfies SavedColour);
}

/** The ids of the pictures solved in colour. */
export function loadColourSolved(): Set<string> {
  const v = read<unknown>('colourSolved');
  return new Set(Array.isArray(v) ? v.filter((id): id is string => typeof id === 'string') : []);
}

export function addColourSolved(id: string): void {
  const solved = loadColourSolved();
  solved.add(id);
  write('colourSolved', [...solved]);
}

/** Statistics of the pictures in colour, for each size (as those of the black-and-white ones). */
export function loadColourStats(): Stats {
  return readStats('colourStats');
}

export function saveColourStats(stats: Stats): void {
  write('colourStats', stats);
}

/** Whether a picture in colour has ever been solved on this device: until then the game says how they are played. */
export function loadColourTipDone(): boolean {
  return read<boolean>('colourTipDone') === true;
}

export function saveColourTipDone(): void {
  write('colourTipDone', true);
}

/** The screen open last time (a chapter or a picture), to open again; '' — the start screen. */
export function loadLast(): string {
  const v = read<unknown>('last');
  return typeof v === 'string' ? v : '';
}

export function saveLast(route: string): void {
  if (route) write('last', route);
  else remove('last');
}

/** The picture played last (its screen), for "Continue" on the start screen; '' — none. */
export function loadResume(): string {
  const v = read<unknown>('resume');
  return typeof v === 'string' ? v : '';
}

export function saveResume(route: string): void {
  write('resume', route);
}

/** Whether the player has moved or zoomed a big grid once: until then the game says how. */
export function loadZoomTipDone(): boolean {
  return read<boolean>('zoomTipDone') === true;
}

export function saveZoomTipDone(): void {
  write('zoomTipDone', true);
}

/** For each size, whether its grids were last seen whole (else zoomed in). */
export function loadWhole(): Partial<Record<Size, boolean>> {
  const v = read<Partial<Record<Size, unknown>>>('whole') ?? {};
  const out: Partial<Record<Size, boolean>> = {};
  for (const size of SIZES) if (typeof v[size] === 'boolean') out[size] = v[size] as boolean;
  return out;
}

export function saveWhole(size: Size, whole: boolean): void {
  write('whole', { ...loadWhole(), [size]: whole });
}

/** Whether a picture has ever been solved on this device: until then the game says how to play. */
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
