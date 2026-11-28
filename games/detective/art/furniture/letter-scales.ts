// Brass letter scales on the counter: a pendulum with its weight, a pointer over a curved scale, a tray on top.
// By day a letter lies on the tray, being weighed.
import type { Ctx } from '../defs.ts';
import { circle, line, n, path, rect } from '../svg.ts';

/** `x` — the middle, `y` — the counter they stand on; about 56 wide and 66 tall. */
export function letterScales(c: Ctx, x: number, y: number, withLetter: boolean): string {
  const { p } = c;
  let s = rect(x - 26, y - 7, 52, 7, p.woodDark, { rx: 3 }) + rect(x - 26, y - 7, 52, 2, p.white, { opacity: 0.12, rx: 1 });
  // the pillar and the curved scale with its marks
  s += rect(x - 3, y - 50, 6, 44, p.brassDark) + path(`M${x - 8} ${y - 7} l3 -8 l10 0 l3 8Z`, p.brass);
  s += path(`M${x + 2} ${y - 46} A30 30 0 0 1 ${x + 24} ${y - 14} L${x + 18} ${y - 14} A24 24 0 0 0 ${x + 2} ${y - 40}Z`, p.feather, { stroke: p.brassDark, 'stroke-width': 1.4 });
  for (let i = 0; i <= 5; i++) {
    const a = ((-80 + i * 14) * Math.PI) / 180;
    s += line(n(x + 2 + Math.cos(a) * 25), n(y - 16 + Math.sin(a) * 25), n(x + 2 + Math.cos(a) * 29), n(y - 16 + Math.sin(a) * 29), p.ink, 1);
  }
  // the pendulum arm with its round weight, the pointer, the pivot
  s += line(x, y - 50, x - 14, y - 26, p.brassDark, 3) + circle(x - 15, y - 24, 7, p.brass) + circle(x - 17, y - 26, 2, p.white, { opacity: 0.4 });
  s += line(x, y - 50, x + 19, y - 33, p.ink, 1.6) + circle(x, y - 50, 3.4, p.brassDark);
  // the tray on its stem
  s += rect(x - 1.5, y - 60, 3, 10, p.brassDark) + rect(x - 22, y - 63, 44, 4, p.brass, { rx: 2 });
  if (withLetter) s += path(`M${x - 18} ${y - 63} l2 -4 l34 0 l-2 4Z`, p.feather, { stroke: p.linenEdge, 'stroke-width': 0.8 }) + rect(x + 6, y - 67, 6, 3, p.red);
  return s;
}
