// A cake stand with nothing but crumbs and a cake server on it: the pie is gone.
import type { Ctx } from '../defs.ts';
import { circle, ellipse, path, rect } from '../svg.ts';

/** `x` — the middle, `y` — the line it stands on. */
export function cakeStand(c: Ctx, x: number, y: number): string {
  const { p } = c;
  let s = ellipse(x, y - 3, 17, 4, p.china) + path(`M${x - 5} ${y - 4} q3 -10 0 -19 l10 0 q-3 9 0 19Z`, p.china) + ellipse(x, y - 25, 34, 6.5, p.china) + ellipse(x, y - 26.5, 30, 4.4, p.paper);
  s += ellipse(x, y - 24, 34, 6.5, c.ref('round'));
  for (const [dx, dy, r] of [[-18, -27, 2], [-9, -28.5, 1.5], [-2, -26, 2.2], [6, -28, 1.4], [-13, -25, 1.3]] as const) s += circle(x + dx, y + dy, r, p.crust);
  // the server: a flat blade and a handle
  return s + path(`M${x + 2} ${y - 28} l16 -3 l8 3 l-8 2Z`, p.steel) + rect(x + 24, y - 29.5, 10, 3, p.woodDark, { rx: 1.5 });
}
