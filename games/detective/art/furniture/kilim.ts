// A flat-woven rug: borders, a row of stepped diamonds in the middle, a fringe at both short ends.
import { floorShadow, type Ctx } from '../defs.ts';
import { n, path, rect } from '../svg.ts';

/** The right half of a stepped diamond, from its top to its bottom, as shares of its half width and half height. */
const HALF = [[0, -1], [0.25, -1], [0.25, -0.75], [0.5, -0.75], [0.5, -0.5], [1, 0], [0.5, 0.5], [0.5, 0.75], [0.25, 0.75], [0.25, 1], [0, 1]] as const;

/** A stepped diamond: `x`, `y` — its middle, `rx`, `ry` — half its width and height. */
function diamond(x: number, y: number, rx: number, ry: number): string {
  const right = HALF.map(([dx, dy]) => `${n(x + dx * rx)} ${n(y + dy * ry)}`);
  const left = HALF.slice(1, -1)
    .reverse()
    .map(([dx, dy]) => `${n(x - dx * rx)} ${n(y + dy * ry)}`);
  return `M${[...right, ...left].join(' L')}Z`;
}

export function kilim(c: Ctx, m: { x: number; y: number; w: number; h: number }): string {
  const { p } = c;
  const { x, y, w, h } = m;
  let fringe = '';
  for (let fy = y + 5; fy < y + h - 2; fy += 6) fringe += `M${x - 8} ${fy}h7M${x + w + 1} ${fy}h7`;
  let s = floorShadow(c, x + w / 2, y + h / 2 + 5, w / 2 + 6, h / 2, 0.25) + path(fringe, 'none', { stroke: p.kilimCream, 'stroke-width': 2.2, 'stroke-linecap': 'round' });
  s += rect(x, y, w, h, p.kilim, { rx: 2 }) + rect(x, y + 7, w, 3, p.kilimCream) + rect(x, y + h - 10, w, 3, p.kilimCream);
  // a dark field with a row of diamonds, and small triangles along its edges
  const fy = y + 16;
  const fh = h - 32;
  s += rect(x + 12, fy, w - 24, fh, p.kilimDark);
  const count = Math.max(2, Math.round((w - 24) / 80));
  const step = (w - 24) / count;
  const mid = y + h / 2;
  for (let i = 0; i < count; i++) {
    const cx = x + 12 + step * (i + 0.5);
    const rx = step * 0.42;
    const ry = fh * 0.4;
    s += path(diamond(cx, mid, rx, ry), p.kilim) + path(diamond(cx, mid, rx * 0.62, ry * 0.62), p.kilimCream) + path(diamond(cx, mid, rx * 0.3, ry * 0.3), p.kilimBlue);
  }
  let teeth = '';
  for (let tx = x + 14; tx < x + w - 24; tx += 14) teeth += `M${tx} ${fy}l6 6l6 -6ZM${tx} ${fy + fh}l6 -6l6 6Z`;
  return s + path(teeth, p.kilimCream, { opacity: 0.8 });
}
