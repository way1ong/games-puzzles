// A lamp with a milk-glass globe on a rod from the ceiling: off by day, lit at night.
import type { Ctx } from '../defs.ts';
import { circle, ellipse, rect } from '../svg.ts';

/** `x` — the middle, `bottom` — where the globe ends. */
export function globeLamp(c: Ctx, x: number, bottom: number): string {
  const { p, night } = c;
  const cy = bottom - 28;
  let s = '';
  if (night) s += ellipse(x, cy + 30, 150, 170, c.ref('glow'));
  s += rect(x - 2, 0, 4, cy - 30, p.brassDark) + rect(x - 11, cy - 36, 22, 10, p.brassDark, { rx: 3 });
  s += circle(x, cy, 28, p.milkGlass) + circle(x, cy, 28, c.ref('round'));
  if (night) s += circle(x, cy, 20, p.lamp, { opacity: 0.5, filter: c.ref('soft') });
  return s + circle(x - 9, cy - 10, 6, p.white, { opacity: night ? 0.5 : 0.7 });
}
