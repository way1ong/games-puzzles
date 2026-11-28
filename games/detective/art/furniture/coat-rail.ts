// A coat rail on the wall: a wooden board with three brass hooks. By day a guest's hat, a string bag of oranges and
// an umbrella hang on it; at night only the apron hung up after closing and the umbrella somebody forgot.
import type { Ctx } from '../defs.ts';
import { circle, ellipse, path, rect, stroke } from '../svg.ts';

export interface CoatRail {
  x: number;
  /** The middle of the board. */
  y: number;
  w: number;
  /** Where the hooks are. */
  hooks: readonly [number, number, number];
}

/** A closed umbrella hanging by its crook; `x`, `y` — the end of the hook. */
function umbrella(c: Ctx, x: number, y: number): string {
  const { p } = c;
  const canopy = `M${x - 3} ${y + 20} C${x - 9} ${y + 50} ${x - 8} ${y + 110} ${x} ${y + 136} C${x + 8} ${y + 110} ${x + 9} ${y + 50} ${x + 3} ${y + 20}Z`;
  return (
    stroke(`M${x - 8} ${y + 4} q0 -9 8 -9 q8 0 8 9 l0 16`, p.leather, 4) +
    path(canopy, p.red) +
    path(canopy, c.ref('spine')) +
    stroke(`M${x} ${y + 24} L${x} ${y + 130}`, p.black, 1.2, { opacity: 0.25 }) +
    rect(x - 5, y + 60, 10, 4, p.black, { opacity: 0.25, rx: 2 }) +
    rect(x - 1, y + 136, 2, 8, p.steel)
  );
}

/** A felt hat hanging by its brim. */
function hat(c: Ctx, x: number, y: number): string {
  const { p } = c;
  const crown = `M${x - 15} ${y + 6} q1 -21 15 -21 q14 0 15 21Z`;
  return ellipse(x, y + 7, 25, 6, p.hatBrim) + path(crown, p.hat) + rect(x - 15, y, 30, 5, p.hatBand) + path(crown, c.ref('round'));
}

/** A string bag of oranges. */
function stringBag(c: Ctx, x: number, y: number): string {
  const { p } = c;
  let s = '';
  for (const [dx, dy] of [[-8, 56], [8, 58], [0, 44], [-5, 70], [7, 72]] as const) s += circle(x + dx, y + dy, 8, p.orange) + circle(x + dx - 2.5, y + dy - 2.5, 2.4, p.white, { opacity: 0.35 });
  s += stroke(`M${x - 3} ${y} L${x - 17} ${y + 42} Q${x - 19} ${y + 80} ${x} ${y + 84} Q${x + 19} ${y + 80} ${x + 17} ${y + 42} L${x + 3} ${y}`, p.paperShade, 1.4);
  return s + stroke(`M${x - 17} ${y + 46} L${x + 13} ${y + 80} M${x + 17} ${y + 46} L${x - 13} ${y + 80} M${x - 18} ${y + 62} L${x + 2} ${y + 84} M${x + 18} ${y + 62} L${x - 2} ${y + 84}`, p.paperShade, 1.2, { opacity: 0.9 });
}

/** A barista's apron hanging by its neck strap. */
function apron(c: Ctx, x: number, y: number): string {
  const { p } = c;
  const body = `M${x - 12} ${y + 22} L${x + 12} ${y + 22} L${x + 15} ${y + 50} L${x + 20} ${y + 120} L${x - 20} ${y + 120} L${x - 15} ${y + 50}Z`;
  return (
    stroke(`M${x - 11} ${y + 23} Q${x - 8} ${y - 2} ${x} ${y - 2} Q${x + 8} ${y - 2} ${x + 11} ${y + 23}`, p.apron, 2.6) +
    path(body, p.apron) +
    path(body, c.ref('spine')) +
    rect(x - 13, y + 70, 26, 18, p.black, { opacity: 0.15, rx: 2 }) +
    stroke(`M${x - 15} ${y + 50} q-6 20 -3 44 M${x + 15} ${y + 50} q6 20 3 44`, p.apron, 2.4)
  );
}

export function coatRail(c: Ctx, m: CoatRail): string {
  const { p, night } = c;
  const { x, y, w, hooks } = m;
  let s = rect(x + 2, y - 6, w, 20, p.black, { opacity: 0.18, rx: 3, filter: c.ref('soft') });
  s += rect(x, y - 10, w, 20, p.woodMid, { rx: 3 }) + rect(x, y - 10, w, 3, p.white, { opacity: 0.18, rx: 1.5 }) + rect(x, y + 7, w, 3, p.black, { opacity: 0.2 });
  for (const hx of hooks) s += circle(hx, y, 3.4, p.brassDark) + stroke(`M${hx} ${y} q-1 12 4 14 q5 1 5 -5`, p.brass, 3);
  const [first, second, third] = hooks;
  if (night) s += apron(c, first, y + 12);
  else s += hat(c, first, y + 26) + stringBag(c, second + 2, y + 12);
  return s + umbrella(c, third + 3, y + 12);
}
