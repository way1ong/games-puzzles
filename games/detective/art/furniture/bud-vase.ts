// A little china vase with flowers: one on a café table at night, three on the piano.
import type { Ctx } from '../defs.ts';
import { circle, ellipse, n, path, stroke } from '../svg.ts';

/** A flower head of petals around a yellow middle. */
function bloom(c: Ctx, x: number, y: number, petal: string): string {
  let s = '';
  for (let i = 0; i < 5; i++) {
    const a = (i * 2 * Math.PI) / 5;
    s += circle(n(x + Math.sin(a) * 3.4), n(y - Math.cos(a) * 3.4), 3, petal);
  }
  return s + circle(x, y, 2, c.p.yellow);
}

/** `x` — the middle, `y` — the line it stands on; `flowers` — one or three. */
export function budVase(c: Ctx, x: number, y: number, flowers: 1 | 3): string {
  const { p } = c;
  const tall = flowers === 1 ? 16 : 22;
  const body = `M${x - 3} ${y - tall} L${x + 3} ${y - tall} Q${x + 3} ${y - tall * 0.6} ${x + 7} ${y - tall * 0.35} Q${x + 9} ${y} ${x + 4} ${y} L${x - 4} ${y} Q${x - 9} ${y} ${x - 7} ${y - tall * 0.35} Q${x - 3} ${y - tall * 0.6} ${x - 3} ${y - tall}Z`;
  let s = '';
  if (flowers === 1) {
    s += stroke(`M${x} ${y - tall} q-2 -12 2 -22`, p.greenDark, 1.6) + ellipse(x - 4, y - tall - 9, 4, 1.8, p.green, { transform: `rotate(-30 ${x - 4} ${y - tall - 9})` }) + bloom(c, x + 2, y - tall - 24, p.pink);
  } else {
    s += stroke(`M${x} ${y - tall} q-8 -10 -12 -24 M${x} ${y - tall} q1 -14 2 -30 M${x} ${y - tall} q8 -8 12 -20`, p.greenDark, 1.6);
    s += ellipse(x - 7, y - tall - 8, 5, 2, p.green, { transform: `rotate(35 ${x - 7} ${y - tall - 8})` }) + ellipse(x + 7, y - tall - 6, 5, 2, p.green, { transform: `rotate(-35 ${x + 7} ${y - tall - 6})` });
    s += bloom(c, x - 12, y - tall - 26, p.pink) + bloom(c, x + 2, y - tall - 32, p.berry) + bloom(c, x + 12, y - tall - 22, p.pinkDark);
  }
  return s + path(body, p.china) + path(body, c.ref('round')) + stroke(`M${x - 5} ${y - tall * 0.3} q5 2 10 0`, p.blueLight, 1.4);
}
