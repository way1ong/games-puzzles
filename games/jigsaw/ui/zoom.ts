// The board's measures on the screen (docs/jigsaw/SPEC.md, "Поле й наближення"): the piece size with which the whole
// board fits its room; whether it can be zoomed (its pieces smaller than a finger wants) and how far; which part of a
// zoomed board is seen, and how a finger, a pinch, the keys and the wheel move it. Pure: numbers in, numbers out —
// no DOM. (The same reckoning as Mines' field, for a board that opens whole.)
import { JIGSAW } from '../config.ts';

/** The page's rem when the player's text size is the browser's own: sizes grow with larger text. */
const BASE_REM = 16;

export interface Room {
  w: number;
  h: number;
}

export interface Limits {
  /** The largest piece with which the whole board fits the room. */
  fit: number;
  /** What a pinch may give: from the whole board to the largest piece. */
  min: number;
  max: number;
  /** The piece under a finger the game wants (rule 6), in the player's text size. */
  comfortable: number;
  /** The whole board fits only with smaller pieces than that: it can be zoomed in. */
  zoomable: boolean;
}

export function limits(cols: number, rows: number, room: Room, rem: number): Limits {
  const scale = rem / BASE_REM;
  const comfortable = Math.round(JIGSAW.cell.comfortable * scale);
  const largest = Math.round(JIGSAW.cell.zoomMax * scale);
  const fit = Math.max(1, Math.floor(Math.min(room.w / cols, room.h / rows)));
  const zoomable = fit < comfortable;
  return { fit, min: fit, max: zoomable ? Math.max(largest, comfortable) : fit, comfortable, zoomable };
}

/** Which part of the board is seen: the piece's size and how far the board is moved left (x) and up (y), px. */
export interface View {
  cell: number;
  x: number;
  y: number;
}

/** Everything the measures depend on. */
export interface Frame {
  cols: number;
  rows: number;
  room: Room;
  rem: number;
  limits: Limits;
}

export function frameOf(cols: number, rows: number, room: Room, rem: number): Frame {
  return { cols, rows, room, rem, limits: limits(cols, rows, room, rem) };
}

/** The part of the board seen, and where it stands in the room: in the middle. */
export interface Measures {
  gridW: number;
  gridH: number;
  left: number;
  top: number;
}

export function measures(f: Frame, cell: number): Measures {
  const gridW = Math.max(0, Math.min(f.cols * cell, f.room.w));
  const gridH = Math.max(0, Math.min(f.rows * cell, f.room.h));
  return { gridW, gridH, left: Math.max(0, Math.floor((f.room.w - gridW) / 2)), top: Math.max(0, Math.floor((f.room.h - gridH) / 2)) };
}

/** A view within bounds: a piece size the limits allow, the board not moved past its edges; whole pixels. */
export function clampView(f: Frame, view: View): View {
  const cell = Math.min(f.limits.max, Math.max(f.limits.min, Math.round(view.cell)));
  const m = measures(f, cell);
  const x = Math.min(Math.max(0, f.cols * cell - m.gridW), Math.max(0, view.x));
  const y = Math.min(Math.max(0, f.rows * cell - m.gridH), Math.max(0, view.y));
  return { cell, x: Math.round(x), y: Math.round(y) };
}

/** Zooms to a piece size, the board's point under (px, py) of the room staying there (as far as the edges let it). */
export function zoomAround(f: Frame, view: View, cell: number, px: number, py: number): View {
  const m0 = measures(f, view.cell);
  const gx = (px - m0.left + view.x) / view.cell;
  const gy = (py - m0.top + view.y) / view.cell;
  const c = Math.min(f.limits.max, Math.max(f.limits.min, Math.round(cell)));
  const m = measures(f, c);
  return clampView(f, { cell: c, x: gx * c - (px - m.left), y: gy * c - (py - m.top) });
}

/** Moves the board by (dx, dy) pixels: what was seen to the right comes in sight for a positive dx. */
export const panBy = (f: Frame, view: View, dx: number, dy: number): View => clampView(f, { ...view, x: view.x + dx, y: view.y + dy });

/** Moves the board as little as needed for a place to be seen whole. */
export function showPlace(f: Frame, view: View, index: number): View {
  const m = measures(f, view.cell);
  const c = view.cell;
  const left = (index % f.cols) * c;
  const top = Math.floor(index / f.cols) * c;
  let { x, y } = view;
  if (left < x) x = left;
  else if (left + c > x + m.gridW) x = left + c - m.gridW;
  if (top < y) y = top;
  else if (top + c > y + m.gridH) y = top + c - m.gridH;
  return clampView(f, { cell: c, x, y });
}

/**
 * The whole board, or zoomed in around a place (the middle of the board without one): twice the whole board's piece,
 * never under the comfortable size nor over the largest.
 */
export function openView(f: Frame, whole: boolean, around: number | null): View {
  if (!f.limits.zoomable || whole) return clampView(f, { cell: f.limits.fit, x: 0, y: 0 });
  const c = Math.min(f.limits.max, Math.max(f.limits.comfortable, f.limits.fit * 2));
  const m = measures(f, c);
  const cx = around === null ? (f.cols * c) / 2 : ((around % f.cols) + 0.5) * c;
  const cy = around === null ? (f.rows * c) / 2 : (Math.floor(around / f.cols) + 0.5) * c;
  return clampView(f, { cell: c, x: cx - m.gridW / 2, y: cy - m.gridH / 2 });
}

/** The point of the board (in pieces) under (px, py) of the room; null outside the part seen. */
export function pointAt(f: Frame, view: View, px: number, py: number): { x: number; y: number } | null {
  const m = measures(f, view.cell);
  const x = px - m.left;
  const y = py - m.top;
  if (x < 0 || y < 0 || x >= m.gridW || y >= m.gridH) return null;
  return { x: (x + view.x) / view.cell, y: (y + view.y) / view.cell };
}
