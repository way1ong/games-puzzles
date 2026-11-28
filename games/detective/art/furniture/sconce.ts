// A lamp on the wall: a brass plate, a curved arm and a small pleated shade. Off by day; lit low at night.
import type { Ctx } from '../defs.ts';
import { ellipse, path, rect, stroke } from '../svg.ts';

/** `x` — the middle, `y` — where the arm meets the wall. */
export function sconce(c: Ctx, x: number, y: number, lit: boolean): string {
  const { p } = c;
  const top = y - 58;
  const bottom = y - 26;
  const shade = `M${x - 18} ${bottom} L${x - 10} ${top} L${x + 10} ${top} L${x + 18} ${bottom}Z`;
  let s = '';
  if (lit) s += ellipse(x, y - 30, 70, 80, c.ref('glow'), { opacity: 0.85 }) + ellipse(x, bottom + 26, 26, 22, p.lamp, { opacity: 0.18, filter: c.ref('soft') });
  s += ellipse(x, y + 2, 7, 11, p.brassDark) + ellipse(x - 1.5, y - 1, 2.6, 5, p.white, { opacity: 0.3 });
  s += stroke(`M${x} ${y} q-14 -4 -8 -16 q4 -6 8 -4`, p.brassDark, 3.6) + rect(x - 5, bottom - 2, 10, 6, p.brass, { rx: 2 });
  s += path(shade, p.shadeCloth) + path(shade, c.ref('round'));
  for (const dx of [-12, -6, 0, 6, 12]) s += stroke(`M${x + dx * 0.55} ${top + 2} L${x + dx} ${bottom - 1}`, p.black, 1, { opacity: 0.12 });
  s += rect(x - 18, bottom - 2, 36, 3, p.brassDark, { rx: 1.5 }) + rect(x - 10, top - 1, 20, 2.6, p.brassDark, { rx: 1.2 });
  if (lit) s += path(shade, p.lamp, { opacity: 0.35 }) + ellipse(x, bottom + 1, 15, 3, p.lamp);
  return s;
}
