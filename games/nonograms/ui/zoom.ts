// The board's measures on the screen (docs/nonograms/SPEC.md, "Великі поля на телефоні — наближення"): the numbers'
// room for a cell size; the cell with which the whole grid fits the room; whether the grid can be zoomed and the
// size it opens with; which part of a zoomed grid is seen, and how a pinch, the keys and the wheel move it.
// Pure: numbers in, numbers out — no DOM.
import { NONOGRAMS } from '../config.ts';

/** The numbers' font: this part of a cell, within these bounds (in the page's rem, so large text makes them larger). */
const FONT_PER_CELL = 0.4;
const FONT_MIN_REM = 0.8125;
const FONT_MAX_REM = 1.0625;
/** A number among a row's numbers takes this many fonts across, with the gap after it: one digit, two digits. */
export const NUMBER_W = { one: 1.05, two: 1.6 } as const;
/** A number among a column's numbers takes this many fonts down. */
const NUMBER_H = 1.2;
/** The room between the numbers and the screen's edge, in fonts. */
const PAD = 0.5;
/** The page's rem when the player's text size is the browser's own: cell sizes grow with larger text. */
const BASE_REM = 16;

export interface Room {
  w: number;
  h: number;
}

/** The numbers' room: across, the widest row's numbers in fonts (rowWidth); down, the most numbers a column has
 * (at least one: "0"). */
export interface Counts {
  rows: number;
  cols: number;
}

/** How wide a row's numbers are, in fonts ("0" for a row with none). */
export const rowWidthOf = (clue: readonly number[]): number =>
  (clue.length ? clue : [0]).reduce((sum, n) => sum + (n >= 10 ? NUMBER_W.two : NUMBER_W.one), 0);

export interface Measures {
  cell: number;
  font: number;
  /** A number's box: its width among a row's numbers (one digit, two digits), its height among a column's. */
  numberW: number;
  numberW2: number;
  numberH: number;
  /** The numbers' strips: left of the grid (their width) and above it (their height). */
  rowsW: number;
  colsH: number;
  /** The part of the grid that is seen. */
  gridW: number;
  gridH: number;
  /** Where the board (the strips and the grid seen) stands in the room: in the middle across, at the top (a note
   * under the board may come and go: the grid stays where it is). */
  left: number;
  top: number;
}

export function measures(size: number, counts: Counts, room: Room, cell: number, rem: number): Measures {
  const font = Math.min(FONT_MAX_REM * rem, Math.max(FONT_MIN_REM * rem, cell * FONT_PER_CELL));
  const numberW = font * NUMBER_W.one;
  const numberW2 = font * NUMBER_W.two;
  const numberH = font * NUMBER_H;
  const rowsW = Math.ceil(counts.rows * font + font * PAD);
  const colsH = Math.ceil(counts.cols * numberH + font * PAD);
  const gridW = Math.max(0, Math.min(size * cell, room.w - rowsW));
  const gridH = Math.max(0, Math.min(size * cell, room.h - colsH));
  return {
    cell,
    font,
    numberW,
    numberW2,
    numberH,
    rowsW,
    colsH,
    gridW,
    gridH,
    left: Math.max(0, Math.floor((room.w - rowsW - gridW) / 2)),
    top: 0,
  };
}

export interface Limits {
  /** The largest whole cell with which the whole grid and its numbers fit the room. */
  fit: number;
  /** What a pinch may give: from the whole grid to the largest cell. */
  min: number;
  max: number;
  /** The cell under a finger the game wants (rule 6), in the player's text size. */
  comfortable: number;
  /** The whole grid fits only with smaller cells than that: it opens zoomed in, and can be zoomed. */
  zoomable: boolean;
}

export function limits(size: number, counts: Counts, room: Room, rem: number): Limits {
  const scale = rem / BASE_REM;
  const largest = Math.floor(NONOGRAMS.zoomMaxCell * scale);
  const comfortable = Math.round(NONOGRAMS.cell.comfortable * scale);
  const fits = (cell: number) => {
    const m = measures(size, counts, room, cell, rem);
    return size * cell + m.rowsW <= room.w && size * cell + m.colsH <= room.h;
  };
  // Both sides grow with the cell: the largest that fits, by halves.
  let lo = 1;
  let hi = largest;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (fits(mid)) lo = mid;
    else hi = mid - 1;
  }
  const fit = lo;
  const zoomable = fit < comfortable;
  return { fit, min: fit, max: zoomable ? Math.max(largest, comfortable) : fit, comfortable, zoomable };
}

/** Which part of the grid is seen: the cell's size and how far the grid is moved left (x) and up (y), px. */
export interface View {
  cell: number;
  x: number;
  y: number;
}

/** Everything the measures depend on. */
export interface Frame {
  size: number;
  counts: Counts;
  room: Room;
  rem: number;
  limits: Limits;
}

export const measuresOf = (f: Frame, view: View): Measures => measures(f.size, f.counts, f.room, view.cell, f.rem);

/** A view within bounds: a cell size the limits allow, the grid not moved past its edges; whole pixels. */
export function clampView(f: Frame, view: View): View {
  const cell = Math.min(f.limits.max, Math.max(f.limits.min, Math.round(view.cell)));
  const m = measures(f.size, f.counts, f.room, cell, f.rem);
  const x = Math.min(Math.max(0, f.size * cell - m.gridW), Math.max(0, view.x));
  const y = Math.min(Math.max(0, f.size * cell - m.gridH), Math.max(0, view.y));
  return { cell, x: Math.round(x), y: Math.round(y) };
}

/** The grid's point under (px, py) of the room, in cells (may lie outside the grid). */
function pointIn(f: Frame, view: View, px: number, py: number): { gx: number; gy: number } {
  const m = measuresOf(f, view);
  return { gx: (px - m.left - m.rowsW + view.x) / view.cell, gy: (py - m.top - m.colsH + view.y) / view.cell };
}

/** Zooms to a cell size, the grid's point under (px, py) staying there (as far as the edges let it). */
export function zoomAround(f: Frame, view: View, cell: number, px: number, py: number): View {
  const { gx, gy } = pointIn(f, view, px, py);
  const c = Math.min(f.limits.max, Math.max(f.limits.min, Math.round(cell)));
  const m = measures(f.size, f.counts, f.room, c, f.rem);
  return clampView(f, { cell: c, x: gx * c - (px - m.left - m.rowsW), y: gy * c - (py - m.top - m.colsH) });
}

/** Moves the grid by (dx, dy) pixels: what was seen to the right comes in sight for a positive dx. */
export const panBy = (f: Frame, view: View, dx: number, dy: number): View => clampView(f, { ...view, x: view.x + dx, y: view.y + dy });

/** Moves the grid as little as needed for a cell to be seen whole. */
export function showCell(f: Frame, view: View, index: number): View {
  const m = measuresOf(f, view);
  const c = view.cell;
  const left = (index % f.size) * c;
  const top = Math.floor(index / f.size) * c;
  let { x, y } = view;
  if (left < x) x = left;
  else if (left + c > x + m.gridW) x = left + c - m.gridW;
  if (top < y) y = top;
  else if (top + c > y + m.gridH) y = top + c - m.gridH;
  return clampView(f, { cell: c, x, y });
}

/** The view a grid opens with: the whole of it, or (when it can be zoomed) the comfortable size around a cell. */
export function openView(f: Frame, whole: boolean, around: number | null): View {
  if (!f.limits.zoomable || whole) return clampView(f, { cell: f.limits.fit, x: 0, y: 0 });
  const c = f.limits.comfortable;
  const m = measures(f.size, f.counts, f.room, c, f.rem);
  const middle = (f.size * c) / 2;
  const cx = around === null ? middle : ((around % f.size) + 0.5) * c;
  const cy = around === null ? middle : (Math.floor(around / f.size) + 0.5) * c;
  return clampView(f, { cell: c, x: cx - m.gridW / 2, y: cy - m.gridH / 2 });
}

/** The cell under (px, py) of the room; null outside the grid seen (or, with `nearest`, the nearest cell). */
export function cellAt(f: Frame, view: View, px: number, py: number, nearest = false): number | null {
  const m = measuresOf(f, view);
  const x = px - m.left - m.rowsW;
  const y = py - m.top - m.colsH;
  if (!nearest && (x < 0 || y < 0 || x >= m.gridW || y >= m.gridH)) return null;
  const clamp = (v: number) => Math.min(f.size - 1, Math.max(0, Math.floor(v)));
  return clamp((y + view.y) / view.cell) * f.size + clamp((x + view.x) / view.cell);
}
