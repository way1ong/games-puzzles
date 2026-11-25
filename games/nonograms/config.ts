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
   * A cell's size, CSS px: comfortable under a finger (rule 6) and the least that may still be filled (WCAG 2.2 AA).
   * A grid that fits the screen only with cells under `comfortable` opens zoomed in to that size; in a view with
   * cells under `least` a tap zooms in instead of filling (C).
   */
  cell: { comfortable: 44, least: 24 },
  /** The largest cell when zoomed in, CSS px (C). */
  zoomMaxCell: 88,
  /** Pixels a finger or the mouse travels before a press becomes a drag along a line (C). */
  dragStart: 6,
  /** A short buzz when a stroke fills cells, ms (a setting, off by default; as Blocks' placing of a piece) (C). */
  vibrateMs: 12,
} as const;
