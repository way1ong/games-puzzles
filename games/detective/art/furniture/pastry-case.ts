// The glass case of cakes on the counter, with a wooden top things can stand on. By day: a layer cake with a
// slice cut out, a fruit tart, slices on little plates. At night the cakes are put away: only the paper doilies
// are left on the shelves.
import type { Ctx } from '../defs.ts';
import { circle, ellipse, path, rect, stroke } from '../svg.ts';

export interface PastryCase {
  x: number;
  w: number;
  top: number;
}

/** A paper doily on a shelf: `x` — its middle, `y` — the shelf. */
function doily(c: Ctx, x: number, y: number, rx: number): string {
  const { p } = c;
  return ellipse(x, y - 1.5, rx, 2.6, p.paper) + ellipse(x, y - 1.5, rx, 2.6, 'none', { stroke: p.paperShade, 'stroke-width': 1.2, 'stroke-dasharray': '2 2' });
}

/** A round layer cake with a slice cut out, on a doily. */
function layerCake(c: Ctx, x: number, y: number): string {
  const { p } = c;
  let s = doily(c, x, y, 24) + rect(x - 19, y - 22, 38, 20, p.sponge, { rx: 3 }) + rect(x - 19, y - 22, 38, 20, c.ref('round'), { rx: 3 });
  s += rect(x - 19, y - 14, 38, 2.6, p.cakeCream) + rect(x - 19, y - 8, 38, 2.6, p.cakeCream);
  // the cut: a darker notch on the right shows the layers inside
  s += path(`M${x + 6} ${y - 22} L${x + 19} ${y - 22} L${x + 19} ${y - 2} L${x + 6} ${y - 2}Z`, p.chocolate, { opacity: 0.25 });
  s += ellipse(x - 6, y - 22, 13, 3, p.cakeCream);
  return s + [-14, -6, 2].map((dx) => circle(x + dx, y - 25, 2.6, p.berry)).join('');
}

/** A low fruit tart. */
function tart(c: Ctx, x: number, y: number): string {
  const { p } = c;
  let s = doily(c, x, y, 17) + path(`M${x - 14} ${y - 2} l2 -8 l24 0 l2 8Z`, p.crust) + ellipse(x, y - 10, 12, 2.6, p.crustLight);
  for (const [dx, fill] of [[-8, p.berry], [-3, p.orange], [2, p.berry], [7, p.orange]] as const) s += circle(x + dx, y - 11, 2.6, fill);
  return s;
}

/** A slice of cake on a little plate: chocolate or pale. */
function slice(c: Ctx, x: number, y: number, dark: boolean): string {
  const { p } = c;
  const body = dark ? p.chocolate : p.sponge;
  return (
    ellipse(x, y - 2, 13, 2.6, p.china) +
    path(`M${x - 10} ${y - 4} L${x + 10} ${y - 4} L${x + 10} ${y - 18} L${x - 10} ${y - 9}Z`, body) +
    stroke(`M${x - 10} ${y - 7} L${x + 10} ${y - 12}`, p.cakeCream, 1.8) +
    circle(x + 6, y - 20, 2.2, p.berry)
  );
}

/** `bottom` — the counter the case stands on. */
export function pastryCase(c: Ctx, m: PastryCase, bottom: number): string {
  const { p, night } = c;
  const { x, w, top } = m;
  const floor = bottom - 9;
  const mid = Math.round((top + 7 + floor) / 2) + 2;
  let s = rect(x - 3, top + 4, w + 10, bottom - top, p.black, { opacity: 0.16, rx: 4, filter: c.ref('soft') });
  s += rect(x, top + 6, w, floor - top - 6, p.cream) + rect(x, bottom - 9, w, 9, p.woodDark, { rx: 2 });
  // the glass shelf in the middle
  s += rect(x + 4, mid, w - 8, 3, p.glass, { opacity: 0.9 }) + rect(x + 4, mid + 3, w - 8, 1.5, p.glassEdge, { opacity: 0.6 });
  if (night) {
    s += doily(c, x + w * 0.3, mid, 22) + doily(c, x + w * 0.74, mid, 16);
    for (const k of [0.2, 0.5, 0.8]) s += doily(c, x + w * k, floor, 12);
  } else {
    s += layerCake(c, x + w * 0.3, mid) + tart(c, x + w * 0.74, mid);
    s += slice(c, x + w * 0.2, floor, true) + slice(c, x + w * 0.5, floor, false) + slice(c, x + w * 0.8, floor, true);
  }
  // the glass and its streaks of light, the corner posts, the wooden top
  s += rect(x, top + 6, w, floor - top - 6, p.glass, { opacity: 0.25 });
  s += path(`M${x + 12} ${top + 8} l12 0 l-18 ${floor - top - 10} l-8 0Z`, p.white, { opacity: night ? 0.07 : 0.25 }) + path(`M${x + 34} ${top + 8} l5 0 l-18 ${floor - top - 10} l-4 0Z`, p.white, { opacity: night ? 0.05 : 0.18 });
  s += rect(x, top + 4, 4, floor - top - 4, p.woodDark) + rect(x + w - 4, top + 4, 4, floor - top - 4, p.woodDark);
  return s + rect(x - 3, top, w + 6, 7, p.woodDark, { rx: 2.5 }) + rect(x - 3, top, w + 6, 2.4, p.white, { opacity: 0.16, rx: 1.2 });
}
