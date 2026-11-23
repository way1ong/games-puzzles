// A pigeon walking about the hall.
import { floorShadow, type Ctx } from '../defs.ts';
import { circle, ellipse, line, path } from '../svg.ts';

/** `x` — the middle, `y` — the floor it stands on. */
export function pigeon(c: Ctx, x: number, y: number): string {
  const { p } = c;
  return (
    floorShadow(c, x, y + 2, 22, 4, 0.3) +
    line(x - 3, y - 8, x - 4, y, p.eraser, 2) +
    line(x + 5, y - 8, x + 6, y, p.eraser, 2) +
    path(`M${x - 14} ${y - 16} l-16 -3 l4 9Z`, p.pigeonDark) +
    ellipse(x, y - 16, 17, 10, p.pigeon) +
    ellipse(x, y - 16, 17, 10, c.ref('round')) +
    path(`M${x - 12} ${y - 17} q10 -9 22 -2 q-8 10 -22 2Z`, p.pigeonDark) +
    ellipse(x + 13, y - 22, 6, 7, p.pigeonNeck) +
    circle(x + 16, y - 28, 6.5, p.pigeon) +
    path(`M${x + 22} ${y - 29} l6 2 l-6 2Z`, p.pencil) +
    circle(x + 18, y - 29, 1.4, p.ink)
  );
}
