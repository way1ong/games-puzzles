// The street outside the post office, drawn once and seen through every glass of the door and the window (the
// room clips it to them), so they all show the same street. By day: a blue sky with clouds, the houses across the
// street in the sun, a tower far off, the street lamp unlit. At night: fog — the houses fade into it, lit windows
// glow dim, the street lamps shine with wide halos; no moon and no stars through the fog.
import type { Ctx } from '../defs.ts';
import { circle, ellipse, g, path, rect, rects, stroke } from '../svg.ts';

export interface StreetView {
  /** The part of the wall the openings are in. */
  x1: number;
  x2: number;
  top: number;
  bottom: number;
  /** The far side of the street: the line the houses stand on. */
  horizon: number;
  /** The street lamp on this side of the street (its lantern) and a farther one across it. */
  lamp: { x: number; y: number };
  farLamp: { x: number; y: number };
}

/** The houses across the street: left edge and width (from `x1`), the height of the eaves and of the roof over them. */
const HOUSES = [
  [0, 84, 136, 44],
  [84, 66, 150, 0],
  [150, 110, 124, 50],
  [260, 76, 144, 0],
  [336, 96, 132, 46],
  [432, 70, 152, 0],
  [502, 70, 124, 36],
] as const;

/** Clouds by day, as [x from `x1`, y from `top`, size]. */
const CLOUDS = [[60, 30, 1], [420, 44, 1.2], [520, 20, 0.8], [250, 64, 0.9]] as const;

/** A street lamp: a lantern on a post; lit at night, with a halo in the fog. */
function streetLamp(c: Ctx, x: number, y: number, k: number, base: number): string {
  const { p, night } = c;
  let s = '';
  if (night) {
    // the halo the fog makes round the lantern, and the light falling through the fog below it
    s += ellipse(x, y + 8 * k, 120 * k, 120 * k, p.lamp, { opacity: 0.2, filter: c.ref('softer') }) + ellipse(x, y + 4 * k, 70 * k, 70 * k, c.ref('glow'));
    s += path(`M${x - 8 * k} ${y + 12 * k} L${x + 8 * k} ${y + 12 * k} L${x + 46 * k} ${base} L${x - 46 * k} ${base}Z`, p.lamp, { opacity: 0.1, filter: c.ref('soft') });
  }
  s += rect(x - 2 * k, y + 14 * k, 4 * k, base - y - 14 * k, p.streetLamp) + rect(x - 5 * k, y + 13 * k, 10 * k, 4 * k, p.streetLamp);
  s += path(`M${x - 9 * k} ${y - 12 * k} l${18 * k} 0 l${-3 * k} ${25 * k} l${-12 * k} 0Z`, night ? p.lamp : p.townFar);
  s += stroke(`M${x - 9 * k} ${y - 12 * k} l${3 * k} ${25 * k} M${x + 9 * k} ${y - 12 * k} l${-3 * k} ${25 * k}`, p.streetLamp, 1.6 * k);
  s += path(`M${x - 12 * k} ${y - 12 * k} l${24 * k} 0 l${-12 * k} ${-9 * k}Z`, p.streetLamp) + circle(x, y - 22 * k, 2 * k, p.streetLamp);
  if (night) s += circle(x, y, 5 * k, p.white, { opacity: 0.9, filter: c.ref('soft') });
  return s;
}

/** The street's light on the floor at night: the fog spreads it, so it falls soft, without the shapes of the panes. */
export function fogLight(c: Ctx, floor: number, left: number, right: number, bottom: number): string {
  return path(`M${left} ${floor} L${right} ${floor} L${right + 90} ${bottom} L${left - 70} ${bottom}Z`, c.p.floorLight, { opacity: 0.09, filter: c.ref('softer') });
}

export function streetView(c: Ctx, v: StreetView): string {
  const { p, night } = c;
  const { x1, horizon } = v;
  let s = rect(v.x1, v.top, v.x2 - v.x1, v.bottom - v.top, c.ref('sky'));
  if (!night) {
    for (const [cx, cy, k] of CLOUDS) {
      s += g(`translate(${x1 + cx} ${v.top + cy}) scale(${k})`, ellipse(0, 0, 34, 11, p.white) + ellipse(22, -6, 22, 11, p.white) + ellipse(-18, -3, 16, 8, p.white, { opacity: 0.9 }));
    }
    s += stroke(`M${x1 + 380} ${v.top + 96} q5 -5 9 0 q4 -5 9 0 M${x1 + 404} ${v.top + 82} q4 -4 7 0 q3 -4 7 0`, p.townFar, 1.6);
  }
  // a tower far off, behind the houses
  const tx = x1 + 408;
  s += rect(tx - 11, horizon - 160, 22, 160, p.townFar) + path(`M${tx - 14} ${horizon - 160} l14 -38 l14 38Z`, p.townFar) + circle(tx, horizon - 138, 6, p.townWindow, { opacity: night ? 0.35 : 0.5 });
  if (night) s += rect(v.x1, horizon - 240, v.x2 - v.x1, 240, p.fog, { opacity: 0.22 });
  // the houses: walls, roofs (gables or a flat edge), rows of windows — some lit at night
  const walls: [number, number, number, number][] = [];
  const edges: [number, number, number, number][] = [];
  const dark: [number, number, number, number][] = [];
  const lit: [number, number, number, number][] = [];
  let gables = '';
  HOUSES.forEach(([hx, hw, eaves, roof], i) => {
    const left = x1 + hx;
    walls.push([left, horizon - eaves, hw, eaves]);
    if (roof) gables += `M${left - 4} ${horizon - eaves}L${left + hw / 2} ${horizon - eaves - roof}L${left + hw + 4} ${horizon - eaves}Z`;
    else edges.push([left - 3, horizon - eaves - 6, hw + 6, 6]);
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const box: [number, number, number, number] = [left + 12 + col * ((hw - 32) / 2), horizon - eaves + 18 + row * 38, 8, 14];
        (night && (i * 7 + row * 3 + col * 5) % 4 === 0 ? lit : dark).push(box);
      }
    }
  });
  s += rects(walls, p.town) + path(gables, p.terracotta, { opacity: night ? 0.5 : 0.85 }) + rects(edges, p.townFar);
  s += rects(dark, p.townFar, { opacity: night ? 0.5 : 0.55 }) + (lit.length ? rects(lit, p.townWindow, { opacity: 0.75, filter: c.ref('soft') }) : '');
  // the pavement over there and the kerb
  s += rect(v.x1, horizon, v.x2 - v.x1, v.bottom - horizon, p.slab) + rect(v.x1, horizon, v.x2 - v.x1, 3, p.townFar, { opacity: 0.6 });
  s += streetLamp(c, v.farLamp.x, v.farLamp.y, 0.6, horizon + 6) + streetLamp(c, v.lamp.x, v.lamp.y, 1, v.bottom);
  if (night) {
    // banks of fog drifting along the street
    for (const [y, h, o] of [[horizon - 150, 70, 0.22], [horizon - 60, 60, 0.3], [horizon + 10, 50, 0.34]] as const) {
      s += rect(v.x1, y, v.x2 - v.x1, h, p.fog, { opacity: o, filter: c.ref('softer') });
    }
  }
  return s;
}
