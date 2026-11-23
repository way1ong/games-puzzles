// Two sacks of flour: one standing, one lying before it, and flour dust on the floor.
import { floorShadow, type Ctx } from '../defs.ts';
import { ellipse, path, stroke } from '../svg.ts';

/** `x` — the middle, `y` — the floor line they stand on. */
export function flourSacks(c: Ctx, x: number, y: number): string {
  const { p } = c;
  const standing = `M${x - 14} ${y} C${x - 26} ${y - 30} ${x - 22} ${y - 66} ${x - 12} ${y - 80} L${x + 30} ${y - 80} C${x + 42} ${y - 66} ${x + 46} ${y - 30} ${x + 36} ${y}Z`;
  const lying = `M${x - 46} ${y + 2} C${x - 50} ${y - 28} ${x - 32} ${y - 40} ${x - 10} ${y - 38} C${x + 12} ${y - 40} ${x + 22} ${y - 24} ${x + 18} ${y + 2}Z`;
  return (
    floorShadow(c, x, y + 4, 54, 9, 0.3) +
    ellipse(x - 2, y + 4, 62, 8, p.flour, { opacity: 0.45 }) +
    path(standing, p.sack) +
    path(standing, c.ref('round')) +
    // the tied neck with two ears
    path(`M${x - 12} ${y - 80} l-8 -12 l14 4 l16 -6 l16 6 l12 -4 l-8 12Z`, p.sackShade) +
    stroke(`M${x - 10} ${y - 80} l38 0`, p.sackStripe, 3) +
    stroke(`M${x - 18} ${y - 52} q28 6 58 0`, p.sackStripe, 4, { 'stroke-linecap': 'butt' }) +
    stroke(`M${x - 19} ${y - 42} q29 6 60 0`, p.sackStripe, 1.6, { 'stroke-linecap': 'butt' }) +
    path(lying, p.sackShade) +
    path(lying, c.ref('round')) +
    stroke(`M${x - 40} ${y - 20} q26 -12 54 -2`, p.sackStripe, 3, { 'stroke-linecap': 'butt' }) +
    stroke(`M${x - 44} ${y - 4} l6 -8 M${x + 12} ${y - 2} l-5 -9`, p.black, 1.6, { opacity: 0.25 })
  );
}
