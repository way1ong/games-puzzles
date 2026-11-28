// The horn of the post, our own simple drawing: a mouthpiece, one round coil and a wide bell. It is painted on the
// door's glass and stands, on an enamel plate, on the counter's screen.
import type { Ctx } from '../defs.ts';
import { ellipse, g, path, stroke } from '../svg.ts';

/** The horn in one colour, about 62 wide and 30 tall around `x`, `y`; `k` scales it. */
export function postHorn(x: number, y: number, colour: string, k = 1): string {
  const line = 3.2;
  return g(
    `translate(${x} ${y}) scale(${k})`,
    // the coil, the tube from the mouthpiece into it and on to the bell
    ellipse(-6, -2, 11, 10, 'none', { stroke: colour, 'stroke-width': line }) +
      stroke('M-29 -12 L-17 -12 Q-8 -13 -6 -12', colour, line) +
      stroke('M-29 -15 l0 6', colour, 2.4) +
      stroke('M5 -2 Q10 -6 16 -6', colour, line) +
      path('M14 -9 Q24 -12 31 -20 Q34 -5 31 10 Q24 3 14 1Z', colour),
  );
}

/** The emblem: an oval enamel plate with a brass rim and the horn, on a small foot; `y` — the line it stands on. */
export function postEmblem(c: Ctx, x: number, y: number): string {
  const { p } = c;
  const cy = y - 32;
  return (
    ellipse(x + 2, cy + 4, 40, 28, p.black, { opacity: 0.2, filter: c.ref('soft') }) +
    path(`M${x - 10} ${y} l4 -8 l12 0 l4 8Z`, p.brassDark) +
    ellipse(x, cy, 40, 27, p.brassDark) +
    ellipse(x, cy, 36, 23.5, p.postBlue) +
    ellipse(x, cy, 36, 23.5, c.ref('round')) +
    postHorn(x - 1, cy + 2, p.gold, 0.85) +
    ellipse(x - 16, cy - 12, 9, 4, p.white, { opacity: c.night ? 0.12 : 0.3, transform: `rotate(-20 ${x - 16} ${cy - 12})` })
  );
}
