// A game of Mines (docs/mines/SPEC.md, "Як грати", "Керування", "Коли натиснули на міну"): what the player has opened
// and flagged, and the moves — open, flag, open a number's neighbours, start over, take back the move onto a mine. A
// state is never changed: every move gives a new one (a move that changes nothing gives the same object). Pure.
import { type AfterMine, type Kind, type Start } from '../config.ts';
import { ruleOf, type CustomSize } from './custom.ts';
import { mineMap, neighbourTable, numbers, type Field } from './field.ts';

/** A cell as the player sees it: closed, flagged, open. */
export const CLOSED_CELL = '.';
export const FLAG = 'F';
export const OPEN = 'O';

export interface MinesPlay {
  /** A level, or the player's own size. */
  level: Kind;
  /** The player's own size (null on a level). */
  size: CustomSize | null;
  /** The field; null while the player is still to choose the first place (it is made around it). */
  field: Field | null;
  /** The seed the field was (or will be) made from. */
  seed: number;
  /** "YYYY-MM-DD" of the field of the day; null — an ordinary field. */
  daily: string | null;
  /** Who opened the first place. */
  start: Start;
  /** Each cell, row by row: CLOSED_CELL, FLAG or OPEN. */
  cells: string;
  /** The mine the player opened, while it is shown; null — none. */
  boom: number | null;
  /** The cells the move onto a mine opened, so that it can be taken back. */
  boomOpened: readonly number[];
  hints: number;
  /** Mines opened and taken back. */
  mistakes: number;
  ms: number;
  done: boolean;
}

/**
 * A new game; with a field (the first place opened at once) or, for the player's first place, without one yet. `size` —
 * the player's own size (a custom field only).
 */
export function newPlay(level: Kind, seed: number, start: Start, field: Field | null, daily: string | null = null, size: CustomSize | null = null): MinesPlay {
  const own = level === 'custom' ? ruleOf(level, size) : null;
  const { width, height } = ruleOf(level, own);
  const play: MinesPlay = {
    level,
    size: own ? { width: own.width, height: own.height, mines: own.mines } : null,
    field: null,
    seed,
    daily,
    start,
    cells: CLOSED_CELL.repeat(width * height),
    boom: null,
    boomOpened: [],
    hints: 0,
    mistakes: 0,
    ms: 0,
    done: false,
  };
  return field ? withField(play, field) : play;
}

/** The field made (around the player's first place, or before the game): its first place opened. */
export function withField(play: MinesPlay, field: Field): MinesPlay {
  const next = { ...play, field };
  return openCells(next, [field.start]).play;
}

/** The cells opened by opening `cells` (empty neighbours open their neighbours, and so on); mines among them noted. */
function cascade(play: MinesPlay, field: Field, cells: readonly number[]): { cells: string[]; opened: number[]; boom: number | null } {
  const table = neighbourTable(field);
  const nums = numbers(field);
  const mine = mineMap(field);
  const out = play.cells.split('');
  const opened: number[] = [];
  let boom: number | null = null;
  const stack = [...cells];
  while (stack.length) {
    const cell = stack.pop()!;
    if (out[cell] !== CLOSED_CELL) continue;
    out[cell] = OPEN;
    opened.push(cell);
    if (mine[cell]) {
      boom ??= cell;
      continue;
    }
    if (nums[cell] === 0) for (const other of table[cell]!) if (out[other] === CLOSED_CELL) stack.push(other);
  }
  return { cells: out, opened, boom };
}

/** Opens cells; a mine among them ends the game (or waits to be taken back), the last safe cell wins it. */
function openCells(play: MinesPlay, cells: readonly number[]): { play: MinesPlay; boom: number | null } {
  const field = play.field!;
  const c = cascade(play, field, cells);
  if (c.opened.length === 0) return { play, boom: null };
  if (c.boom !== null) return { play: { ...play, cells: c.cells.join(''), boom: c.boom, boomOpened: c.opened }, boom: c.boom };
  const next = { ...play, cells: c.cells.join('') };
  return { play: won(next) ? finish(next) : next, boom: null };
}

/** Every cell without a mine is open. */
function won(play: MinesPlay): boolean {
  const mine = mineMap(play.field!);
  for (let cell = 0; cell < play.cells.length; cell++) if (!mine[cell] && play.cells[cell] !== OPEN) return false;
  return true;
}

/** The end: the game puts the flags on the mines itself. */
function finish(play: MinesPlay): MinesPlay {
  const mine = mineMap(play.field!);
  const cells = play.cells.split('').map((c, i) => (mine[i] ? FLAG : c));
  return { ...play, cells: cells.join(''), done: true };
}

/** Whether the game takes moves: a field there, not won, no mine shown. */
export const playing = (play: MinesPlay): boolean => !play.done && play.boom === null;

/** Opens a closed cell (a flag stays closed). */
export function openCell(play: MinesPlay, cell: number): MinesPlay {
  if (!playing(play) || !play.field || play.cells[cell] !== CLOSED_CELL) return play;
  return openCells(play, [cell]).play;
}

/** Puts a flag on a closed cell or takes it off. */
export function toggleFlag(play: MinesPlay, cell: number): MinesPlay {
  if (!playing(play) || !play.field) return play;
  const now = play.cells[cell];
  if (now === OPEN) return play;
  const cells = play.cells.split('');
  cells[cell] = now === FLAG ? CLOSED_CELL : FLAG;
  return { ...play, cells: cells.join('') };
}

/** The flags around an open number, and its closed neighbours without a flag. */
export function aroundNumber(play: MinesPlay, cell: number): { number: number; flags: number; closed: number[] } | null {
  if (!play.field || play.cells[cell] !== OPEN) return null;
  const nums = numbers(play.field);
  let flags = 0;
  const closed: number[] = [];
  for (const other of neighbourTable(play.field)[cell]!) {
    if (play.cells[other] === FLAG) flags++;
    else if (play.cells[other] === CLOSED_CELL) closed.push(other);
  }
  return { number: nums[cell]!, flags, closed };
}

/** A number with as many flags around as it says: its other closed neighbours open (a wrong flag may open a mine). */
export function openAround(play: MinesPlay, cell: number): MinesPlay {
  if (!playing(play)) return play;
  const a = aroundNumber(play, cell);
  if (!a || a.number === 0 || a.flags !== a.number || a.closed.length === 0) return play;
  return openCells(play, a.closed).play;
}

/** After a mine: take the move back (the game goes on; a mistake is counted), or start over. */
export function afterMine(play: MinesPlay, how: AfterMine): MinesPlay {
  if (play.boom === null) return play;
  if (how === 'restart') return startOver(play);
  const cells = play.cells.split('');
  for (const cell of play.boomOpened) cells[cell] = CLOSED_CELL;
  return { ...play, cells: cells.join(''), boom: null, boomOpened: [], mistakes: play.mistakes + 1 };
}

/** The same field from its first place again: a new try, its hints, mistakes and time from nothing. */
export function startOver(play: MinesPlay): MinesPlay {
  const fresh: MinesPlay = { ...play, cells: CLOSED_CELL.repeat(play.cells.length), boom: null, boomOpened: [], hints: 0, mistakes: 0, ms: 0, done: false };
  return play.field ? openCells(fresh, [play.field.start]).play : fresh;
}

/** Mines left to find, as the player counts them: all the mines minus the flags (below 0 if there are too many flags). */
export function minesLeft(play: MinesPlay, mines: number): number {
  let flags = 0;
  for (const c of play.cells) if (c === FLAG) flags++;
  return mines - flags;
}

/** Whether the player has done anything beyond the first place (a game to count as played if left). */
export function started(play: MinesPlay): boolean {
  if (!play.field) return false;
  const fresh = withField({ ...play, field: null, cells: CLOSED_CELL.repeat(play.cells.length) }, play.field);
  return fresh.cells !== play.cells || play.hints > 0 || play.mistakes > 0;
}

export const countHint = (play: MinesPlay): MinesPlay => ({ ...play, hints: play.hints + 1 });

export const addTime = (play: MinesPlay, ms: number): MinesPlay => (play.done || play.boom !== null || ms <= 0 ? play : { ...play, ms: play.ms + ms });
