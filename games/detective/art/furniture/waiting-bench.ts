// A wooden bench for waiting: a back of turned spindles between two rails, an arm rest on a turned post at each
// end, turned legs with a stretcher. All wood, no iron.
import { floorShadow, type Ctx } from '../defs.ts';
import { ellipse, rect } from '../svg.ts';

export interface WaitingBench {
  x: number;
  w: number;
  seat: number;
  /** Where its feet stand on the floor. */
  foot: number;
  /** How far each arm reaches in over the seat. */
  arm: number;
}

/** A turned leg or post: a rod with two beads. */
function turned(c: Ctx, x: number, y1: number, y2: number, width: number): string {
  const { p } = c;
  const mid = x + width / 2;
  return rect(x, y1, width, y2 - y1, p.woodDark, { rx: 2 }) + ellipse(mid, y1 + (y2 - y1) * 0.3, width * 0.8, 4, p.wood) + ellipse(mid, y1 + (y2 - y1) * 0.7, width * 0.7, 3.5, p.wood);
}

export function waitingBench(c: Ctx, m: WaitingBench): string {
  const { p } = c;
  const { x, w, seat, foot, arm } = m;
  let s = floorShadow(c, x + w / 2, foot + 5, w / 2 + 12, 9, 0.3);
  // the back: two posts, a top rail and a lower rail with spindles between
  for (const px of [x + 4, x + w - 14]) s += turned(c, px, seat - 86, seat, 10);
  const spindles = Math.floor((w - 40) / 15);
  for (let i = 0; i <= spindles; i++) {
    const sx = x + 20 + (i * (w - 40)) / spindles;
    s += rect(sx - 2.5, seat - 74, 5, 56, p.wood, { rx: 2.5 }) + ellipse(sx, seat - 46, 3.6, 5, p.woodMid);
  }
  s += rect(x, seat - 88, w, 16, p.woodMid, { rx: 6 }) + rect(x, seat - 88, w, 16, c.ref('round'), { rx: 6 }) + rect(x, seat - 88, w, 16, c.ref('grain'), { rx: 6 });
  s += rect(x + 8, seat - 22, w - 16, 9, p.woodMid, { rx: 3 }) + rect(x + 8, seat - 22, w - 16, 9, c.ref('round'), { rx: 3 });
  // the arms: a rest on a turned post at each end, from just past the seat's edge to `arm` over it
  for (const [left, right] of [[x - 8, x + arm], [x + w - arm, x + w + 8]] as const) {
    s += turned(c, (left + right) / 2 - 6, seat - 34, seat, 12) + rect(left, seat - 42, right - left, 9, p.woodMid, { rx: 4.5 }) + rect(left, seat - 42, right - left, 9, c.ref('round'), { rx: 4.5 });
  }
  // the legs with a stretcher between them
  for (const lx of [x + 6, x + w - 18]) s += turned(c, lx, seat + 12, foot, 12);
  s += rect(x + 18, foot - 30, w - 36, 6, p.woodDark, { rx: 3 });
  // the seat
  return s + rect(x - 8, seat, w + 16, 14, p.wood, { rx: 5 }) + rect(x - 8, seat, w + 16, 4, p.white, { opacity: 0.14, rx: 2 }) + rect(x - 8, seat, w + 16, 14, c.ref('grain'), { rx: 5 }) + rect(x - 8, seat + 10, w + 16, 4, p.black, { opacity: 0.2, rx: 2 });
}
