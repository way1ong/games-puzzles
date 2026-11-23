// A plant in a clay pot.
import type { Ctx } from '../defs.ts';
import { ellipse, g, line, path, rect } from '../svg.ts';

/** `x` — the middle, `y` — the line the pot stands on. */
export function plant(c: Ctx, x: number, y: number): string {
  const { p } = c;
  let s = path(`M${x - 17} ${y} l5 -28 l24 0 l5 28Z`, p.terracotta) + rect(x - 19, y - 32, 38, 7, p.terracottaLight, { rx: 3 }) + rect(x - 17, y - 26, 34, 26, c.ref('round'));
  const leaf = (dx: number, dy: number, turn: number, fill: string) =>
    g(`translate(${x + dx} ${y - 32 + dy}) rotate(${turn})`, ellipse(0, -15, 7.5, 17, fill) + line(0, -2, 0, -28, p.black, 1, { opacity: 0.15 }));
  s += leaf(-11, 2, -38, p.greenDark) + leaf(11, 2, 38, p.greenDark) + leaf(-5, -4, -14, p.green) + leaf(6, -3, 20, p.green) + leaf(0, -2, 0, p.greenLight);
  return s;
}
