// The window with the town behind it, the sill, the radiator below and the curtains. By day — clouds; at
// night — rain and a street lamp (no moon in the rain), lit windows in the town.
import type { Ctx } from '../defs.ts';
import { circle, ellipse, line, path, rect, stroke } from '../svg.ts';
import { plant } from './plant.ts';

export interface Window {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Where the plant stands on the sill. */
  plant: number;
  /** The rail of the wall panels: the curtains end a little above it, the radiator hangs below it. */
  rail: number;
}

export function windowWithCurtains(c: Ctx, m: Window): string {
  const { p, night } = c;
  const { x, y, w, h } = m;
  const sill = y + h;
  let s = rect(x - 6, y - 6, w + 12, h + 12, p.woodDark, { rx: 8 }) + rect(x, y, w, h, p.wood, { rx: 6 }) + rect(x + 14, y + 14, w - 28, h - 28, c.ref('sky'));
  if (!night) {
    s += ellipse(x + 80, y + 70, 40, 15, p.white) + ellipse(x + 108, y + 62, 28, 13, p.white) + ellipse(x + 180, y + 108, 32, 11, p.white, { opacity: 0.9 });
  }
  // the town: roofs, and windows that are lit at night
  const glassBottom = y + h - 14;
  s += path(
    `M${x + 14} ${y + 200} l28 -38 l28 38 l8 0 l0 -54 l40 0 l0 54 l18 0 l24 -30 l24 30 l20 0 l0 -68 l34 0 l0 68 L${x + w - 14} ${y + 200} L${x + w - 14} ${glassBottom} L${x + 14} ${glassBottom}Z`,
    p.town,
  );
  for (const [wx, wy] of [[86, 160], [98, 176], [196, 150], [206, 172], [196, 190]] as const) {
    s += rect(x + wx, y + wy, 6, 8, p.townWindow, { opacity: night ? 0.95 : 0.6 });
  }
  s += path(
    `M${x + 14} ${y + 226} l50 0 l0 -18 l30 0 l0 18 l56 0 l0 -14 l40 0 l0 14 L${x + w - 14} ${y + 226} L${x + w - 14} ${glassBottom} L${x + 14} ${glassBottom}Z`,
    p.townFar,
  );
  if (night) {
    // the street lamp: its light is the stripes on the floor
    s += ellipse(x + 64, y + 153, 36, 36, c.ref('glow')) + rect(x + 62.5, y + 156, 3, h - 170, p.streetLamp);
    s += path(`M${x + 56} ${y + 150} l16 0 l-3 -9 l-10 0Z`, p.streetLamp) + circle(x + 64, y + 153, 3.5, p.lamp);
    for (let i = 0; i < 26; i++) {
      const rx = x + 20 + ((i * 37) % 200);
      const ry = y + 20 + ((i * 53) % 190);
      s += line(rx, ry, rx - 6, ry + 14, p.rain, 1.2, { opacity: 0.55 });
    }
  }
  // frame bars, a shine on the glass, the sill
  s += rect(x + w / 2 - 5, y + 14, 10, h - 28, p.wood) + rect(x + 14, y + h / 2 - 5, w - 28, 10, p.wood);
  s += path(`M${x + 24} ${y + 24} l40 0 l-30 70 l-10 0Z`, p.white, { opacity: night ? 0.06 : 0.18 });
  s += rect(x - 22, sill, w + 44, 14, p.woodMid, { rx: 3 }) + rect(x - 22, sill + 10, w + 44, 5, p.black, { opacity: 0.25 });
  // the radiator under the sill
  s += rect(x + 22, m.rail + 12, w - 44, 70, p.radiator, { rx: 6 });
  for (let i = 0; i < 9; i++) s += rect(x + 30 + i * 21, m.rail + 18, 14, 58, p.radiatorRib, { rx: 5 });
  // curtains with brass ties
  const curtain = (cx: number, dir: number) => {
    const d = `M${cx - 34} 52 L${cx + 34} 52 Q${cx + 20 * dir + 10} 200 ${cx + 30} 214 Q${cx + 36 + dir * 6} 300 ${cx + 26} ${m.rail - 8} L${cx - 30} ${m.rail - 8} Q${cx - 38 - dir * 6} 300 ${cx - 28} 214 Q${cx - 18 * dir - 12} 200 ${cx - 34} 52Z`;
    return (
      path(d, p.green) +
      stroke(`M${cx - 10} 54 Q${cx - 4} 200 ${cx - 6} 214 Q${cx - 14} 300 ${cx - 12} ${m.rail - 10}`, p.greenDark, 8, { opacity: 0.7, 'stroke-linecap': 'butt' }) +
      stroke(`M${cx + 14} 54 Q${cx + 18} 200 ${cx + 12} 214 Q${cx + 18} 300 ${cx + 10} ${m.rail - 10}`, p.greenLight, 5, { opacity: 0.55, 'stroke-linecap': 'butt' }) +
      rect(cx - 34, 206, 68, 12, p.brass, { rx: 6 })
    );
  };
  s += curtain(x - 24, -1) + curtain(x + w + 24, 1);
  s += rect(x - 72, 44, w + 144, 9, p.woodDark, { rx: 4 }) + circle(x - 72, 48, 10, p.woodDark) + circle(x + w + 72, 48, 10, p.woodDark);
  return s + plant(c, m.plant, sill);
}
