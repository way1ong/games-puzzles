// The course of a puzzle (docs/jigsaw/SPEC.md): pieces put into their places — a piece let go near its own place snaps
// in and stays; anywhere else it goes back to the tray — the hints, the time and the end. Help has no limit, but it is
// counted. Pure: every function returns a new game, or null when the action cannot be made.
import { DIFFICULTIES, JIGSAW, PICTURES, type Difficulty } from '../config.ts';
import { hintPiece } from './hint.ts';
import { partSeed } from './seeds.ts';
import { trayOrder } from './tray.ts';

/** How a puzzle is played: free play (the player chose the size and the picture), or the puzzle of the day. */
export type Way = 'free' | 'daily';

export interface JigsawPlay {
  way: Way;
  /** The size (the puzzle of the day has the day's). */
  difficulty: Difficulty;
  /** The puzzle of the day: its date ("YYYY-MM-DD"). */
  daily: string | null;
  seed: number;
  /** Which of the game's pictures. */
  picture: number;
  /** The pieces in their places, in the order they were put. */
  placed: number[];
  hints: number;
  ms: number;
  done: boolean;
}

export function newPlay(way: Way, difficulty: Difficulty, seed: number, picture: number, daily: string | null = null): JigsawPlay {
  return { way, difficulty, daily: way === 'daily' ? daily : null, seed: seed >>> 0, picture, placed: [], hints: 0, ms: 0, done: false };
}

/** Pieces across and down. */
export const gridOf = (play: JigsawPlay): { cols: number; rows: number } => JIGSAW.sizes[play.difficulty];

export function piecesOf(play: JigsawPlay): number {
  const { cols, rows } = gridOf(play);
  return cols * rows;
}

/** Let go with its middle at (x, y) of the board (in pieces), a piece snaps into its own place. */
export function nearHome(cols: number, piece: number, x: number, y: number): boolean {
  const r = Math.floor(piece / cols);
  const c = piece % cols;
  return Math.abs(x - (c + 0.5)) <= JIGSAW.snap && Math.abs(y - (r + 0.5)) <= JIGSAW.snap;
}

/** A piece put into its place (the hint's "Put it"); null — no such piece, or it is there already. */
export function place(play: JigsawPlay, piece: number): JigsawPlay | null {
  if (play.done || !Number.isInteger(piece) || piece < 0 || piece >= piecesOf(play) || play.placed.includes(piece)) return null;
  const placed = [...play.placed, piece];
  return { ...play, placed, done: placed.length === piecesOf(play) };
}

/** A piece let go with its middle at (x, y) of the board: in its place if near it; null — not here (back to the tray). */
export function drop(play: JigsawPlay, piece: number, x: number, y: number): JigsawPlay | null {
  return nearHome(gridOf(play).cols, piece, x, y) ? place(play, piece) : null;
}

/** The pieces still in the tray, in its order. */
export function trayOf(play: JigsawPlay): number[] {
  const { cols, rows } = gridOf(play);
  const placed = new Set(play.placed);
  return trayOrder(cols, rows, partSeed(play.seed, 'tray')).filter((p) => !placed.has(p));
}

/** The piece the hint suggests; null at the end. */
export function hintOf(play: JigsawPlay): number | null {
  const { cols, rows } = gridOf(play);
  return hintPiece(cols, rows, new Set(play.placed), trayOf(play));
}

/** A hint was shown (counted when given). */
export function countHint(play: JigsawPlay): JigsawPlay {
  return { ...play, hints: play.hints + 1 };
}

export function addTime(play: JigsawPlay, ms: number): JigsawPlay {
  return play.done || ms <= 0 ? play : { ...play, ms: play.ms + ms };
}

/** Put together without a hint. */
export const clean = (play: JigsawPlay): boolean => play.hints === 0;

/** Begun: a piece in its place, or a hint asked. */
export const started = (play: JigsawPlay): boolean => play.placed.length > 0 || play.hints > 0;

/** A saved game that holds together: its size and picture are the game's, every piece placed once, the end where it is. */
export function validPlay(play: JigsawPlay): boolean {
  if (!play || typeof play !== 'object') return false;
  if (play.way !== 'free' && play.way !== 'daily') return false;
  if (!(DIFFICULTIES as readonly string[]).includes(play.difficulty)) return false;
  if (play.way === 'daily' ? typeof play.daily !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(play.daily) : play.daily !== null) return false;
  if (!Number.isInteger(play.seed) || play.seed < 0 || !Number.isInteger(play.picture) || play.picture < 0 || play.picture >= PICTURES.length) return false;
  if (!Number.isInteger(play.hints) || play.hints < 0 || typeof play.ms !== 'number' || !Number.isFinite(play.ms) || play.ms < 0) return false;
  const n = piecesOf(play);
  if (!Array.isArray(play.placed) || !play.placed.every((p) => Number.isInteger(p) && p >= 0 && p < n)) return false;
  if (new Set(play.placed).size !== play.placed.length) return false;
  return play.done === (play.placed.length === n);
}
