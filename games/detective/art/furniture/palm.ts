// A palm in a wooden tub.
import { floorShadow, type Ctx } from '../defs.ts';
import { g, path, rect } from '../svg.ts';

/** `x` — the middle, `y` — the floor line the tub stands on. */
export function palm(c: Ctx, x: number, y: number): string {
  const { p } = c;
  // a frond: a long leaf bent to one side
  const frond = (turn: number, long: number, fill: string) =>
    g(`translate(${x} ${y - 52}) rotate(${turn})`, path(`M0 0 Q${long * 0.16} ${-long * 0.7} ${long * 0.5} ${-long} Q${-long * 0.04} ${-long * 0.74} -6 0Z`, fill));
  let s = floorShadow(c, x, y + 3, 36, 8, 0.3);
  s += frond(-58, 84, p.greenDark) + frond(26, 92, p.greenDark) + frond(-44, 118, p.green) + frond(8, 128, p.green) + frond(-30, 150, p.greenLight) + frond(-12, 164, p.green) + frond(-70, 62, p.green) + frond(40, 66, p.greenLight);
  const tub = `M${x - 30} ${y - 54} L${x + 30} ${y - 54} L${x + 24} ${y} L${x - 24} ${y}Z`;
  s += path(tub, p.wood) + path(tub, c.ref('round'));
  for (const dx of [-14, 0, 14]) s += rect(x + dx - 0.8, y - 53, 1.6, 52, p.woodDark, { opacity: 0.6 });
  return s + rect(x - 31, y - 44, 62, 5, p.brassDark, { rx: 2 }) + rect(x - 27, y - 14, 54, 5, p.brassDark, { rx: 2 }) + rect(x - 32, y - 58, 64, 6, p.woodDark, { rx: 3 });
}
