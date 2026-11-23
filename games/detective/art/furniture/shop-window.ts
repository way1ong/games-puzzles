// The shop window with the street behind it and a striped valance along the top. Morning: a low sun and
// clouds. Night: a clear sky with the moon and stars, a street lamp, lit windows across the street.
import type { Ctx } from '../defs.ts';
import { circle, ellipse, path, rect } from '../svg.ts';

export interface ShopWindow {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Where the stars are, as shares of the pane. */
const STARS = [[0.08, 0.3], [0.2, 0.18], [0.31, 0.34], [0.44, 0.2], [0.55, 0.36], [0.63, 0.16], [0.9, 0.4], [0.37, 0.48], [0.14, 0.5]] as const;

export function shopWindow(c: Ctx, m: ShopWindow): string {
  const { p, night } = c;
  const { x, y, w, h } = m;
  const sill = y + h;
  const gx = x + 12;
  const gy = y + 12;
  const gw = w - 24;
  const gh = h - 24;
  let s = rect(x - 8, y - 8, w + 16, h + 16, p.woodDark, { rx: 8 }) + rect(x, y, w, h, p.wood, { rx: 6 }) + rect(gx, gy, gw, gh, c.ref('sky'));
  if (night) {
    for (const [sx, sy] of STARS) s += circle(gx + gw * sx, gy + gh * sy, 1.6, p.white, { opacity: 0.85 });
    // a crescent: the moon with a piece of the sky over it
    s += circle(gx + gw - 62, gy + 62, 17, p.moon) + circle(gx + gw - 54, gy + 56, 15, p.skyTop);
  } else {
    s += circle(gx + gw - 62, gy + 84, 46, p.sun, { opacity: 0.35, filter: c.ref('soft') }) + circle(gx + gw - 62, gy + 84, 24, p.sun);
    s += ellipse(gx + 70, gy + 78, 40, 13, p.white) + ellipse(gx + 98, gy + 70, 26, 12, p.white) + ellipse(gx + 150, gy + 112, 30, 10, p.white, { opacity: 0.9 });
  }
  // the houses across the street
  const base = gy + gh;
  s += path(
    `M${gx} ${base - 62} l34 -34 l34 34 l10 0 l0 -52 l46 0 l0 52 l16 0 l28 -30 l28 30 l12 0 l0 -44 l34 0 L${gx + gw} ${base - 62} L${gx + gw} ${base} L${gx} ${base}Z`,
    p.town,
  );
  for (const [wx, wy] of [[22, 44], [44, 44], [90, 92], [106, 92], [90, 70], [150, 40], [206, 84]] as const) {
    s += rect(gx + wx, base - wy, 7, 9, p.townWindow, { opacity: night ? 0.95 : 0.6 });
  }
  s += rect(gx, base - 26, gw, 26, p.townFar);
  if (night) {
    // the street lamp: its light is the stripes on the floor
    s += ellipse(gx + 46, base - 96, 38, 38, c.ref('glow')) + rect(gx + 44.5, base - 94, 3, 94, p.streetLamp);
    s += path(`M${gx + 38} ${base - 96} l16 0 l-3 -9 l-10 0Z`, p.streetLamp) + circle(gx + 46, base - 94, 3.5, p.lamp);
  }
  // the valance: stripes with round ends
  const count = 10;
  const sw = gw / count;
  for (let i = 0; i < count; i++) {
    const fill = i % 2 ? p.awningPale : p.awning;
    s += rect(gx + i * sw, gy, sw, 20, fill) + ellipse(gx + (i + 0.5) * sw, gy + 20, sw / 2, 9, fill);
  }
  s += rect(gx, gy, gw, 4, p.black, { opacity: 0.18 });
  // a shine on the glass, the sill
  s += path(`M${gx + 14} ${gy + 44} l44 0 l-36 88 l-8 0Z`, p.white, { opacity: night ? 0.05 : 0.16 });
  return s + rect(x - 18, sill, w + 36, 14, p.woodMid, { rx: 3 }) + rect(x - 18, sill + 10, w + 36, 5, p.black, { opacity: 0.25 });
}
