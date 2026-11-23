// A wastebasket with crumpled paper.
import { floorShadow, type Ctx } from '../defs.ts';
import { circle, path, rect } from '../svg.ts';

/** `x` — the middle, `y` — the floor line it stands on. */
export function wastebasket(c: Ctx, x: number, y: number): string {
  const { p } = c;
  const body = `M${x - 26} ${y - 60} l52 0 l-6 60 l-40 0Z`;
  return (
    floorShadow(c, x, y + 2, 30, 6) +
    path(body, p.basket) +
    path(body, c.ref('round')) +
    rect(x - 28, y - 64, 56, 6, p.basketRim, { rx: 2 }) +
    circle(x - 10, y - 68, 10, p.paper) +
    circle(x + 8, y - 66, 9, p.paperShade) +
    circle(x - 1, y - 74, 7, p.paper)
  );
}
