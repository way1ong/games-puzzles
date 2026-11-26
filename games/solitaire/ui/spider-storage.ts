// What Spider keeps on the device (docs/solitaire/SPEC.md, "Що зберігається"): the unfinished deal for each number of
// suits, today's Spider of the day, deals prepared in advance, the results of the days, statistics, and whether the
// tips have been read. Nothing leaves the device. Every read survives a missing or broken value; a saved deal carries
// a format version, and one in another format (or one that does not hold together) is dropped rather than break the game.
import { SOLITAIRE, SPIDER_SUITS, type SpiderSuits } from '../config.ts';
import { SPIDER_DECK, type RunHome, type Spider, type SpiderStep } from '../core/spider.ts';
import { emptySpiderStats, type SpiderStats } from '../core/spider-stats.ts';
import { count, read, remove, write, type DayResult } from './storage.ts';

/** The format of a saved Spider deal; one saved in another format is not continued. */
const SPIDER_VERSION = 1;
const RULES = SOLITAIRE.spider;
const RANKS = SOLITAIRE.deck.ranks;

/** Where a Spider deal lives: an ordinary deal or today's Spider of the day, for one number of suits. */
export interface SpiderSlot {
  daily: boolean;
  suits: SpiderSuits;
}

const slotKey = (slot: SpiderSlot) => `${slot.daily ? 'spider-daily' : 'spider'}:${slot.suits}`;

const isCard = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 0 && (n as number) < SPIDER_DECK;
const isColumn = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 0 && (n as number) < RULES.columns;

function validRun(r: unknown): r is RunHome {
  const q = r as Partial<RunHome> | null;
  return !!q && isColumn(q.column) && Array.isArray(q.cards) && q.cards.length === RANKS && q.cards.every(isCard) && typeof q.flipped === 'boolean';
}

function validStep(step: unknown): step is SpiderStep {
  const s = step as Partial<Record<string, unknown>> | null;
  if (!s) return false;
  if (s.kind === 'deal') return Array.isArray(s.runs) && s.runs.every(validRun);
  return (
    s.kind === 'move' &&
    isColumn(s.from) &&
    isColumn(s.to) &&
    Number.isInteger(s.count) &&
    (s.count as number) > 0 &&
    typeof s.flipped === 'boolean' &&
    (s.run === null || validRun(s.run))
  );
}

function validSpider(play: unknown, slot: SpiderSlot): play is Spider {
  const p = play as Partial<Spider> | null;
  if (!p || p.suits !== slot.suits || !Array.isArray(p.columns) || p.columns.length !== RULES.columns) return false;
  if (!Array.isArray(p.down) || !Array.isArray(p.stock) || !Array.isArray(p.home)) return false;
  const cards = [...p.columns.flat(), ...p.stock, ...p.home.flat()];
  return (
    p.columns.every((c) => Array.isArray(c) && c.every(isCard)) &&
    p.stock.every(isCard) &&
    p.home.every((r) => Array.isArray(r) && r.length === RANKS && r.every(isCard)) &&
    cards.length === SPIDER_DECK &&
    new Set(cards).size === SPIDER_DECK &&
    p.down.length === p.columns.length &&
    p.down.every((d, i) => Number.isInteger(d) && d >= 0 && d <= Math.max(0, p.columns![i]!.length - 1)) &&
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
  play: Spider;
}

/** The saved Spider deal of a slot; Spider of the day only if it is today's. */
export function loadSpider(slot: SpiderSlot, today: string): Spider | null {
  const saved = read<Saved>(slotKey(slot));
  if (!saved || saved.version !== SPIDER_VERSION || !validSpider(saved.play, slot)) return null;
  if (slot.daily && saved.play.daily !== today) return null;
  return saved.play;
}

export function saveSpider(slot: SpiderSlot, play: Spider): void {
  write(slotKey(slot), { version: SPIDER_VERSION, play } satisfies Saved);
}

export function dropSpider(slot: SpiderSlot): void {
  remove(slotKey(slot));
}

/** A seed whose deal can be won, made in advance for a number of suits. */
export function loadSpiderReady(suits: SpiderSuits): number | null {
  const v = read<number>(`spider-ready:${suits}`);
  return Number.isInteger(v) && v! >= 0 ? v : null;
}

export function saveSpiderReady(suits: SpiderSuits, seed: number): void {
  write(`spider-ready:${suits}`, seed);
}

export function dropSpiderReady(suits: SpiderSuits): void {
  remove(`spider-ready:${suits}`);
}

/** Results of Spider's days: date "YYYY-MM-DD" → number of suits → result. */
export type SpiderDays = Record<string, Partial<Record<SpiderSuits, DayResult>>>;

export function loadSpiderDays(): SpiderDays {
  const v = read<SpiderDays>('spider-days');
  if (!v || typeof v !== 'object') return {};
  const out: SpiderDays = {};
  for (const [date, bySuits] of Object.entries(v)) {
    if (!bySuits || typeof bySuits !== 'object') continue;
    for (const suits of SPIDER_SUITS) {
      const r = bySuits[suits];
      if (r && typeof r === 'object') (out[date] ??= {})[suits] = { hints: count(r.hints), ms: typeof r.ms === 'number' ? r.ms : 0 };
    }
  }
  return out;
}

export function saveSpiderDayResult(date: string, suits: SpiderSuits, result: DayResult): void {
  const days = loadSpiderDays();
  write('spider-days', { ...days, [date]: { ...days[date], [suits]: result } });
}

export function loadSpiderStats(): SpiderStats {
  const v = read<Partial<SpiderStats>>('spider-stats') ?? {};
  const stats = emptySpiderStats();
  for (const suits of SPIDER_SUITS) {
    const s = v[suits];
    if (!s || typeof s !== 'object') continue;
    stats[suits] = { played: count(s.played), won: count(s.won), clean: count(s.clean), bestMs: typeof s.bestMs === 'number' ? s.bestMs : null };
  }
  return stats;
}

export function saveSpiderStats(stats: SpiderStats): void {
  write('spider-stats', stats);
}

/** Whether a Spider deal has been won on this device: until then the game says how to play. */
export function loadSpiderTipDone(): boolean {
  return read<boolean>('spiderTipDone') === true;
}

export function saveSpiderTipDone(): void {
  write('spiderTipDone', true);
}

/** Whether "Turn the phone" was put away for good (docs/solitaire/SPEC.md, "Телефон лежачи"). */
export function loadRotateTipDone(): boolean {
  return read<boolean>('rotateTipDone') === true;
}

export function saveRotateTipDone(): void {
  write('rotateTipDone', true);
}
