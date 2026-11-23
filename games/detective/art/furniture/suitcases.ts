// Two leather suitcases just alike, lying on the floor side by side. Only a paper tag on the handle of
// the second tells them apart.
import { floorShadow, type Ctx } from '../defs.ts';
import { path, rect, stroke } from '../svg.ts';

export interface Suitcases {
  /** The middle of each. */
  xs: readonly number[];
  /** The floor line they lie on. */
  y: number;
  w: number;
  h: number;
}

function suitcase(c: Ctx, x: number, y: number, w: number, h: number, tagged: boolean): string {
  const { p } = c;
  const left = x - w / 2;
  let s = floorShadow(c, x, y + 3, w / 2 + 6, 6, 0.3) + rect(left, y - h, w, h, p.suitcase, { rx: 6 }) + rect(left, y - h, w, h, c.ref('round'), { rx: 6 });
  // the seam of the lid, leather corners, two straps with buckles
  s += rect(left, y - h + 10, w, 2.4, p.suitcaseDark);
  for (const [cx, cy] of [[left, y - h], [left + w - 12, y - h], [left, y - 12], [left + w - 12, y - 12]] as const) s += rect(cx, cy, 12, 12, p.suitcaseDark, { rx: 5 });
  for (const dx of [-w * 0.26, w * 0.26]) s += rect(x + dx - 4, y - h, 8, h, p.leather) + rect(x + dx - 5, y - h + 15, 10, 7, p.brass, { rx: 1.5 });
  // the handle hangs on the front; the tag is tied to it
  s += stroke(`M${x - 11} ${y - h + 19} q11 12 22 0`, p.leather, 4) + rect(x - 14, y - h + 16, 6, 5, p.brassDark, { rx: 1 }) + rect(x + 8, y - h + 16, 6, 5, p.brassDark, { rx: 1 });
  if (tagged) s += stroke(`M${x + 4} ${y - h + 24} l5 6`, p.ink, 1.2) + path(`M${x + 6} ${y - h + 29} l11 0 l4 5 l-4 5 l-11 0Z`, p.paper, { stroke: p.linenEdge, 'stroke-width': 1 });
  return s;
}

export function suitcases(c: Ctx, m: Suitcases): string {
  return m.xs.map((x, i) => suitcase(c, x, m.y, m.w, m.h, i > 0)).join('');
}
