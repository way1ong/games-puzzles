// A small round café table: a marble top seen a little from above, on a cast-iron column with three curved feet.
// What stands on it: a cup of coffee or a slice of cake by day; a little vase with a flower when the tables are
// cleared for the night.
import { TABLE_SPREAD } from '../../core/rooms/cafe.ts';
import { floorShadow, type Ctx } from '../defs.ts';
import { ellipse, g, line, n, path, rect, stroke } from '../svg.ts';
import { budVase } from './bud-vase.ts';

export interface BistroTable {
  x: number;
  /** The line things stand on: the middle of the round top. */
  top: number;
  half: number;
  /** Where its feet stand on the floor. */
  foot: number;
  deco: number;
}

export type TableDeco = 'cup' | 'cake' | 'vase';

/** The height of the eye: the lower a round top stands in the picture, the more of it is seen from above. */
const EYE = 430;

/** A cup of coffee on its saucer; `x` — the middle, `y` — the line it stands on. */
function coffeeCup(c: Ctx, x: number, y: number): string {
  const { p, night } = c;
  return g(
    `translate(${x} ${y})`,
    ellipse(0, -2, 13, 3, p.china) +
      ellipse(0, -1.2, 13, 2.2, p.black, { opacity: 0.1 }) +
      path('M-9 -18 L9 -18 L7 -6 Q0 -2 -7 -6Z', p.china) +
      path('M-9 -18 L9 -18 L7 -6 Q0 -2 -7 -6Z', c.ref('round')) +
      stroke('M8 -15 q7 0 6 5 q-1 4 -7 3', p.china, 2.2) +
      ellipse(0, -18, 8.6, 2.2, p.coffee) +
      ellipse(-1, -18.3, 5, 1.2, p.crema, { opacity: 0.9 }) +
      (night ? '' : stroke('M-2 -23 q-5 -7 0 -12 q5 -6 0 -11', p.white, 1.8, { opacity: 0.7 })),
  );
}

/** A slice of cake on a plate, with a little fork. */
function cakePlate(c: Ctx, x: number, y: number): string {
  const { p } = c;
  return g(
    `translate(${x} ${y})`,
    ellipse(0, -2, 15, 3.2, p.china) +
      ellipse(0, -1.2, 15, 2.4, p.black, { opacity: 0.1 }) +
      path('M-10 -4 L10 -4 L10 -19 L-10 -10Z', p.chocolate) +
      stroke('M-10 -8 L10 -14', p.cakeCream, 2) +
      ellipse(5, -21, 2.6, 2.6, p.berry) +
      line(9, -4, 16, -10, p.steel, 1.6),
  );
}

export function bistroTable(c: Ctx, m: BistroTable, deco: TableDeco): string {
  const { p } = c;
  const { x, top, half, foot } = m;
  const ry = Math.round(half * Math.min(0.26, Math.max(0.14, (top - EYE) / 560)));
  const spread = Math.round(half * TABLE_SPREAD);
  const knee = foot - 26;
  let s = floorShadow(c, x, foot + 4, spread + 12, 8, 0.3);
  // three feet: two to the sides, one towards the viewer
  s += stroke(`M${x} ${knee} q${-spread * 0.35} 4 ${-spread} 26`, p.ironDark, 5) + stroke(`M${x} ${knee} q${spread * 0.35} 4 ${spread} 26`, p.ironDark, 5);
  s += stroke(`M${x} ${knee} l0 ${foot - knee + 4}`, p.iron, 5) + ellipse(x - spread, foot, 5, 2.4, p.ironDark) + ellipse(x + spread, foot, 5, 2.4, p.ironDark) + ellipse(x, foot + 4, 5, 2.4, p.ironDark);
  // the column with a collar, the bracket under the top
  s += rect(x - 4, top + ry, 8, knee - top - ry + 2, p.iron) + rect(x - 4, top + ry, 2.6, knee - top - ry, p.white, { opacity: 0.14 });
  s += rect(x - 7, (top + knee) / 2, 14, 6, p.ironDark, { rx: 2 }) + path(`M${x - 18} ${top + ry + 2} L${x + 18} ${top + ry + 2} L${x + 5} ${top + ry + 14} L${x - 5} ${top + ry + 14}Z`, p.ironDark);
  // the marble top: its edge, its face with a vein or two, a brass rim
  s += ellipse(x, top + 5, half, ry, p.marbleShade) + ellipse(x, top + 5, half, ry, p.black, { opacity: 0.08 });
  s += ellipse(x, top, half, ry, p.marble);
  s += stroke(`M${n(x - half * 0.6)} ${top - 2} q${n(half * 0.3)} 4 ${n(half * 0.6)} 1 t${n(half * 0.5)} 2`, p.marbleVein, 1.1, { opacity: 0.8 });
  s += ellipse(x, top, half, ry, 'none', { stroke: p.brassDark, 'stroke-width': 1.4 }) + ellipse(n(x - half * 0.3), n(top - ry * 0.4), n(half * 0.4), n(ry * 0.3), p.white, { opacity: 0.35 });
  if (deco === 'cup') s += coffeeCup(c, m.deco, top);
  if (deco === 'cake') s += cakePlate(c, m.deco, top);
  if (deco === 'vase') s += budVase(c, m.deco, top, 1);
  return s;
}
