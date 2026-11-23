// A wooden chair seen from behind, pulled back from the desk.
import { floorShadow, type Ctx } from '../defs.ts';
import { rect } from '../svg.ts';

export function chair(c: Ctx, m: { x: number; seat: number; half: number; foot: number }): string {
  const { p } = c;
  const { x, seat, half } = m;
  return (
    floorShadow(c, x, m.foot + 4, half + 8, 10) +
    rect(x - half + 12, seat - 63, 8, 175, p.woodDark) +
    rect(x + half - 20, seat - 63, 8, 175, p.woodDark) +
    rect(x - half + 6, seat - 98, 2 * half - 12, 40, p.woodMid, { rx: 9 }) +
    rect(x - half + 6, seat - 98, 2 * half - 12, 40, c.ref('round'), { rx: 9 }) +
    rect(x - half, seat, 2 * half, 18, p.wood, { rx: 5 }) +
    rect(x - half + 6, seat + 18, 8, m.foot - seat - 18, p.woodDark) +
    rect(x + half - 14, seat + 18, 8, m.foot - seat - 18, p.woodDark)
  );
}
