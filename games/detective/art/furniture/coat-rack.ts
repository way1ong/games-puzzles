// A coat rack with a coat and a hat on it; an umbrella leans on the coat, its tip on the floor.
import { floorShadow, type Ctx } from '../defs.ts';
import { circle, ellipse, g, path, rect, stroke } from '../svg.ts';

/** `x` — the pole, `bottom` — the line the rack stands on. */
export function coatRack(c: Ctx, x: number, bottom: number): string {
  const { p } = c;
  let s = floorShadow(c, x, bottom + 3, 46, 9) + rect(x - 4, 205, 8, bottom - 205, p.woodDark) + path(`M${x - 40} ${bottom} l40 -26 l40 26Z`, p.woodDark) + circle(x, 200, 9, p.woodDark);
  s += stroke(`M${x} 222 q-26 0 -30 -16`, p.woodDark, 6) + stroke(`M${x} 222 q26 0 30 -16`, p.woodDark, 6);
  const coat = `M${x - 22} 230 q-36 30 -40 210 l38 6 l24 -8 l24 8 l38 -6 q-4 -180 -40 -210 q-22 -10 -44 0Z`;
  s +=
    path(coat, p.coat) +
    path(coat, c.ref('round')) +
    stroke(`M${x} 232 l0 205`, p.black, 3, { 'stroke-opacity': 0.2 }) +
    rect(x - 40, 330, 80, 9, p.black, { opacity: 0.18, rx: 3 }) +
    stroke(`M${x - 18} 232 l18 40 l18 -40`, p.black, 3, { 'stroke-opacity': 0.18 }) +
    circle(x - 8, 290, 3.5, p.coatButton) +
    circle(x - 8, 380, 3.5, p.coatButton);
  // the hat on the right hook
  const hx = x + 28;
  const crown = `M${hx - 22} 208 q2 -30 22 -30 q20 0 22 30Z`;
  s += ellipse(hx, 210, 34, 8, p.hatBrim) + path(crown, p.hat) + rect(hx - 22, 200, 44, 6, p.hatBand) + path(crown, c.ref('round'));
  // the umbrella: handle up, tip down
  const canopy = 'M0 -10 C-7 -40 -10 -92 -8 -116 L8 -116 C10 -92 7 -40 0 -10 Z';
  s += g(
    `translate(${x + 56} ${bottom}) rotate(-9)`,
    rect(-1.2, -12, 2.4, 12, p.steel) +
      path(canopy, p.umbrella) +
      path(canopy, c.ref('round')) +
      rect(-7, -84, 14, 5, p.black, { opacity: 0.25, rx: 2 }) +
      rect(-1.5, -134, 3, 18, p.leather) +
      stroke('M0 -134 q0 -12 10 -11 q6 1 5 7', p.leather, 4),
  );
  return s;
}
