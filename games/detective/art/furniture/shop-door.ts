// The shop door: a painted door with a glass pane, the bakery's sign (a pretzel) hanging in it and a bell
// over it. At night it stands ajar: the leaf is seen at an angle, and the dark street shows beside it.
import type { Ctx } from '../defs.ts';
import { circle, g, line, path, rect, stroke } from '../svg.ts';

export interface ShopDoor {
  x: number;
  w: number;
  top: number;
  /** The floor line the door stands on. */
  bottom: number;
}

/** A pretzel drawn with one line, about 36 wide; `x`, `y` — its middle. */
export function pretzel(x: number, y: number, colour: string, width: number): string {
  return g(
    `translate(${x} ${y})`,
    stroke('M-13 9 C-22 -4 -12 -15 0 -6 C12 -15 22 -4 13 9', colour, width) + stroke('M-13 9 L5 -5', colour, width) + stroke('M13 9 L-5 -5', colour, width),
  );
}

export function shopDoor(c: Ctx, m: ShopDoor, ajar: boolean): string {
  const { p } = c;
  const { x, w, top, bottom } = m;
  const tall = bottom - top;
  // the frame; behind the door — the street
  let s = rect(x - 9, top - 9, w + 18, tall + 9, p.woodDark, { rx: 5 }) + rect(x, top, w, tall, c.ref('sky')) + rect(x, bottom - 84, w, 84, p.townFar);
  const lw = ajar ? Math.round(w * 0.78) : w;
  s += rect(x, top, lw, tall, p.doorPaint) + rect(x, top, lw, tall, c.ref('spine'));
  // the pane with a far roof line, glazing bars and the sign on its cord
  const gx = x + 16;
  const gy = top + 18;
  const gw = lw - 32;
  const gh = 204;
  s += rect(gx - 4, gy - 4, gw + 8, gh + 8, p.doorPaintDark, { rx: 4 }) + rect(gx, gy, gw, gh, c.ref('sky'));
  s += path(`M${gx} ${gy + gh - 46} l${gw * 0.3} -26 l${gw * 0.22} 26 l${gw * 0.12} 0 l0 -34 l${gw * 0.36} 0 L${gx + gw} ${gy + gh} L${gx} ${gy + gh}Z`, p.town);
  s += rect(gx + gw / 2 - 2.5, gy, 5, gh, p.doorPaintDark) + rect(gx, gy + gh * 0.62, gw, 5, p.doorPaintDark);
  s += path(`M${gx + 6} ${gy + 6} l${gw * 0.3} 0 l${-gw * 0.24} ${gh * 0.3} l${-gw * 0.06} 0Z`, p.white, { opacity: c.night ? 0.06 : 0.2 });
  const sx = gx + gw / 2;
  s += line(sx, gy + 4, sx - 20, gy + 40, p.ink, 1.4) + line(sx, gy + 4, sx + 20, gy + 40, p.ink, 1.4) + circle(sx, gy + 4, 3, p.brass);
  s += rect(sx - 30, gy + 40, 60, 38, p.paper, { rx: 5, stroke: p.woodMid, 'stroke-width': 2.5 }) + pretzel(sx, gy + 59, p.crustDark, 3.4);
  // the panel below, the handle, the threshold
  s += rect(x + 16, top + 244, lw - 32, tall - 244 - 26, p.doorPaintLight, { rx: 4, opacity: 0.35, stroke: p.doorPaintDark, 'stroke-width': 3 });
  s += rect(x + lw - 23, top + 232, 9, 44, p.brassDark, { rx: 4 }) + circle(x + lw - 18.5, top + 254, 7.5, p.brass) + circle(x + lw - 20.5, top + 252, 2.4, p.white, { opacity: 0.5 });
  if (ajar) {
    // the edge of the open leaf, and the light of the street lamp falling in
    s += rect(x + lw, top, 6, tall, p.doorPaintDark);
    s += path(`M${x + lw + 6} ${bottom} L${x + w} ${bottom} L${x + w + 70} ${bottom + 150} L${x + lw - 30} ${bottom + 150}Z`, p.floorLight, { opacity: 0.12, filter: c.ref('soft') });
  }
  // the shop bell on its spring over the door
  const bx = x + w - 20;
  s += stroke(`M${bx + 26} ${top - 9} q-4 -22 -26 -18`, p.ironDark, 2.6) + path(`M${bx - 9} ${top - 12} q0 -15 9 -15 q9 0 9 15Z`, p.brass) + rect(bx - 11, top - 13, 22, 3.4, p.brassDark, { rx: 1.7 }) + circle(bx, top - 8, 2.6, p.brassDark);
  return s + rect(x - 9, bottom - 3, w + 18, 6, p.woodMid, { rx: 2 });
}
