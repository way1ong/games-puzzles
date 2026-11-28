// A bentwood café chair facing the room: a round cane seat in a wooden ring, the back a tall loop of bent wood
// with a smaller loop inside, splayed legs held by a ring.
import { floorShadow, type Ctx } from '../defs.ts';
import { ellipse, rect, stroke } from '../svg.ts';

export interface BistroChair {
  x: number;
  /** The line things rest on: the middle of the round seat. */
  seat: number;
  half: number;
  /** Where its legs stand on the floor. */
  foot: number;
  /** How high the back rises over the seat. */
  back: number;
}

/** A bent rod: a darker edge with a lighter middle. */
const bent = (c: Ctx, d: string, width: number): string => stroke(d, c.p.beechDark, width) + stroke(d, c.p.beech, width - 2.6);

export function bistroChair(c: Ctx, m: BistroChair): string {
  const { p } = c;
  const { x, seat, half, foot } = m;
  const top = seat - m.back;
  const ry = Math.round(half * 0.22);
  const hw = Math.round(half * 0.72);
  const iw = Math.round(hw * 0.55);
  let s = floorShadow(c, x, foot + 4, half + 8, 9, 0.3);
  // the back legs (seen between the front ones), rising into the big loop of the back; the small loop inside
  s += bent(c, `M${x - hw + 6} ${foot - 10} L${x - hw} ${seat} L${x - hw} ${top + hw} A${hw} ${hw} 0 0 1 ${x + hw} ${top + hw} L${x + hw} ${seat} L${x + hw - 6} ${foot - 10}`, 7);
  s += bent(c, `M${x - iw} ${seat - ry} L${x - iw} ${top + 26 + iw} A${iw} ${iw} 0 0 1 ${x + iw} ${top + 26 + iw} L${x + iw} ${seat - ry}`, 5);
  // the front legs, splayed, and the ring between the legs
  s += bent(c, `M${x - half + 10} ${seat + 6} L${x - half + 3} ${foot}`, 7) + bent(c, `M${x + half - 10} ${seat + 6} L${x + half - 3} ${foot}`, 7);
  const ringY = seat + Math.round((foot - seat) * 0.58);
  s += ellipse(x, ringY, half - 6, ry - 2, 'none', { stroke: p.beechDark, 'stroke-width': 4 });
  // the seat: a wooden ring round a cane middle, seen a little from above
  s += ellipse(x, seat + 5, half, ry, p.beechDark) + ellipse(x, seat, half, ry, p.beech) + ellipse(x, seat, half - 6, ry - 3, p.cane);
  for (const dx of [-0.5, -0.25, 0, 0.25, 0.5]) s += stroke(`M${x + dx * half - 6} ${seat - ry + 4} l12 ${2 * ry - 8}`, p.caneDark, 1, { opacity: 0.6 });
  return s + rect(x - half * 0.5, seat - ry + 2, half * 0.6, 2, p.white, { opacity: 0.3, rx: 1 });
}
