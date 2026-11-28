// An old brass till on the counter: rows of round keys on a slope, a little window on top with its tabs (no
// numbers), the drawer below.
import type { Ctx } from '../defs.ts';
import { circle, path, rect } from '../svg.ts';

/** `x` — the middle, `y` — the counter it stands on. */
export function till(c: Ctx, x: number, y: number): string {
  const { p } = c;
  let s = rect(x - 30, y - 56, 66, 54, p.black, { opacity: 0.16, rx: 6, filter: c.ref('soft') });
  // the drawer with its knob
  s += rect(x - 32, y - 16, 64, 16, p.woodDark, { rx: 2 }) + rect(x - 32, y - 16, 64, 3, p.white, { opacity: 0.12 }) + circle(x, y - 8, 3, p.brass);
  // the body and the slope with the keys
  const body = `M${x - 29} ${y - 16} L${x - 25} ${y - 46} L${x + 25} ${y - 46} L${x + 29} ${y - 16}Z`;
  s += path(body, p.brass) + path(body, c.ref('round'));
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 5; col++) s += circle(x - 18 + col * 9, y - 23 - row * 8, 3, p.ivory, { stroke: p.brassDark, 'stroke-width': 1 });
  }
  // the top with its window and three tabs
  s += rect(x - 21, y - 60, 42, 15, p.brassDark, { rx: 4 }) + rect(x - 15, y - 57, 30, 9, p.paper, { rx: 1.5 });
  for (const tx of [x - 10, x - 2, x + 6]) s += rect(tx, y - 55, 4, 5, p.ink, { rx: 1, opacity: 0.75 });
  // the crank on the left side
  return s + rect(x - 34, y - 34, 6, 4, p.brassDark, { rx: 1 }) + rect(x - 37, y - 44, 3, 14, p.brassDark, { rx: 1.5 }) + circle(x - 35.5, y - 45, 2.6, p.woodDark);
}
