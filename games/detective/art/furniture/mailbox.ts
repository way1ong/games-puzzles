// A post box on the wall: a slot under a little roof, an envelope sign, a small door with a lock.
import type { Ctx } from '../defs.ts';
import { circle, path, rect, stroke } from '../svg.ts';

/** `x` — the middle, `y` — its top. */
export function mailbox(c: Ctx, x: number, y: number): string {
  const { p } = c;
  return (
    rect(x - 21, y + 5, 46, 72, p.black, { opacity: 0.2, rx: 6, filter: c.ref('soft') }) +
    rect(x - 23, y, 46, 72, p.mailbox, { rx: 6 }) +
    rect(x - 23, y, 46, 72, c.ref('round'), { rx: 6 }) +
    path(`M${x - 27} ${y + 4} q27 -16 54 0 l0 6 l-54 0Z`, p.mailboxDark) +
    rect(x - 15, y + 16, 30, 5, p.ink, { rx: 2 }) +
    rect(x - 13, y + 29, 26, 17, p.paper, { rx: 1.5 }) +
    stroke(`M${x - 13} ${y + 29} l13 9 l13 -9`, p.linenEdge, 1.4) +
    rect(x - 15, y + 52, 30, 14, p.mailboxDark, { rx: 2 }) +
    circle(x, y + 59, 2.2, p.brass)
  );
}
