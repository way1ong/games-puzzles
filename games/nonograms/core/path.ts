// The way of a finger along the grid (docs/nonograms/SPEC.md, "Керування"): a stroke goes along the row or the column
// of the cell it starts on — the first cell it reaches decides which — and keeps to that line wherever the finger
// drifts: its cells run from the start to the finger's place on the line. Pure, no DOM.

/** Along the start cell's row (across) or its column (down). */
export type Way = 'row' | 'col';

/**
 * The way of a stroke from the first other cell it reaches: across or down, whichever it moved more in cells;
 * a diagonal step goes by the finger's own move (dx, dy in pixels).
 */
export function wayOf(size: number, start: number, reached: number, dx = 0, dy = 0): Way | null {
  const dr = Math.abs(Math.floor(reached / size) - Math.floor(start / size));
  const dc = Math.abs((reached % size) - (start % size));
  if (!dr && !dc) return null;
  if (dr !== dc) return dc > dr ? 'row' : 'col';
  return Math.abs(dx) >= Math.abs(dy) ? 'row' : 'col';
}

/** The cells of a stroke from its start to the finger's cell, kept to the stroke's line (one cell before a way). */
export function pathCells(size: number, start: number, at: number, way: Way | null): number[] {
  if (way === null) return [start];
  const row = Math.floor(start / size);
  const col = start % size;
  const out: number[] = [];
  if (way === 'row') {
    const to = at % size;
    for (let c = col; ; c += to >= col ? 1 : -1) {
      out.push(row * size + c);
      if (c === to) break;
    }
  } else {
    const to = Math.floor(at / size);
    for (let r = row; ; r += to >= row ? 1 : -1) {
      out.push(r * size + col);
      if (r === to) break;
    }
  }
  return out;
}
