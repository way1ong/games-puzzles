// The blackboard on the wall: today's bread drawn in chalk — a pretzel, a loaf, wavy lines for the prices.
import type { Ctx } from '../defs.ts';
import { rect, stroke } from '../svg.ts';
import { pretzel } from './shop-door.ts';

export function blackboard(c: Ctx, m: { x: number; y: number; w: number; h: number }): string {
  const { p } = c;
  const { x, y, w, h } = m;
  let s = rect(x - 3, y + 3, w + 10, h + 8, p.black, { opacity: 0.18, rx: 4, filter: c.ref('soft') });
  s += rect(x - 7, y - 7, w + 14, h + 14, p.woodMid, { rx: 4 }) + rect(x, y, w, h, p.slate);
  s += pretzel(x + 34, y + 34, p.chalk, 3);
  // a loaf with three cuts
  s += stroke(`M${x + 70} ${y + 46} q-4 -26 26 -26 q30 0 26 26Z`, p.chalk, 2.6) + stroke(`M${x + 84} ${y + 28} l5 9 M${x + 96} ${y + 25} l5 10 M${x + 108} ${y + 28} l5 9`, p.chalk, 2);
  // prices: lines of handwriting and a tick
  for (const [dy, len] of [[66, 0.62], [82, 0.5], [98, 0.7]] as const) {
    s += stroke(`M${x + 16} ${y + dy} q6 -5 12 0 t12 0 t12 0 t12 0`, p.chalk, 2, { opacity: 0.8 }) + stroke(`M${x + w * 0.56} ${y + dy} l${w * len * 0.5} 0`, p.chalk, 2, { opacity: 0.55, 'stroke-dasharray': '7 5' });
  }
  // the ledge with a piece of chalk
  return s + rect(x - 9, y + h + 5, w + 18, 6, p.woodDark, { rx: 2 }) + rect(x + w - 34, y + h + 1, 16, 4, p.chalk, { rx: 1.5 });
}
