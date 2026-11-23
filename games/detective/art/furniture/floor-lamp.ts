// A floor lamp: off by day, lit with a soft glow at night.
import { floorShadow, type Ctx } from '../defs.ts';
import { ellipse, path, rect } from '../svg.ts';

export function floorLamp(c: Ctx, x: number, bottom: number): string {
  const { p } = c;
  let s = floorShadow(c, x, bottom + 3, 34, 8) + ellipse(x, bottom - 2, 26, 6, p.woodDark) + rect(x - 3, 250, 6, bottom - 253, p.brassDark);
  s += path(`M${x - 36} 252 l12 -50 l48 0 l12 50Z`, p.shadeCloth) + rect(x - 36, 248, 72, 6, p.brassDark, { rx: 3 });
  if (c.night) s += ellipse(x, 300, 90, 120, c.ref('glow'));
  return s;
}
