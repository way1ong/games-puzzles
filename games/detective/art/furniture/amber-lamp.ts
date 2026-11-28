// A lamp with a ribbed amber glass bell on a cord from the ceiling: off by day; lit low at night, if it is one of
// the lamps left on after closing.
import type { Ctx } from '../defs.ts';
import { ellipse, n, path, rect, stroke } from '../svg.ts';

/** `x` — the middle, `bottom` — where the glass ends. */
export function amberLamp(c: Ctx, x: number, bottom: number, lit: boolean): string {
  const { p } = c;
  const top = bottom - 38;
  const bell = `M${x - 30} ${bottom} C${x - 29} ${bottom - 22} ${x - 15} ${top} ${x} ${top} C${x + 15} ${top} ${x + 29} ${bottom - 22} ${x + 30} ${bottom}Z`;
  let s = '';
  if (lit) {
    s += ellipse(x, bottom + 40, 100, 120, c.ref('glow'), { opacity: 0.75 });
    s += path(`M${x - 26} ${bottom} L${x + 26} ${bottom} L${x + 120} ${bottom + 260} L${x - 120} ${bottom + 260}Z`, p.lamp, { opacity: 0.07, filter: c.ref('softer') });
  }
  s += rect(x - 1.2, 0, 2.4, top - 9, p.ironDark) + rect(x - 6, top - 12, 12, 12, p.brassDark, { rx: 2 }) + rect(x - 6, top - 12, 4, 12, p.white, { opacity: 0.2 });
  s += path(bell, p.amber) + path(bell, c.ref('round'));
  for (const dx of [-17, -7, 3, 13]) s += stroke(`M${n(x + dx * 0.4)} ${top + 3} Q${n(x + dx * 1.1)} ${bottom - 18} ${n(x + dx * 1.45)} ${bottom - 1}`, p.amberDark, 1.4, { opacity: 0.55 });
  if (lit) s += path(bell, p.lamp, { opacity: 0.45 }) + ellipse(x, bottom, 24, 4.5, p.lamp) + ellipse(x, bottom + 1, 9, 5, p.white, { opacity: 0.9 });
  else s += ellipse(x, bottom, 29, 4, p.amberDark) + ellipse(x, bottom + 1, 8, 4.5, p.lampInside, { opacity: 0.7 });
  return s + stroke(`M${x - 20} ${bottom - 6} Q${x - 18} ${top + 12} ${x - 6} ${top + 4}`, p.white, 2.4, { opacity: lit ? 0.35 : 0.5 });
}
