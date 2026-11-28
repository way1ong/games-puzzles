// Random boards of "The chest" (docs/slide/SPEC.md, "Скринька", "Головоломки складено заздалегідь"): the raw material
// from which scripts/slide/box-pool.ts takes puzzles. The chest stands anywhere but over the slot; `free` other cells
// stay free; every other cell, in reading order, gets a block that fits there — a lying or a standing one (two cells,
// with the share `pairShare`) or a small one. Pieces never overlap or leave the frame. Pure; randomness only from
// the seed.
import { nextInt, nextRandom } from '../../../shared/core/rng.ts';
import { SLIDE, type BoxShape } from '../config.ts';
import { cellsOf, exitSpot, sizeOf, type BoxPuzzle } from './box.ts';

export function randomBox(state: number, free: number, pairShare: number): { puzzle: BoxPuzzle; spots: number[]; state: number } {
  const { cols, rows } = SLIDE.box;
  const shapes: BoxShape[] = ['chest'];
  const puzzle: BoxPuzzle = { cols, rows, shapes };
  const [cw, ch] = sizeOf('chest');
  const chestSpots: number[] = [];
  for (let y = 0; y + ch <= rows; y++) for (let x = 0; x + cw <= cols; x++) if (y * cols + x !== exitSpot(puzzle)) chestSpots.push(y * cols + x);
  let draw = nextInt(state, chestSpots.length);
  state = draw.state;
  const spots = [chestSpots[draw.value]!];
  /** 1 — under a piece, 2 — kept free. */
  const taken = new Uint8Array(cols * rows);
  for (const cell of cellsOf(puzzle, 'chest', spots[0]!)) taken[cell] = 1;
  const open = [...taken.keys()].filter((c) => !taken[c]);
  for (let k = 0; k < free && open.length; k++) {
    draw = nextInt(state, open.length);
    state = draw.state;
    taken[open.splice(draw.value, 1)[0]!] = 2;
  }
  for (let cell = 0; cell < cols * rows; cell++) {
    if (taken[cell]) continue;
    const [x, y] = [cell % cols, Math.floor(cell / cols)];
    const fits = (['lying', 'standing'] as const).filter((s) => {
      const [w, h] = sizeOf(s);
      return x + w <= cols && y + h <= rows && cellsOf(puzzle, s, cell).every((c) => !taken[c]);
    });
    const a = nextRandom(state);
    state = a.state;
    let shape: BoxShape = 'single';
    if (fits.length && a.value < pairShare) {
      draw = nextInt(state, fits.length);
      state = draw.state;
      shape = fits[draw.value]!;
    }
    for (const c of cellsOf(puzzle, shape, cell)) taken[c] = 1;
    shapes.push(shape);
    spots.push(cell);
  }
  return { puzzle, spots, state };
}
