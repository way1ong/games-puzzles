// A cat asleep: the grey one of the study, the ginger one of the bakery.
import { floorShadow, type Ctx } from '../defs.ts';
import { circle, ellipse, path, stroke } from '../svg.ts';

export function cat(c: Ctx, x: number, y: number, ginger = false): string {
  const p = ginger ? { ...c.p, fur: c.p.furGinger } : c.p;
  return (
    floorShadow(c, x, y + 16, 46, 8, 0.3) +
    ellipse(x, y, 46, 22, p.fur) +
    ellipse(x, y, 46, 22, c.ref('round')) +
    circle(x - 34, y - 6, 15, p.fur) +
    path(`M${x - 46} ${y - 16} l4 -14 l8 10Z`, p.fur) +
    path(`M${x - 30} ${y - 18} l6 -13 l6 12Z`, p.fur) +
    stroke(`M${x - 41} ${y - 6} q3 2 6 0`, p.ink, 1.6) +
    stroke(`M${x - 31} ${y - 6} q3 2 6 0`, p.ink, 1.6) +
    stroke(`M${x + 40} ${y + 6} q30 6 18 -14`, p.fur, 9) +
    stroke(`M${x - 10} ${y - 18} q10 -6 22 0`, p.black, 3, { 'stroke-opacity': 0.15, 'stroke-linecap': 'butt' })
  );
}
