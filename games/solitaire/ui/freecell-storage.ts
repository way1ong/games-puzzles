// What FreeCell keeps on the device (docs/solitaire/SPEC.md, "Що зберігається"): the unfinished deal for each number of
// free cells, today's deal of the day, deals prepared in advance, the results of the days, statistics, and whether the
// tip has been read. Nothing leaves the device. Every read survives a missing or broken value; a saved deal carries a
// format version, and one in another format (or one that does not hold together) is dropped rather than break the game.
import { FREE_CELLS, SOLITAIRE, type FreeCells } from '../config.ts';
import { DECK } from '../core/cards.ts';
import { emptyFreeCellStats, type FreeCellStats } from '../core/freecell-stats.ts';
import type { AutoHome, FreeCell, FreePlace, FreeStep } from '../core/freecell.ts';
import { count, read, remove, write, type DayResult } from './storage.ts';

/** The format of a saved FreeCell deal; one saved in another format is not continued. */
const FREECELL_VERSION = 1;
const RULES = SOLITAIRE.freecell;
const SUITS = SOLITAIRE.deck.suits;
const RANKS = SOLITAIRE.deck.ranks;

/** Where a FreeCell deal lives: an ordinary deal or today's deal of the day, for one number of free cells. */
export interface FreeCellSlot {
  daily: boolean;
  cells: FreeCells;
}

const slotKey = (slot: FreeCellSlot) => `${slot.daily ? 'freecell-daily' : 'freecell'}:${slot.cells}`;

const isCard = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 0 && (n as number) < DECK;
const within = (n: unknown, size: number): boolean => Number.isInteger(n) && (n as number) >= 0 && (n as number) < size;

function validPlace(p: unknown, cells: number): p is FreePlace {
  const q = p as Partial<{ kind: string; index: number; suit: number }> | null;
  if (!q) return false;
  if (q.kind === 'column') return within(q.index, RULES.columns);
  if (q.kind === 'cell') return within(q.index, cells);
  return q.kind === 'foundation' && within(q.suit, SUITS);
}

function validStep(step: unknown, cells: number): step is FreeStep {
  const s = step as Partial<FreeStep> | null;
  return (
    !!s &&
    validPlace(s.from, cells) &&
    validPlace(s.to, cells) &&
    Number.isInteger(s.count) &&
    (s.count as number) > 0 &&
    Array.isArray(s.auto) &&
    s.auto.every((a: Partial<AutoHome> | null) => !!a && validPlace(a.from, cells) && isCard(a.card))
  );
}

/** A saved deal holds together: every card once (on the table or home), places and counts within bounds. */
function validFreeCell(play: unknown, slot: FreeCellSlot): play is FreeCell {
  const p = play as Partial<FreeCell> | null;
  if (!p || !Array.isArray(p.columns) || p.columns.length !== RULES.columns) return false;
  if (!Array.isArray(p.cells) || p.cells.length !== slot.cells || !Array.isArray(p.foundations) || p.foundations.length !== SUITS) return false;
  const cards = [...p.columns.flat(), ...p.cells.filter((c) => c !== null)];
  const home = p.foundations.reduce((a, b) => a + (Number.isInteger(b) && b >= 0 && b <= RANKS ? b : NaN), 0);
  return (
    p.columns.every((c) => Array.isArray(c) && c.every(isCard)) &&
    p.cells.every((c) => c === null || isCard(c)) &&
    new Set(cards).size === cards.length &&
    cards.length + home === DECK &&
    Number.isInteger(p.seed) &&
    (p.daily === null || typeof p.daily === 'string') &&
    (p.daily !== null) === slot.daily &&
    Array.isArray(p.history) &&
    p.history.every((s) => validStep(s, slot.cells)) &&
    typeof p.hints === 'number' &&
    typeof p.ms === 'number' &&
    typeof p.done === 'boolean'
  );
}

interface Saved {
  version: number;
  play: FreeCell;
}

/** The saved deal of a slot; the deal of the day only if it is today's. */
export function loadFreeCell(slot: FreeCellSlot, today: string): FreeCell | null {
  const saved = read<Saved>(slotKey(slot));
  if (!saved || saved.version !== FREECELL_VERSION || !validFreeCell(saved.play, slot)) return null;
  if (slot.daily && saved.play.daily !== today) return null;
  return saved.play;
}

export function saveFreeCell(slot: FreeCellSlot, play: FreeCell): void {
  write(slotKey(slot), { version: FREECELL_VERSION, play } satisfies Saved);
}

export function dropFreeCell(slot: FreeCellSlot): void {
  remove(slotKey(slot));
}

/** A seed whose deal can be won, made in advance for a number of free cells. */
export function loadFreeCellReady(cells: FreeCells): number | null {
  const v = read<number>(`freecell-ready:${cells}`);
  return Number.isInteger(v) && v! >= 0 ? v : null;
}

export function saveFreeCellReady(cells: FreeCells, seed: number): void {
  write(`freecell-ready:${cells}`, seed);
}

export function dropFreeCellReady(cells: FreeCells): void {
  remove(`freecell-ready:${cells}`);
}

/** Results of FreeCell's days: date "YYYY-MM-DD" → number of free cells → result. */
export type FreeCellDays = Record<string, Partial<Record<FreeCells, DayResult>>>;

export function loadFreeCellDays(): FreeCellDays {
  const v = read<FreeCellDays>('freecell-days');
  if (!v || typeof v !== 'object') return {};
  const out: FreeCellDays = {};
  for (const [date, byCells] of Object.entries(v)) {
    if (!byCells || typeof byCells !== 'object') continue;
    for (const cells of FREE_CELLS) {
      const r = byCells[cells];
      if (r && typeof r === 'object') (out[date] ??= {})[cells] = { hints: count(r.hints), ms: typeof r.ms === 'number' ? r.ms : 0 };
    }
  }
  return out;
}

export function saveFreeCellDayResult(date: string, cells: FreeCells, result: DayResult): void {
  const days = loadFreeCellDays();
  write('freecell-days', { ...days, [date]: { ...days[date], [cells]: result } });
}

export function loadFreeCellStats(): FreeCellStats {
  const v = read<Partial<FreeCellStats>>('freecell-stats') ?? {};
  const stats = emptyFreeCellStats();
  for (const cells of FREE_CELLS) {
    const s = v[cells];
    if (!s || typeof s !== 'object') continue;
    stats[cells] = { played: count(s.played), won: count(s.won), clean: count(s.clean), bestMs: typeof s.bestMs === 'number' ? s.bestMs : null };
  }
  return stats;
}

export function saveFreeCellStats(stats: FreeCellStats): void {
  write('freecell-stats', stats);
}

/** Whether a FreeCell deal has been won on this device: until then the game says how to play. */
export function loadFreeCellTipDone(): boolean {
  return read<boolean>('freecellTipDone') === true;
}

export function saveFreeCellTipDone(): void {
  write('freecellTipDone', true);
}
