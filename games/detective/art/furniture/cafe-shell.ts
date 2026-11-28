// The café's room: a striped wallpaper, green beadboard panelling below the rail with a moulding on top, the
// skirting board and an oak floor laid in chevrons whose rows grow towards the viewer. Lines of one kind are drawn
// as one path, so the room stays light.
import { DETECTIVE } from '../../config.ts';
import type { Ctx } from '../defs.ts';
import { el, n, path, rect } from '../svg.ts';

const { width: W, height: H } = DETECTIVE.scene;

export interface CafeShell {
  /** Where the skirting board starts, where the floor starts, the top of the panelling. */
  skirting: number;
  floor: number;
  rail: number;
}

/** The wallpaper repeats every this many units: a wide stripe and two thin ones. */
const STRIPE = 40;
/** The panelling: the width of one board. */
const BOARD = 22;
/** Floor boards: how wide one is at the wall and at the viewer's feet, and how deep a row is for its width. */
const FAR = 34;
const NEAR = 70;
const DEPTH = 0.5;

const mod = (a: number, b: number) => ((a % b) + b) % b;

export function cafeShellDefs(c: Ctx): string {
  const { p } = c;
  return el(
    'pattern',
    { id: c.id('stripes'), width: STRIPE, height: STRIPE, patternUnits: 'userSpaceOnUse' },
    rect(0, 0, 14, STRIPE, p.wallMotif) + rect(22, 0, 2.5, STRIPE, p.wallMotif) + rect(30, 0, 2.5, STRIPE, p.wallMotif),
  );
}

/** The chevron floor: boards a shade darker or lighter here and there, and the seams. */
function chevrons(c: Ctx, floor: number): string {
  const { p } = c;
  const widthAt = (y: number) => FAR + ((y - floor) / (H - floor)) * (NEAR - FAR);
  let dark = '';
  let light = '';
  let seams = '';
  for (let row = 0, top = floor; top < H; row++) {
    const bottom = top + Math.round(widthAt(top) * DEPTH);
    const [a, b] = [widthAt(top), widthAt(bottom)];
    const lean = row % 2 ? 0.5 : -0.5;
    const reach = Math.ceil(W / 2 / a) + 1;
    for (let k = -reach; k < reach; k++) {
      const [x1, x2, x3, x4] = [W / 2 + k * a, W / 2 + (k + 1) * a, W / 2 + (k + 1 + lean) * b, W / 2 + (k + lean) * b];
      if (Math.max(x2, x3) < 0 || Math.min(x1, x4) > W) continue;
      const board = `M${n(x1)} ${top}L${n(x2)} ${top}L${n(x3)} ${bottom}L${n(x4)} ${bottom}Z`;
      if (mod(k * 5 + row * 3, 7) === 0) dark += board;
      else if (mod(k * 3 + row * 5, 11) === 0) light += board;
      seams += `M${n(x1)} ${top}L${n(x4)} ${bottom}`;
    }
    seams += `M0 ${top}H${W}`;
    top = bottom;
  }
  return path(dark, p.black, { opacity: 0.07 }) + path(light, p.white, { opacity: 0.06 }) + path(seams, 'none', { stroke: p.plank, 'stroke-width': 1.6, opacity: 0.75 });
}

export function cafeShell(c: Ctx, m: CafeShell): string {
  const { p } = c;
  let s = rect(0, 0, W, m.floor, c.ref('wall')) + rect(0, 0, W, m.rail, c.ref('stripes'));
  // the panelling: boards with a bead between them, lighter at the top where the light falls
  const tall = m.skirting - m.rail;
  let grooves = '';
  let beads = '';
  for (let x = 0; x < W; x += BOARD) {
    grooves += `M${x} ${m.rail}h2v${tall}h-2Z`;
    beads += `M${x + 2} ${m.rail}h2.5v${tall}h-2.5Z`;
  }
  s += rect(0, m.rail, W, tall, p.beadboard) + path(grooves, p.beadboardDark) + path(beads, p.beadboardLight, { opacity: 0.7 }) + rect(0, m.rail, W, tall, c.ref('round'), { opacity: 0.7 });
  // the moulding along the top of the panelling
  s += rect(0, m.rail - 9, W, 12, p.woodDark) + rect(0, m.rail - 9, W, 3, p.white, { opacity: 0.16 }) + rect(0, m.rail + 3, W, 6, p.black, { opacity: 0.2 });
  s += rect(0, m.skirting, W, m.floor - m.skirting, p.skirting) + rect(0, m.skirting, W, 3, p.white, { opacity: 0.12 });
  s += rect(0, m.floor, W, H - m.floor, c.ref('floor')) + chevrons(c, m.floor);
  return s + rect(0, m.floor, W, 14, p.black, { opacity: 0.1 });
}
