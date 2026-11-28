// The café's dog asleep on its round cushion, curled up with its head on its paws. At night the dog has gone home
// and the cushion keeps the dent where it lay.
import { floorShadow, type Ctx } from '../defs.ts';
import { circle, ellipse, path, stroke } from '../svg.ts';

/** `x` — the middle of the cushion, `y` — where it lies on the floor; `asleep` — the dog is on it. */
export function dogOnCushion(c: Ctx, x: number, y: number, asleep: boolean): string {
  const { p } = c;
  let s = floorShadow(c, x, y + 8, 92, 12, 0.3);
  // the cushion: plump, with stitched piping and a dent in the middle
  s += ellipse(x, y + 2, 84, 20, p.cushionDark) + ellipse(x, y - 4, 82, 18, p.cushion) + ellipse(x, y - 4, 82, 18, c.ref('round'));
  s += ellipse(x, y - 4, 76, 15, 'none', { stroke: p.cushionDark, 'stroke-width': 1.6, 'stroke-dasharray': '4 3', opacity: 0.8 }) + ellipse(x + 4, y - 5, 54, 9, p.cushionDark, { opacity: 0.35 });
  if (!asleep) return s;
  // the body, the haunch with a back paw tucked under it
  const body = `M${x - 34} ${y - 8} C${x - 40} ${y - 30} ${x - 20} ${y - 46} ${x + 14} ${y - 46} C${x + 50} ${y - 46} ${x + 70} ${y - 36} ${x + 68} ${y - 18} C${x + 66} ${y - 6} ${x + 50} ${y - 4} ${x + 30} ${y - 4} L${x - 20} ${y - 4}Z`;
  s += path(body, p.dogFur) + path(body, c.ref('round'));
  s += stroke(`M${x + 24} ${y - 36} C${x + 44} ${y - 40} ${x + 58} ${y - 30} ${x + 56} ${y - 14}`, p.dogFurDark, 2.2, { opacity: 0.45 });
  s += ellipse(x + 30, y - 7, 13, 5, p.dogFurLight);
  // the tail along the front, its pale tip by the paws
  s += stroke(`M${x + 64} ${y - 12} C${x + 56} ${y + 2} ${x + 20} ${y + 2} ${x - 2} ${y - 4}`, p.dogFur, 8) + circle(x - 3, y - 4, 4, p.dogFurLight);
  // the front paws stretched out, the pale chest behind them
  s += ellipse(x - 24, y - 16, 12, 11, p.dogFurLight, { opacity: 0.9 });
  s += ellipse(x - 56, y - 6, 15, 5.5, p.dogFurLight) + ellipse(x - 42, y - 4, 14, 5, p.dogFurLight);
  // the head resting on the paws: the skull, the pale muzzle, the nose, the closed eye
  s += ellipse(x - 40, y - 23, 19, 15, p.dogFur) + ellipse(x - 40, y - 23, 19, 15, c.ref('round'));
  s += path(`M${x - 50} ${y - 25} C${x - 60} ${y - 27} ${x - 70} ${y - 24} ${x - 72} ${y - 17} C${x - 72} ${y - 11} ${x - 62} ${y - 9} ${x - 50} ${y - 11}Z`, p.dogFurLight);
  s += ellipse(x - 70, y - 19, 3.6, 3, p.ink) + circle(x - 71, y - 20, 1, p.white, { opacity: 0.6 }) + stroke(`M${x - 66} ${y - 12} q4 2 8 0`, p.ink, 1.2, { opacity: 0.6 });
  s += stroke(`M${x - 54} ${y - 28} q4 3 8 0`, p.ink, 1.8);
  // the soft ear hanging behind the eye
  return s + path(`M${x - 38} ${y - 37} C${x - 30} ${y - 40} ${x - 24} ${y - 30} ${x - 25} ${y - 18} C${x - 26} ${y - 10} ${x - 34} ${y - 10} ${x - 35} ${y - 18} C${x - 36} ${y - 26} ${x - 40} ${y - 32} ${x - 38} ${y - 37}Z`, p.dogFurDark);
}
