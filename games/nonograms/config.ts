// Nonograms ("Малюнки за числами"): every number of the rules and the game's addresses (docs/nonograms/SPEC.md).
// The logic and the screen read only these names.
import { gameAddress } from '../../shared/core/address.ts';

/** The sizes of the pictures, cells across and down (decision of 25.11: all three at once). */
export const SIZES = [5, 10, 15] as const;
export type Size = (typeof SIZES)[number];

export const NONOGRAMS = {
  name: 'way1ong Nonograms',
  links: { site: null as string | null, game: gameAddress('nonograms') },
  /** The picture of the day: chosen from the album by the date, of this size (C). */
  daily: { size: 10 as Size },
  /** Thicker grid lines after every this many cells, for counting (C). */
  thickEvery: 5,
  /**
   * A cell's size, CSS px: comfortable under a finger (rule 6). A grid that fits the screen only with cells under it
   * opens zoomed in to that size (C); a view the player zooms out paints at any size of cell (decision of 27.11).
   */
  cell: { comfortable: 44 },
  /** The largest cell when zoomed in, CSS px (C). */
  zoomMaxCell: 88,
  /** Pixels a finger or the mouse travels before a press becomes a drag along a line (C). */
  dragStart: 6,
  /** A short buzz when a stroke fills cells, ms (a setting, off by default; as Blocks' placing of a piece) (C). */
  vibrateMs: 12,
  /**
   * The colour section (decision of 28.11) (C): the most paints a picture there may have (each has a key, 1 to 9, and a
   * pattern of its own: styles/app.css, .pat-1 …) and the most numbers in one of its lines. Colour numbers start a new
   * run at every change of colour, so a line may get many, and the numbers and the paint buttons then leave the grid
   * no room on a small phone — measured 28.11 on 360 × 640 at the comfortable cell: 12 numbers in a column left no row
   * of the grid, 11 — one, 7 paints with 7 numbers — under two; 9 numbers and 5 paints — close to three, as many as
   * the album's black-and-white 15 × 15 pictures leave there.
   */
  colour: { maxPaints: 6, mostNumbers: 9 },
} as const;
