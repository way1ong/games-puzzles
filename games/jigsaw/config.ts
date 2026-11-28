// Jigsaw ("Пазли"): every number of the rules and the game's addresses (docs/jigsaw/SPEC.md). (C) = Claude's
// proposal within the plan approved on 28.11 ("Роби"); change it here, not in the logic.
import { gameAddress } from '../../shared/core/address.ts';

/** The sizes of a puzzle, the smallest first (decisions of 28.11: three sizes, then 150 pieces — "Very hard"). */
export const DIFFICULTIES = ['easy', 'medium', 'hard', 'expert'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export type Room = 'study' | 'bakery' | 'station';

/**
 * A close-up of a room (decision of 28.11: three for each room, by day and by night): the part of the drawing it shows,
 * in the drawing's own units (the whole room is 1200 × 800) — its left and top edges and its width; its height is two
 * thirds of the width, so it is 3 : 2 as the whole room (C: chosen by eye on the drawings).
 */
export const CROPS = {
  study: { shelves: { x: 0, y: 30, w: 750 }, desk: { x: 690, y: 300, w: 510 }, rug: { x: 300, y: 400, w: 600 } },
  bakery: { shelves: { x: 0, y: 40, w: 720 }, window: { x: 420, y: 40, w: 540 }, counter: { x: 690, y: 250, w: 510 } },
  station: { window: { x: 40, y: 60, w: 540 }, office: { x: 570, y: 100, w: 630 }, benches: { x: 40, y: 380, w: 630 } },
} as const;

/**
 * The pictures: the rooms of Detective by day and by night (decision of 28.11), then their close-ups (decision of
 * 28.11, later the same day). A saved puzzle keeps its picture's number, so new pictures only ever go at the end.
 * Things lie in a room as in Detective's free search, placed from the puzzle's seed, so every puzzle differs a little.
 */
export const PICTURES = [
  { room: 'study', time: 'day', crop: null },
  { room: 'study', time: 'night', crop: null },
  { room: 'bakery', time: 'day', crop: null },
  { room: 'bakery', time: 'night', crop: null },
  { room: 'station', time: 'day', crop: null },
  { room: 'station', time: 'night', crop: null },
  { room: 'study', time: 'day', crop: 'shelves' },
  { room: 'study', time: 'night', crop: 'shelves' },
  { room: 'study', time: 'day', crop: 'desk' },
  { room: 'study', time: 'night', crop: 'desk' },
  { room: 'study', time: 'day', crop: 'rug' },
  { room: 'study', time: 'night', crop: 'rug' },
  { room: 'bakery', time: 'day', crop: 'shelves' },
  { room: 'bakery', time: 'night', crop: 'shelves' },
  { room: 'bakery', time: 'day', crop: 'window' },
  { room: 'bakery', time: 'night', crop: 'window' },
  { room: 'bakery', time: 'day', crop: 'counter' },
  { room: 'bakery', time: 'night', crop: 'counter' },
  { room: 'station', time: 'day', crop: 'window' },
  { room: 'station', time: 'night', crop: 'window' },
  { room: 'station', time: 'day', crop: 'office' },
  { room: 'station', time: 'night', crop: 'office' },
  { room: 'station', time: 'day', crop: 'benches' },
  { room: 'station', time: 'night', crop: 'benches' },
] as const;
export type Picture = (typeof PICTURES)[number];

export const JIGSAW = {
  /** The game's name where it is installed and in the shared daily result; the short name is app.name in the dictionaries. */
  name: 'way1ong Jigsaw',
  /** The studio's site for the "Made by way1ong" line, and the game itself for the shared result; null — not public yet. */
  links: { site: null as string | null, game: gameAddress('jigsaw') },
  /**
   * Pieces across and down (decision of 28.11: 24, 54 and 96 pieces). The pictures are 3 : 2 (Detective's rooms), so
   * every piece is a square.
   */
  sizes: {
    easy: { cols: 6, rows: 4 },
    medium: { cols: 9, rows: 6 },
    hard: { cols: 12, rows: 8 },
    expert: { cols: 15, rows: 10 },
  } satisfies Record<Difficulty, { cols: number; rows: number }>,
  /** The puzzle of the day (decision of 28.11: 54 pieces). */
  daily: 'medium' as Difficulty,
  /**
   * The knobs (C), in parts of a piece's side: every edge between two pieces has one, sticking out of one piece into
   * the other. Its round head, the narrower neck under it and the straight shoulders beside it; how far it reaches
   * beyond the edge. Where along the edge it stands (the middle, give or take `shift`) and its size (the usual one,
   * larger or smaller by up to `vary`) come from the puzzle's seed.
   */
  knob: {
    head: 0.125,
    neck: 0.07,
    shoulder: 0.08,
    reach: 0.26,
    shift: 0.05,
    vary: 0.08,
  },
  /** A piece's drawing reaches this far beyond its square on every side: the largest knob fits (C). */
  margin: 0.3,
  /**
   * Let go with its middle this near its place — across and down, in parts of a side — a piece snaps into it (C). More
   * than half a side: on a phone a piece of 96 is about 29 px, and the place to aim at is then about 44 px (rule 6).
   */
  snap: 0.75,
  /**
   * The board's piece (CSS px): the size under a finger the game wants (rule 6) — a board that fits the screen only
   * with smaller pieces can be zoomed in, up to the largest (C).
   */
  cell: { comfortable: 44, zoomMax: 96 },
  /**
   * A piece in the tray, without its knobs (CSS px): never smaller than a finger wants (rule 6, decision of 28.11),
   * at most `most`; as large as on the board between the two, as long as a page of the tray still holds `page`
   * pieces (or all that are left) — else smaller (C).
   */
  tray: { least: 44, most: 80, page: 12 },
  /** Pixels a finger or the mouse travels before a press lifts a piece or moves the board (C). */
  dragStart: 8,
  /** The picture is drawn once into an image this many device pixels wide at the most (C). */
  rasterMax: 2400,
  /** The pale picture on the board under the empty places (decision of 28.11: on, a switch in the menu). */
  defaultGhost: true,
  /**
   * Turned pieces (decision of 28.11: a switch in the menu, off by default): every piece starts turned by 0, 1, 2 or
   * 3 quarters (from the puzzle's seed); the piece taken turns a quarter clockwise at each tap; it goes into its place
   * only standing right.
   */
  defaultTurning: false,
  /** A short buzz when a puzzle is done (a setting, off by default) (C). */
  vibrateMs: 12,
} as const;
