// Where the bottles stand (docs/pour/SPEC.md, "Керування"): in rows that fill the shelf, every bottle's column at
// least 44 px across (rule 6: the whole column is what a finger touches), the bottles as big as the shelf allows,
// with room above each row for a lifted bottle. Pure: measures in, sizes out.

/** A bottle's height to its width (C). */
export const BOTTLE_ASPECT = 3.4;
/** How far a lifted bottle rises, in its widths (C). */
export const LIFT = 0.45;
/** The narrowest column a finger may touch, CSS px (rule 6). */
export const LEAST_COLUMN = 44;

export interface ShelfFit {
  cols: number;
  rows: number;
  /** The glass's width and height, CSS px. */
  glassW: number;
  glassH: number;
}

/**
 * The rows that give the biggest bottles in a room `w` × `h` (CSS px): `count` bottles, `gap` between rows and
 * columns, a glass at most `widest` across.
 */
export function fitShelf(count: number, w: number, h: number, gap: number, widest: number): ShelfFit {
  const most = Math.max(1, Math.floor((w + gap) / (LEAST_COLUMN + gap)));
  let best: ShelfFit | null = null;
  for (let rows = 1; rows <= count; rows++) {
    const cols = Math.ceil(count / rows);
    if (cols > most) continue;
    // rows of a balanced shelf: no row much shorter than the others
    if (rows > 1 && cols * (rows - 1) >= count) continue;
    const column = (w - gap * (cols - 1)) / cols;
    const byWidth = Math.min(widest, column * 0.7);
    const rowRoom = (h - gap * (rows - 1)) / rows;
    const byHeight = rowRoom / (BOTTLE_ASPECT + LIFT);
    const glassW = Math.floor(Math.min(byWidth, byHeight));
    if (!best || glassW > best.glassW) best = { cols, rows, glassW, glassH: Math.floor(glassW * BOTTLE_ASPECT) };
  }
  // a shelf narrower than one column: one bottle a row, as wide as fits
  return best ?? { cols: 1, rows: count, glassW: Math.max(1, Math.floor(w * 0.7)), glassH: Math.floor(Math.max(1, w * 0.7) * BOTTLE_ASPECT) };
}
