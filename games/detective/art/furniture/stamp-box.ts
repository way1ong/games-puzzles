// The stamp box on the counter: a small wooden box whose sloping glass lid shows sheets of stamps, and a little
// round dish with a damp sponge beside it.
import type { Ctx } from '../defs.ts';
import { ellipse, path, rect } from '../svg.ts';

/** `x` — the middle, `y` — the counter it stands on; 44 wide and 26 tall. */
export function stampBox(c: Ctx, x: number, y: number): string {
  const { p } = c;
  const stamps = [p.red, p.blueLight, p.green, p.yellow, p.pin, p.blue];
  const bx = x - 6;
  // the lid seen from above the front: narrower at the back, stamps in two rows under the glass
  let s = path(`M${bx - 16} ${y - 10} l3 -16 l26 0 l3 16Z`, p.brassDark) + path(`M${bx - 13} ${y - 11} l2.4 -12.6 l21.2 0 l2.4 12.6Z`, p.feather);
  for (let row = 0; row < 2; row++) {
    for (let i = 0; i < 5; i++) s += rect(bx - 11 + row * 0.8 + i * 4.6 - row * 0.4, y - 22 + row * 6, 3.4, 4, stamps[(i + row * 2) % stamps.length] as string);
  }
  s += path(`M${bx - 13} ${y - 11} l2.4 -12.6 l8 0 l-6 12.6Z`, p.white, { opacity: c.night ? 0.06 : 0.3 });
  // the front of the box with its brass knob
  s += rect(bx - 17, y - 11, 34, 11, p.woodMid, { rx: 1.5 }) + rect(bx - 17, y - 11, 34, 11, c.ref('round'), { rx: 1.5 }) + rect(bx - 3, y - 8, 6, 3, p.brass, { rx: 1 });
  // the dish with the sponge
  return s + ellipse(x + 16, y - 1.5, 6, 2.2, p.china) + rect(x + 10, y - 5, 12, 4, p.china, { rx: 1 }) + ellipse(x + 16, y - 5, 4.6, 1.8, p.sack);
}
