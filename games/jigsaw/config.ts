// Jigsaw ("Пазли"): every number of the rules and the game's addresses (docs/jigsaw/SPEC.md). (C) = Claude's
// proposal within the plan approved on 28.11 ("Роби"); change it here, not in the logic.
import { gameAddress } from '../../shared/core/address.ts';

/** The sizes of a puzzle, the smallest first (decision of 28.11). */
export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

/**
 * The pictures (decision of 28.11): the rooms of Detective by day and by night, in the order of the choice screen.
 * Things lie in a room as in Detective's free search, placed from the puzzle's seed, so every puzzle differs a little.
 */
export const PICTURES = [
  { room: 'study', time: 'day' },
  { room: 'study', time: 'night' },
  { room: 'bakery', time: 'day' },
  { room: 'bakery', time: 'night' },
  { room: 'station', time: 'day' },
  { room: 'station', time: 'night' },
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
  /** A short buzz when a puzzle is done (a setting, off by default) (C). */
  vibrateMs: 12,
} as const;
