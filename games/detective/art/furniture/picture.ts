// A small landscape in a brass frame.
import type { Ctx } from '../defs.ts';
import { circle, path, rect } from '../svg.ts';

export function picture(c: Ctx, m: { x: number; y: number; w: number; h: number }): string {
  const { p } = c;
  const { x, y, w, h } = m;
  return (
    rect(x + 3, y + 5, w, h, p.black, { opacity: 0.2, filter: c.ref('soft') }) +
    rect(x, y, w, h, p.brassDark, { rx: 3 }) +
    rect(x + 8, y + 8, w - 16, h - 16, p.pictureSky) +
    path(`M${x + 8} ${y + 58} q22 -24 40 -8 q16 -18 48 6 L${x + w - 8} ${y + h - 8} L${x + 8} ${y + h - 8}Z`, p.pictureHill) +
    path(`M${x + 56} ${y + 52} l10 -18 l10 18Z`, p.white, { opacity: 0.8 }) +
    circle(x + 30, y + 26, 7, p.pictureSun)
  );
}
