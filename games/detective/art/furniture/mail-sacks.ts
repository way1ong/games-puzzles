// Two canvas mail sacks on the floor: one standing, tied at the neck with a cord and a lead seal on a tag, the
// other lying on its side against it, its gathered neck tied too. A blue band runs round each.
import { floorShadow, type Ctx } from '../defs.ts';
import { circle, path, rect, stroke } from '../svg.ts';

/** `x` — the middle of the standing sack, `y` — the floor line they stand on. */
export function mailSacks(c: Ctx, x: number, y: number): string {
  const { p } = c;
  const standing = `M${x - 34} ${y} C${x - 48} ${y - 34} ${x - 40} ${y - 72} ${x - 16} ${y - 90} L${x + 16} ${y - 90} C${x + 40} ${y - 72} ${x + 46} ${y - 34} ${x + 36} ${y}Z`;
  // lying: the round bottom against the standing sack, the body, the shoulder narrowing to the neck on the right
  const lying = `M${x + 24} ${y + 3} C${x + 14} ${y - 26} ${x + 32} ${y - 50} ${x + 70} ${y - 50} C${x + 104} ${y - 50} ${x + 126} ${y - 40} ${x + 140} ${y - 26} L${x + 150} ${y - 21} L${x + 150} ${y - 7} L${x + 140} ${y - 2} C${x + 122} ${y + 4} ${x + 70} ${y + 6} ${x + 24} ${y + 3}Z`;
  let s = floorShadow(c, x + 60, y + 4, 120, 10, 0.32);
  // the lying one first: it leans on the standing one
  s += path(lying, p.canvasShade) + path(lying, c.ref('round'));
  s += stroke(`M${x + 88} ${y - 48} q-8 24 -2 52`, p.postBlue, 7, { 'stroke-linecap': 'butt', opacity: 0.85 });
  s += stroke(`M${x + 126} ${y - 34} q8 12 4 30 M${x + 46} ${y - 40} q16 6 30 4`, p.black, 1.4, { opacity: 0.14 });
  // its neck: the cloth fans out past the cord
  s += path(`M${x + 152} ${y - 20} l10 -12 l1 8 l9 -4 l-4 9 l10 2 l-9 5 l7 7 l-10 0 l2 8 l-10 -7Z`, p.canvasShade) + path(`M${x + 152} ${y - 20} l10 -12 l1 8 l9 -4 l-4 9 l10 2 l-9 5 l7 7 l-10 0 l2 8 l-10 -7Z`, p.black, { opacity: 0.08 });
  s += rect(x + 146, y - 24, 7, 21, p.leather, { rx: 3 });
  // the standing one: its belly with the band, the gathered neck, the cord, the seal on its tag
  s += path(standing, p.canvas) + path(standing, c.ref('round'));
  s += stroke(`M${x - 42} ${y - 40} q42 10 84 0`, p.postBlue, 9, { 'stroke-linecap': 'butt', opacity: 0.85 });
  s += stroke(`M${x - 30} ${y - 12} q8 -20 2 -42 M${x + 18} ${y - 4} q6 -18 0 -34`, p.black, 1.4, { opacity: 0.12 });
  s += path(`M${x - 16} ${y - 90} l-10 -14 l12 4 l6 -8 l8 8 l8 -8 l6 8 l12 -4 l-10 14Z`, p.canvasShade);
  s += rect(x - 18, y - 94, 36, 6, p.leather, { rx: 3 }) + stroke(`M${x + 12} ${y - 90} q6 14 2 26`, p.leather, 1.6);
  s += circle(x + 14, y - 62, 5, p.steel) + circle(x + 13, y - 63, 1.6, p.white, { opacity: 0.4 });
  return s + path(`M${x + 2} ${y - 58} l18 -3 l3 16 l-18 3Z`, p.feather, { stroke: p.linenEdge, 'stroke-width': 1 });
}
