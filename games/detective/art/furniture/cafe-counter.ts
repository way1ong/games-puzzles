// The café counter: a front of upright boards, a marble top and a brass foot rail. It runs off the left edge of
// the picture; its right end shows its side.
import { floorShadow, type Ctx } from '../defs.ts';
import { circle, n, path, rect, stroke } from '../svg.ts';

export interface CafeCounter {
  /** Its right end, the line of its top, where it stands on the floor. */
  end: number;
  top: number;
  foot: number;
}

/** The marble top is this thick. */
const SLAB = 14;

export function cafeCounter(c: Ctx, m: CafeCounter): string {
  const { p } = c;
  const { end, top, foot } = m;
  const front = top + SLAB;
  let s = floorShadow(c, end / 2, foot + 8, end / 2 + 24, 12, 0.35);
  // the front: upright boards between a rail at the top and a plinth
  s += rect(0, front, end, foot - front, p.wood) + rect(0, front, end, foot - front, c.ref('grain'));
  for (let x = 14; x < end - 12; x += 26) s += rect(x, front + 14, 2.2, foot - front - 32, p.woodDark, { opacity: 0.7 }) + rect(x + 2.2, front + 14, 2, foot - front - 32, p.white, { opacity: 0.07 });
  s += rect(0, front, end, 14, p.woodDark) + rect(0, foot - 18, end, 18, p.woodDark) + rect(0, foot - 18, end, 3, p.white, { opacity: 0.08 });
  // the side of the right end, in the light
  s += rect(end - 12, front, 12, foot - front, p.woodMid) + rect(end - 12, front, 3, foot - front, p.white, { opacity: 0.12 });
  // the brass foot rail on three brackets
  const rail = foot - 44;
  for (const bx of [36, end / 2, end - 40]) s += path(`M${bx - 5} ${rail + 10} l10 0 l3 14 l-16 0Z`, p.brassDark) + rect(bx - 2, rail + 2, 4, 10, p.brassDark);
  s += rect(0, rail, end - 18, 7, p.brass, { rx: 3.5 }) + rect(0, rail, end - 18, 2.2, p.white, { opacity: 0.45 }) + circle(end - 18, rail + 3.5, 4.5, p.brassDark);
  // the marble top: veins, a lighter edge, the shadow it throws on the front
  s += rect(0, front, end, 7, p.black, { opacity: 0.25 });
  s += rect(-8, top, end + 16, SLAB, p.marble, { rx: 3 }) + rect(-8, top + SLAB - 4, end + 16, 4, p.marbleShade, { rx: 2 });
  for (const [x1, len] of [[30, 90], [170, 60], [290, 110]] as const) {
    if (x1 + len < end) s += stroke(`M${x1} ${top + 4} q${n(len / 3)} 6 ${len / 2} 2 t${len / 2} 3`, p.marbleVein, 1.2, { opacity: 0.8 });
  }
  return s + rect(-8, top, end + 16, 2.5, p.white, { opacity: 0.5, rx: 1.2 });
}
