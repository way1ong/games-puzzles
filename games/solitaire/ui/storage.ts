// What stays on the device (localStorage): settings, the unfinished deal for each way of turning the stock, today's
// deals of the day, deals prepared in advance, the results of the days, statistics. Nothing leaves the device
// (docs/solitaire/SPEC.md, "Що зберігається"). Every read survives a missing or broken value; a saved deal carries a
// format version, and one in another format (or one that does not hold together) is dropped rather than break the game.
import { DRAWS, SOLITAIRE, SPIDER_SUITS, type Draw, type SpiderSuits } from '../config.ts';
import { DECK } from '../core/cards.ts';
import type { Klondike, Place, Step } from '../core/klondike.ts';
import { emptyStats, type Stats } from '../core/stats.ts';

const PREFIX = 'way1ong-solitaire:v1:';
/** The format of a saved deal; one saved in another format is not continued. */
const PLAY_VERSION = 1;

export function read<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw === null ? null : (JSON.parse(raw) as T);
  } catch {
    return null;
  }
}

export function write(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Storage full or blocked: the game goes on without saving.
  }
}

export function remove(key: string): void {
  try {
    window.localStorage.removeItem(PREFIX + key);
  } catch {
    // Nothing to remove.
  }
}

export type Theme = 'system' | 'light' | 'dark';
export type Deals = 'winnable' | 'any';
/** The game's look (decision of 25.11): drawn (felt, paper, figures) or simple, as at first. */
export type Look = 'drawn' | 'simple';

export interface Settings {
  lang: string | null;
  draw: Draw;
  deals: Deals;
  time: boolean;
  leftHand: boolean;
  fourColours: boolean;
  big: boolean;
  theme: Theme;
  look: Look;
  /** Spider: how many suits (docs/solitaire/SPEC.md, "Павук"). */
  spiderSuits: SpiderSuits;
}

/** As approved on 25.11 (docs/solitaire/SPEC.md, "Налаштування"). */
export const DEFAULT_SETTINGS: Settings = {
  lang: null,
  draw: 1,
  deals: 'winnable',
  time: false,
  leftHand: false,
  fourColours: false,
  big: false,
  theme: 'system',
  look: 'drawn',
  spiderSuits: SOLITAIRE.spider.defaultSuits,
};

const oneOf = <T extends string | number>(value: unknown, options: readonly T[], fallback: T): T =>
  options.find((o) => o === value) ?? fallback;
const flag = (value: unknown, fallback: boolean): boolean => (typeof value === 'boolean' ? value : fallback);
export const count = (value: unknown): number => (typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : 0);

export function loadSettings(): Settings {
  const s = read<Partial<Settings>>('settings') ?? {};
  const d = DEFAULT_SETTINGS;
  return {
    lang: typeof s.lang === 'string' ? s.lang : null,
    draw: oneOf(s.draw, DRAWS, d.draw),
    deals: oneOf(s.deals, ['winnable', 'any'] as const, d.deals),
    time: flag(s.time, d.time),
    leftHand: flag(s.leftHand, d.leftHand),
    fourColours: flag(s.fourColours, d.fourColours),
    big: flag(s.big, d.big),
    theme: oneOf(s.theme, ['system', 'light', 'dark'] as const, d.theme),
    look: oneOf(s.look, ['drawn', 'simple'] as const, d.look),
    spiderSuits: oneOf(s.spiderSuits, SPIDER_SUITS, d.spiderSuits),
  };
}

export function saveSettings(settings: Settings): void {
  write('settings', settings);
}

/** Where a deal lives: an ordinary deal or today's deal of the day, for one way of turning the stock. */
export interface Slot {
  daily: boolean;
  draw: Draw;
}

const slotKey = (slot: Slot) => `${slot.daily ? 'daily' : 'play'}:${slot.draw}`;

const isCard = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 0 && (n as number) < DECK;

function validPlace(p: unknown): p is Place {
  const q = p as Partial<{ kind: string; index: number; suit: number }> | null;
  if (!q) return false;
  if (q.kind === 'waste') return true;
  if (q.kind === 'column') return Number.isInteger(q.index) && q.index! >= 0 && q.index! < SOLITAIRE.klondike.columns;
  return q.kind === 'foundation' && Number.isInteger(q.suit) && q.suit! >= 0 && q.suit! < SOLITAIRE.deck.suits;
}

function validStep(step: unknown): step is Step {
  const s = step as Partial<Record<string, unknown>> | null;
  if (!s) return false;
  if (s.kind === 'draw') return Number.isInteger(s.pos) && Number.isInteger(s.fan);
  return s.kind === 'move' && validPlace(s.from) && validPlace(s.to) && Number.isInteger(s.count) && typeof s.flipped === 'boolean' && Number.isInteger(s.fan);
}

/** A saved deal holds together: every card once, places and counts within bounds. */
function validPlay(play: unknown, slot: Slot): play is Klondike {
  const p = play as Partial<Klondike> | null;
  if (!p || p.draw !== slot.draw || !Array.isArray(p.columns) || p.columns.length !== SOLITAIRE.klondike.columns) return false;
  if (!Array.isArray(p.down) || !Array.isArray(p.talon) || !Array.isArray(p.foundations) || p.foundations.length !== SOLITAIRE.deck.suits) return false;
  const cards = [...p.columns.flat(), ...p.talon];
  const home = p.foundations.reduce((a, b) => a + (Number.isInteger(b) && b >= 0 && b <= SOLITAIRE.deck.ranks ? b : NaN), 0);
  return (
    p.columns.every((c) => Array.isArray(c) && c.every(isCard)) &&
    p.talon.every(isCard) &&
    new Set(cards).size === cards.length &&
    cards.length + home === DECK &&
    p.down.length === p.columns.length &&
    p.down.every((d, i) => Number.isInteger(d) && d >= 0 && d <= Math.max(0, p.columns![i]!.length - 1)) &&
    Number.isInteger(p.pos) &&
    p.pos! >= 0 &&
    p.pos! <= p.talon.length &&
    Number.isInteger(p.fan) &&
    Number.isInteger(p.seed) &&
    (p.daily === null || typeof p.daily === 'string') &&
    (p.daily !== null) === slot.daily &&
    Array.isArray(p.history) &&
    p.history.every(validStep) &&
    typeof p.hints === 'number' &&
    typeof p.ms === 'number' &&
    typeof p.done === 'boolean'
  );
}

interface Saved {
  version: number;
  play: Klondike;
}

/** The saved deal of a slot; a deal of the day only if it is today's. */
export function loadPlay(slot: Slot, today: string): Klondike | null {
  const saved = read<Saved>(slotKey(slot));
  if (!saved || saved.version !== PLAY_VERSION || !validPlay(saved.play, slot)) return null;
  if (slot.daily && saved.play.daily !== today) return null;
  return saved.play;
}

export function savePlay(slot: Slot, play: Klondike): void {
  write(slotKey(slot), { version: PLAY_VERSION, play } satisfies Saved);
}

export function dropPlay(slot: Slot): void {
  remove(slotKey(slot));
}

/** A seed whose deal can be won, made in advance for a way of turning the stock. */
export function loadReady(draw: Draw): number | null {
  const v = read<number>(`ready:${draw}`);
  return Number.isInteger(v) && v! >= 0 ? v : null;
}

export function saveReady(draw: Draw, seed: number): void {
  write(`ready:${draw}`, seed);
}

export function dropReady(draw: Draw): void {
  remove(`ready:${draw}`);
}

/** How a deal of the day went. */
export interface DayResult {
  hints: number;
  ms: number;
}

/** Results of the days: date "YYYY-MM-DD" → way of turning the stock → result. */
export type Days = Record<string, Partial<Record<Draw, DayResult>>>;

export function loadDays(): Days {
  const v = read<Days>('days');
  if (!v || typeof v !== 'object') return {};
  const out: Days = {};
  for (const [date, byDraw] of Object.entries(v)) {
    if (!byDraw || typeof byDraw !== 'object') continue;
    for (const draw of DRAWS) {
      const r = byDraw[draw];
      if (r && typeof r === 'object') (out[date] ??= {})[draw] = { hints: count(r.hints), ms: typeof r.ms === 'number' ? r.ms : 0 };
    }
  }
  return out;
}

export function saveDayResult(date: string, draw: Draw, result: DayResult): void {
  const days = loadDays();
  write('days', { ...days, [date]: { ...days[date], [draw]: result } });
}

export function loadStats(): Stats {
  const v = read<Partial<Stats>>('stats') ?? {};
  const stats = emptyStats();
  for (const draw of DRAWS) {
    const s = v[draw];
    if (!s || typeof s !== 'object') continue;
    stats[draw] = { played: count(s.played), won: count(s.won), clean: count(s.clean), bestMs: typeof s.bestMs === 'number' ? s.bestMs : null };
  }
  return stats;
}

export function saveStats(stats: Stats): void {
  write('stats', stats);
}

/** The screens a game is played on: Klondike and its deal of the day, Spider and its deal of the day. */
export const ROUTES = ['play', 'daily', 'spider', 'spider-daily'] as const;
export type Route = (typeof ROUTES)[number];

/** The deal open last time, to open again; null — the start screen. Saved before Spider as { daily }. */
export function loadLast(): Route | null {
  const v = read<{ daily?: unknown; route?: unknown }>('last');
  if (!v || typeof v !== 'object') return null;
  if (typeof v.route === 'string') return ROUTES.find((r) => r === v.route) ?? null;
  return typeof v.daily === 'boolean' ? (v.daily ? 'daily' : 'play') : null;
}

export function saveLast(route: Route | null): void {
  if (route === null) remove('last');
  else write('last', { route });
}

/** Whether a deal has ever been won on this device: until then the game says how to play. */
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
