// A tall sash window: two sashes of four panes, a roller blind rolled up under the head, a deep sill. The street
// shows through the glass (the room draws it, clipped to `sashGlass`), so the frame is drawn around the glass.
import type { Ctx } from '../defs.ts';
import { ellipse, path, rect } from '../svg.ts';

export interface SashWindow {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** How wide the frame is round the glass. */
const FRAME = 12;

/** The glass of the window, as a path shape: the street is drawn inside it. */
export function sashGlass(m: SashWindow): string {
  return `M${m.x + FRAME} ${m.y + FRAME} h${m.w - 2 * FRAME} v${m.h - 2 * FRAME} h${-(m.w - 2 * FRAME)}Z`;
}

export function sashWindow(c: Ctx, m: SashWindow): string {
  const { p, night } = c;
  const { x, y, w, h } = m;
  const sill = y + h;
  const [gx, gy, gw, gh] = [x + FRAME, y + FRAME, w - 2 * FRAME, h - 2 * FRAME];
  // the architrave and the frame round the glass (and its shadow), all with the glass left open
  const glass = sashGlass(m);
  const around = (left: number, top: number, wide: number, tall: number) => `M${left} ${top} h${wide} v${tall} h${-wide}Z ${glass}`;
  let s = path(around(x - 6, y - 4, w + 20, h + 8), p.black, { opacity: 0.16, filter: c.ref('soft'), 'fill-rule': 'evenodd' });
  s += path(around(x - 10, y - 10, w + 20, h + 10), p.woodDark, { 'fill-rule': 'evenodd' }) + path(around(x, y, w, h), p.wood, { 'fill-rule': 'evenodd' });
  // the sashes: the meeting rail in the middle, a bar down and a bar across each
  const meet = y + h / 2;
  s += rect(gx, meet - 7, gw, 14, p.wood) + rect(gx, meet - 7, gw, 3, p.white, { opacity: 0.12 }) + rect(gx, meet + 5, gw, 3, p.black, { opacity: 0.15 });
  s += rect(x + w / 2 - 3, gy, 6, gh, p.wood);
  for (const by of [(gy + meet) / 2, (meet + gy + gh) / 2]) s += rect(gx, by - 2.5, gw, 5, p.wood);
  // the brass catch on the meeting rail, the lifts on the lower sash
  s += rect(x + w / 2 - 9, meet - 11, 18, 5, p.brass, { rx: 2 });
  for (const lx of [gx + 10, gx + gw - 18]) s += rect(lx, meet + 9, 8, 5, p.brassDark, { rx: 2 });
  // shines on the glass
  s += path(`M${gx + 6} ${gy + 6} l20 0 l-18 48 l-2 0Z`, p.white, { opacity: night ? 0.05 : 0.2 }) + path(`M${gx + 6} ${meet + 12} l14 0 l-14 34Z`, p.white, { opacity: night ? 0.04 : 0.14 });
  // the roller blind rolled up under the head
  s += rect(x - 4, y + 2, w + 8, 13, p.linen, { rx: 6.5 }) + rect(x - 4, y + 2, w + 8, 13, c.ref('round'), { rx: 6.5 }) + ellipse(x + w / 2, y + 18, 6, 3, p.linenEdge);
  // the sill
  return s + rect(x - 18, sill, w + 36, 14, p.woodMid, { rx: 3 }) + rect(x - 18, sill, w + 36, 3, p.white, { opacity: 0.12, rx: 1.5 }) + rect(x - 18, sill + 10, w + 36, 5, p.black, { opacity: 0.25 });
}
