// A lamp with an enamel shade hanging from the ceiling: off by day, lit at night.
import type { Ctx } from '../defs.ts';
import { ellipse, path, rect } from '../svg.ts';

/** `x` — the middle, `bottom` — where the shade ends. */
export function pendantLamp(c: Ctx, x: number, bottom: number): string {
  const { p, night } = c;
  const shade = `M${x - 40} ${bottom} Q${x - 34} ${bottom - 32} ${x - 9} ${bottom - 38} L${x + 9} ${bottom - 38} Q${x + 34} ${bottom - 32} ${x + 40} ${bottom}Z`;
  let s = '';
  if (night) {
    s += ellipse(x, bottom + 60, 120, 150, c.ref('glow'));
    s += path(`M${x - 34} ${bottom} L${x + 34} ${bottom} L${x + 150} ${bottom + 300} L${x - 150} ${bottom + 300}Z`, p.lamp, { opacity: 0.1, filter: c.ref('softer') });
  }
  s += rect(x - 1.5, 0, 3, bottom - 44, p.ironDark) + rect(x - 6, bottom - 48, 12, 11, p.brassDark, { rx: 2 });
  s += path(shade, p.enamelGreen) + path(shade, c.ref('round')) + ellipse(x, bottom, 40, 5, p.lampInside) + ellipse(x, bottom + 2, 9, 6, p.lamp, { opacity: night ? 1 : 0.55 });
  return s;
}
