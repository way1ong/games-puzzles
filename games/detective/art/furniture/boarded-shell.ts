// The post hall: a plastered wall with a stencilled frieze under the ceiling, painted boards below the rail,
// the skirting board and a chevron parquet: columns of blocks running away from the viewer, every other column a
// shade darker, the joints zigzagging across them.
import { DETECTIVE } from '../../config.ts';
import type { Ctx } from '../defs.ts';
import { circle, el, n, path, rect } from '../svg.ts';

const { width: W, height: H } = DETECTIVE.scene;

export interface BoardedShell {
  /** Where the skirting board starts, where the floor starts, the top edge of the wall boards. */
  skirting: number;
  floor: number;
  rail: number;
}

/** The frieze under the ceiling: how tall it is, and how wide one motif of the stencil. */
const FRIEZE = 30;
const MOTIF = 44;
/** Wall boards: how wide one is. */
const BOARD = 22;
/** Parquet columns: how wide one is at the wall and at the viewer's feet; a block is this long for its width. */
const FAR = 46;
const NEAR = 96;
const BLOCK = 0.62;

export function boardedShellDefs(c: Ctx): string {
  const { p } = c;
  // the stencil: a little flower with two leaves between dots
  return el(
    'pattern',
    { id: c.id('frieze'), y: 5, width: MOTIF, height: FRIEZE - 10, patternUnits: 'userSpaceOnUse' },
    path('M22 2 q5 6 0 12 q-5 -6 0 -12Z M22 10 q-7 -1 -10 4 q6 1 10 -4Z M22 10 q7 -1 10 4 q-6 1 -10 -4Z', p.wallMotif) + circle(3, 10, 2, p.wallMotif) + circle(41, 10, 2, p.wallMotif),
  );
}

/** The chevron parquet: alternate columns shaded, the joints in one zigzag line per row. */
function parquet(c: Ctx, floor: number): string {
  const { p } = c;
  const widthAt = (y: number) => FAR + ((y - floor) / (H - floor)) * (NEAR - FAR);
  const xAt = (k: number, y: number) => n(W / 2 + k * widthAt(y));
  const half = Math.ceil(W / 2 / FAR) + 1;
  let dark = '';
  let seams = '';
  for (let k = -half; k <= half; k++) {
    if ((k + 100) % 2) dark += `M${xAt(k, floor)} ${floor}L${xAt(k + 1, floor)} ${floor}L${xAt(k + 1, H)} ${H}L${xAt(k, H)} ${H}Z`;
    seams += `M${xAt(k, floor)} ${floor}L${xAt(k, H)} ${H}`;
  }
  // the joints: each row zigzags up and down across the columns
  for (let y = floor; y < H; y += Math.round(widthAt(y) * BLOCK)) {
    const rise = n(widthAt(y) * BLOCK * 0.5);
    seams += `M${xAt(-half, y)} ${y}`;
    for (let k = -half; k <= half; k++) {
      const yy = n(y + ((k + 100) % 2 ? 0 : rise));
      seams += `L${xAt(k + 1, yy)} ${yy}`;
    }
  }
  return path(dark, p.parquet, { opacity: 0.45 }) + path(seams, 'none', { stroke: p.plank, 'stroke-width': 1.4, 'stroke-opacity': 0.6, 'stroke-linejoin': 'round' });
}

export function boardedShell(c: Ctx, m: BoardedShell): string {
  const { p } = c;
  // the wall, the frieze and the picture rail under it
  let s = rect(0, 0, W, m.floor, c.ref('wall')) + rect(0, 0, W, FRIEZE, p.wallMotif, { opacity: 0.35 }) + rect(0, 0, W, FRIEZE, c.ref('frieze'));
  s += rect(0, FRIEZE, W, 5, p.woodMid) + rect(0, FRIEZE + 5, W, 3, p.black, { opacity: 0.08 });
  // painted boards below the rail: a groove and a light edge for every board
  let grooves = '';
  let edges = '';
  for (let x = BOARD; x < W; x += BOARD) {
    grooves += `M${x} ${m.rail}V${m.skirting}`;
    edges += `M${x + 2} ${m.rail}V${m.skirting}`;
  }
  s += rect(0, m.rail, W, m.skirting - m.rail, p.boardBlue);
  s += path(grooves, 'none', { stroke: p.boardBlueDark, 'stroke-width': 2 }) + path(edges, 'none', { stroke: p.boardBlueLight, 'stroke-width': 1.5, 'stroke-opacity': 0.6 });
  // the rail on top of the boards, the skirting board
  s += rect(0, m.rail - 7, W, 12, p.woodDark) + rect(0, m.rail - 7, W, 3, p.white, { opacity: 0.14 }) + rect(0, m.rail + 5, W, 4, p.black, { opacity: 0.16 });
  s += rect(0, m.skirting, W, m.floor - m.skirting, p.skirting) + rect(0, m.skirting, W, 3, p.white, { opacity: 0.12 });
  s += rect(0, m.floor, W, H - m.floor, c.ref('floor')) + parquet(c, m.floor);
  return s + rect(0, m.floor, W, H - m.floor, c.ref('grain'), { opacity: 0.6 }) + rect(0, m.floor, W, 14, p.black, { opacity: 0.1 });
}
