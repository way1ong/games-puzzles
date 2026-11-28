// A geranium in a clay pot: round leaves and two heads of red flowers.
import type { Ctx } from '../defs.ts';
import { circle, n, path, rect, stroke } from '../svg.ts';

/** `x` — the middle, `y` — the line the pot stands on. */
export function geranium(c: Ctx, x: number, y: number): string {
  const { p } = c;
  let s = path(`M${x - 15} ${y} l4 -24 l22 0 l4 24Z`, p.terracotta) + rect(x - 17, y - 28, 34, 6, p.terracottaLight, { rx: 3 }) + rect(x - 15, y - 22, 30, 22, c.ref('round'));
  // stems, then the leaves around the top of the pot
  s += stroke(`M${x - 2} ${y - 28} q-6 -16 -8 -30 M${x + 2} ${y - 28} q6 -14 8 -26`, p.greenDark, 2);
  for (const [dx, dy, r, fill] of [[-14, -32, 8, p.greenDark], [13, -33, 8, p.greenDark], [-6, -38, 9, p.green], [6, -37, 8.5, p.green], [0, -32, 7, p.greenLight]] as const) {
    s += circle(x + dx, y + dy, r, fill) + circle(x + dx, y + dy, n(r * 0.55), 'none', { stroke: p.greenDark, 'stroke-width': 1, opacity: 0.5 });
  }
  // two heads of small red flowers
  for (const [hx, hy] of [[-9, -58], [10, -54]] as const) {
    for (const [fx, fy] of [[0, 0], [-4, 3], [4, 3], [-3, -3], [3, -3], [0, 5]] as const) s += circle(x + hx + fx, y + hy + fy, 3.2, p.red);
    s += circle(x + hx - 1, y + hy - 1, 1.4, p.pink, { opacity: 0.8 });
  }
  return s;
}
