// A small round café table on one leg, with a blue cup of coffee on it.
import { floorShadow, type Ctx } from '../defs.ts';
import { ellipse, g, rect, stroke } from '../svg.ts';

export interface CafeTable {
  x: number;
  top: number;
  half: number;
  /** Where the foot stands on the floor. */
  foot: number;
  /** Where the cup stands. */
  cup: number;
}

export function cafeTable(c: Ctx, m: CafeTable): string {
  const { p, night } = c;
  const { x, top, half } = m;
  return (
    floorShadow(c, x, m.foot + 6, 44, 8, 0.3) +
    ellipse(x, m.foot, 34, 8, p.ironDark) +
    ellipse(x, m.foot - 3, 26, 5, p.iron) +
    rect(x - 5, top + 12, 10, m.foot - top - 14, p.iron) +
    rect(x - 5, top + 12, 3, m.foot - top - 14, p.white, { opacity: 0.12 }) +
    rect(x - half + 10, top + 9, 2 * half - 20, 7, p.woodDark, { rx: 3 }) +
    rect(x - half, top, 2 * half, 10, p.woodMid, { rx: 5 }) +
    rect(x - half, top, 2 * half, 3.5, p.white, { opacity: 0.14, rx: 2 }) +
    // the cup on its saucer; the coffee is still warm
    g(
      `translate(${m.cup} ${top})`,
      ellipse(0, -2, 16, 3.2, p.blueDark) +
        rect(-9, -19, 18, 17, p.blueLight, { rx: 4 }) +
        rect(-9, -19, 18, 17, c.ref('round'), { rx: 4 }) +
        stroke('M9 -15 q8 0 8 5 q0 5 -8 5', p.blueLight, 2.6) +
        ellipse(0, -18.5, 8.5, 2.4, p.china) +
        ellipse(0, -18.3, 6.5, 1.6, p.woodDark) +
        stroke('M-2 -23 q-5 -7 0 -12 q5 -6 0 -11', p.white, 2, { opacity: night ? 0.4 : 0.75 }),
    )
  );
}
