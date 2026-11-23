// A wall clock. The hands show the hour of the scene.
import type { Ctx } from '../defs.ts';
import { circle, line, n } from '../svg.ts';

export function clock(c: Ctx, cx: number, cy: number, hours: number, minutes: number): string {
  const { p } = c;
  let s = circle(cx + 2, cy + 5, 54, p.black, { opacity: 0.18, filter: c.ref('soft') }) + circle(cx, cy, 52, p.woodDark) + circle(cx, cy, 46, p.woodMid) + circle(cx, cy, 41, p.paper);
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    s += line(n(cx + Math.sin(a) * 33), n(cy - Math.cos(a) * 33), n(cx + Math.sin(a) * 38), n(cy - Math.cos(a) * 38), p.ink, i % 3 ? 2 : 4);
  }
  const hand = (degrees: number, length: number, width: number) => {
    const a = (degrees * Math.PI) / 180;
    return line(cx, cy, n(cx + Math.sin(a) * length), n(cy - Math.cos(a) * length), p.ink, width);
  };
  return s + hand(((hours % 12) + minutes / 60) * 30, 21, 5) + hand(minutes * 6, 31, 3) + circle(cx, cy, 4, p.ink) + circle(cx, cy, 41, c.ref('round'));
}
