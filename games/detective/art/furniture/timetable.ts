// The timetable board: a clock mark, and rows of times, places and platforms written in chalk. The last
// row — the last train — is underlined.
import type { Ctx } from '../defs.ts';
import { circle, line, rect } from '../svg.ts';

/** How long the place name of each row is, as a share of its column. */
const ROWS = [0.8, 0.55, 0.95, 0.65, 0.75, 0.5] as const;

export function timetable(c: Ctx, m: { x: number; y: number; w: number; h: number }): string {
  const { p } = c;
  const { x, y, w, h } = m;
  let s = rect(x - 4, y + 4, w + 12, h + 10, p.black, { opacity: 0.18, rx: 5, filter: c.ref('soft') });
  s += rect(x - 8, y - 8, w + 16, h + 16, p.woodDark, { rx: 5 }) + rect(x, y, w, h, p.boardBlack, { rx: 2 });
  // the head: a little clock and three column marks
  s += circle(x + 20, y + 18, 8, 'none', { stroke: p.chalk, 'stroke-width': 2 }) + line(x + 20, y + 18, x + 20, y + 13, p.chalk, 1.6) + line(x + 20, y + 18, x + 24, y + 19, p.chalk, 1.6);
  s += rect(x + 40, y + 15, 26, 5, p.chalk, { opacity: 0.8 }) + rect(x + 78, y + 15, 60, 5, p.chalk, { opacity: 0.8 }) + rect(x + w - 34, y + 15, 20, 5, p.chalk, { opacity: 0.8 });
  s += rect(x + 10, y + 32, w - 20, 1.6, p.chalk, { opacity: 0.5 });
  const step = (h - 46) / ROWS.length;
  ROWS.forEach((long, i) => {
    const ry = y + 44 + i * step;
    s += rect(x + 12, ry, 11, 7, p.chalk, { opacity: 0.85, rx: 1 }) + rect(x + 26, ry, 11, 7, p.chalk, { opacity: 0.85, rx: 1 });
    s += rect(x + 50, ry + 1, (w - 110) * long, 5, p.chalk, { opacity: 0.7, rx: 2 });
    s += rect(x + w - 32, ry - 2, 16, 11, 'none', { stroke: p.chalk, 'stroke-width': 1.6, rx: 2, opacity: 0.8 });
    if (i === ROWS.length - 1) s += rect(x + 10, ry + 12, w - 20, 2.4, p.yellow, { opacity: 0.9 });
  });
  return s;
}
