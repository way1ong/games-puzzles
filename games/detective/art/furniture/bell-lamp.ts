// A lamp hanging from the ceiling on a brass rod: an opal glass shade like a bell with a wavy rim. Off by day; at
// night one may be left on, low.
import type { Ctx } from '../defs.ts';
import { ellipse, path, rect } from '../svg.ts';

/** `x` — the middle, `bottom` — where the shade ends; `lit` — burning, low. */
export function bellLamp(c: Ctx, x: number, bottom: number, lit: boolean): string {
  const { p } = c;
  const shade = `M${x - 11} ${bottom - 40} Q${x - 14} ${bottom - 14} ${x - 34} ${bottom - 3} q5 5 11 1 q6 4 12 0 q6 4 11 0 q6 4 12 0 q6 4 11 0 q6 4 11 -1 Q${x + 14} ${bottom - 14} ${x + 11} ${bottom - 40}Z`;
  let s = '';
  if (lit) {
    s += ellipse(x, bottom + 40, 110, 120, c.ref('glow'), { opacity: 0.75 });
    s += path(`M${x - 28} ${bottom} L${x + 28} ${bottom} L${x + 110} ${bottom + 230} L${x - 110} ${bottom + 230}Z`, p.lamp, { opacity: 0.07, filter: c.ref('softer') });
  }
  s += rect(x - 1.5, 0, 3, bottom - 50, p.brassDark) + rect(x - 8, bottom - 52, 16, 6, p.brassDark, { rx: 2 }) + rect(x - 12, bottom - 46, 24, 7, p.brass, { rx: 3 });
  s += path(shade, lit ? p.milkGlass : p.opal) + path(shade, c.ref('round'));
  for (const dx of [-12, 0, 12]) s += path(`M${x + dx * 0.4} ${bottom - 38} Q${x + dx * 0.9} ${bottom - 16} ${x + dx * 1.9} ${bottom - 4}`, 'none', { stroke: p.black, 'stroke-opacity': 0.08, 'stroke-width': 1.5 });
  // the bulb under the rim: warm when burning, pale glass when not
  s += ellipse(x, bottom - 1, 8, 4, lit ? p.lamp : p.ivory, { opacity: lit ? 1 : 0.8 });
  return s + ellipse(x - 6, bottom - 30, 2.6, 6, p.white, { opacity: lit ? 0.4 : c.night ? 0.15 : 0.6 });
}
