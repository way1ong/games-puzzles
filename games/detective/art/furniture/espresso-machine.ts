// The espresso machine on the counter: a body of shining metal, a pressure gauge, two group heads with their
// black handles, the steam wand, cups warming upside down on top. By day it hisses a little steam and two small
// cups stand under the spouts; at night it is cold and dim.
import type { Ctx } from '../defs.ts';
import { circle, ellipse, g, line, n, path, rect, stroke } from '../svg.ts';

/** `x` — the middle, `y` — the counter it stands on. */
export function espressoMachine(c: Ctx, x: number, y: number): string {
  const { p, night } = c;
  const shine = night ? 0.14 : 0.6;
  // the shadow on the wall, the drip tray with its grille
  let s = rect(x - 54, y - 104, 116, 96, p.black, { opacity: 0.16, rx: 12, filter: c.ref('soft') });
  s += rect(x - 60, y - 13, 120, 13, p.chromeDark, { rx: 3 });
  for (let gx = x - 54; gx < x + 56; gx += 6) s += rect(gx, y - 11, 2.4, 6, p.ironDark, { opacity: 0.5 });
  // the body with a rounded top
  const body = `M${x - 56} ${y - 13} L${x - 56} ${y - 86} Q${x - 56} ${y - 100} ${x - 42} ${y - 100} L${x + 42} ${y - 100} Q${x + 56} ${y - 100} ${x + 56} ${y - 86} L${x + 56} ${y - 13}Z`;
  s += path(body, p.chrome) + path(body, c.ref('spine'));
  s += rect(x - 47, y - 94, 7, 78, p.chromeLight, { opacity: shine }) + rect(x - 36, y - 94, 3, 78, p.white, { opacity: shine * 0.7 }) + rect(x + 38, y - 94, 4, 78, p.white, { opacity: shine * 0.4 });
  // a brass band with little bosses, the gauge over it
  s += rect(x - 56, y - 68, 112, 6, p.brass) + rect(x - 56, y - 68, 112, 2, p.white, { opacity: 0.35 });
  for (const bx of [x - 48, x + 48]) s += circle(bx, y - 65, 2.6, p.brassDark);
  s += circle(x, y - 82, 12, p.chromeDark) + circle(x, y - 82, 9, p.paper) + line(x, y - 82, x + 5, y - 87, p.red, 1.6) + circle(x, y - 82, 1.6, p.ink);
  for (let i = 0; i < 6; i++) {
    const a = ((i - 2.5) * Math.PI) / 7;
    s += line(n(x + Math.sin(a) * 6.4), n(y - 82 - Math.cos(a) * 6.4), n(x + Math.sin(a) * 8), n(y - 82 - Math.cos(a) * 8), p.ink, 1);
  }
  // two group heads, each with a handle sticking out and down
  for (const [gx, turn] of [[x - 28, 24], [x + 28, -24]] as const) {
    s += rect(gx - 12, y - 58, 24, 11, p.chromeLight, { rx: 3 }) + rect(gx - 12, y - 58, 24, 11, c.ref('round'), { rx: 3 });
    s += rect(gx - 9, y - 47, 18, 7, p.chromeDark, { rx: 2 }) + line(gx - 3, y - 40, gx - 3, y - 36, p.chromeDark, 2) + line(gx + 3, y - 40, gx + 3, y - 36, p.chromeDark, 2);
    s += g(`rotate(${turn} ${gx} ${y - 44})`, rect(gx - 3.5, y - 44, 7, 24, p.ink, { rx: 3.5 }) + rect(gx - 2, y - 42, 2, 18, p.white, { opacity: 0.25 }));
    if (!night) {
      // a small cup under the spouts
      s += rect(gx - 7, y - 25, 14, 12, p.china, { rx: 2.5 }) + rect(gx - 7, y - 25, 14, 12, c.ref('round'), { rx: 2.5 }) + stroke(`M${gx + 7} ${y - 22} q5 0 4 4 q-1 3 -4 2`, p.china, 1.8);
    }
  }
  // the steam wand on the right; a puff of steam from it by day
  s += circle(x + 56, y - 78, 5, p.chromeDark) + stroke(`M${x + 58} ${y - 78} q8 0 8 10 l0 36`, p.chromeDark, 3.4) + circle(x + 66, y - 31, 2.2, p.ironDark);
  if (!night) s += stroke(`M${x + 64} ${y - 36} q-6 -8 0 -14 q5 -6 0 -12`, p.white, 2, { opacity: 0.7 });
  // the rail on top and three cups warming upside down
  s += rect(x - 50, y - 112, 100, 3, p.chromeDark, { rx: 1.5 });
  for (const px of [x - 48, x + 48]) s += rect(px - 1.5, y - 112, 3, 12, p.chromeDark);
  for (const cx of [x - 26, x, x + 26]) {
    const cupD = `M${cx - 10} ${y - 100} L${cx + 10} ${y - 100} L${cx + 7} ${y - 114} L${cx - 7} ${y - 114}Z`;
    s += path(cupD, p.china) + path(cupD, c.ref('round')) + rect(cx - 9, y - 104, 18, 2.2, p.blueLight);
  }
  // little feet, and the knob of the steam on top of the side
  return s + ellipse(x - 44, y + 0.5, 6, 1.5, p.ironDark) + ellipse(x + 44, y + 0.5, 6, 1.5, p.ironDark) + rect(x + 50, y - 96, 10, 5, p.ink, { rx: 2 });
}
