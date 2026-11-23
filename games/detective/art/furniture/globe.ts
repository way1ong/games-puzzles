// A desk globe: the sphere on a stand, the brass ring from the stand to the top pole.
import type { Ctx } from '../defs.ts';
import { circle, path, rect, stroke } from '../svg.ts';

/** `x` — the middle, `bottom` — the line it stands on. */
export function globe(c: Ctx, x: number, bottom: number): string {
  const { p } = c;
  return (
    rect(x - 22, bottom - 8, 44, 8, p.woodDark, { rx: 3 }) +
    rect(x - 3, bottom - 22, 6, 16, p.woodDark) +
    circle(x, bottom - 52, 30, p.sea) +
    path(`M${x - 22} ${bottom - 62} q12 -14 24 -4 q8 10 -4 16 q-10 4 -12 14 q-8 -6 -8 -26Z`, p.land) +
    path(`M${x + 6} ${bottom - 44} q14 -6 18 6 q-6 12 -16 8Z`, p.land) +
    circle(x, bottom - 52, 30, c.ref('round')) +
    stroke(`M${x} ${bottom - 18} a34 34 0 0 1 0 -68`, p.brass, 4, { 'stroke-linecap': 'butt' }) +
    circle(x, bottom - 86, 3, p.brass)
  );
}
