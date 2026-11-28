// The menu on a slate, drawn in chalk without words: a cup of coffee, rows of handwriting with dots to the
// prices, a slice of cake. It hangs on a cord from a nail.
import type { Ctx } from '../defs.ts';
import { circle, path, rect, stroke } from '../svg.ts';

/** The "words" of each row: how many waves of handwriting each has. */
const ROWS = [[4, 2], [3, 2], [3, 3]] as const;

/** A word of handwriting: waves of chalk from its left end. */
const word = (x: number, y: number, waves: number): string => `M${x} ${y} q3 -5 6 0` + ' t6 0'.repeat(waves * 2 - 1);

export function menuBoard(c: Ctx, m: { x: number; y: number; w: number; h: number }): string {
  const { p } = c;
  const { x, y, w, h } = m;
  const chalk = (d: string, width = 2.2, opacity = 0.9) => stroke(d, p.chalk, width, { opacity });
  // the cord over a nail, the shadow, the frame and the slate
  let s = stroke(`M${x + 36} ${y - 4} L${x + w / 2} ${y - 16} L${x + w - 36} ${y - 4}`, p.ink, 1.6, { opacity: 0.8 }) + circle(x + w / 2, y - 16, 3, p.brassDark);
  s += rect(x - 3, y + 4, w + 10, h + 10, p.black, { opacity: 0.18, rx: 4, filter: c.ref('soft') });
  s += rect(x - 7, y - 7, w + 14, h + 14, p.woodMid, { rx: 4 }) + rect(x - 7, y - 7, w + 14, 3, p.white, { opacity: 0.15, rx: 2 }) + rect(x, y, w, h, p.slate);
  // a cup of coffee on its saucer, steam over it
  const cx = x + 36;
  const cy = y + h / 2 + 14;
  s += chalk(`M${cx - 18} ${cy + 4} q18 6 36 0`) + chalk(`M${cx - 12} ${cy - 18} l3 18 q9 4 18 0 l3 -18Z`) + chalk(`M${cx + 12} ${cy - 13} q9 -1 8 6 q-1 5 -9 4`, 2);
  s += chalk(`M${cx - 4} ${cy - 24} q-5 -6 0 -11 q5 -5 0 -11`, 1.8, 0.7) + chalk(`M${cx + 5} ${cy - 24} q-5 -6 0 -11`, 1.8, 0.7);
  // rows of handwriting, dots to the price, the price
  const left = x + 70;
  const right = x + w - 72;
  ROWS.forEach(([first, second], i) => {
    const ry = y + 22 + i * 22;
    const end = left + (first + second) * 12 + 8;
    s += chalk(word(left, ry, first) + word(left + first * 12 + 8, ry, second), 2, 0.85);
    s += stroke(`M${end + 8} ${ry + 2} L${right} ${ry + 2}`, p.chalk, 1.6, { opacity: 0.5, 'stroke-dasharray': '1.5 5' });
    s += chalk(word(right + 4, ry, 1), 1.8, 0.85);
  });
  // a slice of cake with a cherry on top, in the right corner
  const kx = x + w - 28;
  const ky = y + h - 14;
  s += chalk(`M${kx - 16} ${ky} L${kx + 14} ${ky} L${kx + 14} ${ky - 18} L${kx - 16} ${ky - 6}Z`, 2) + chalk(`M${kx - 16} ${ky - 2} L${kx + 14} ${ky - 9}`, 1.4, 0.7);
  s += circle(kx + 8, ky - 22, 3.2, 'none', { stroke: p.chalk, 'stroke-width': 1.8, opacity: 0.9 });
  // a stroke under the first row, as if underlined
  return s + path(`M${left} ${y + 30} l${(right - left) * 0.42} -1 l0 1.6 l${-(right - left) * 0.42} 1Z`, p.chalk, { opacity: 0.45 });
}
