// The writing desk: drawers on the left, a banker's lamp (off by day), the typewriter, a mug, a pile of
// paper and the telephone.
import { floorShadow, type Ctx } from '../defs.ts';
import { circle, ellipse, g, path, rect, stroke } from '../svg.ts';
import { typewriter } from './typewriter.ts';

export interface Desk {
  x: number;
  w: number;
  top: number;
  foot: number;
  lamp: number;
  typewriter: number;
  mug: number;
  papers: { x: number; w: number; top: number };
  phone: number;
}

export function desk(c: Ctx, m: Desk): string {
  const { p, night } = c;
  const { x, w, top } = m;
  const tall = m.foot - top - 20;
  let s = floorShadow(c, x + w / 2, m.foot + 8, w / 2 + 10, 14, 0.35);
  // the pedestal with two drawers, the right leg, the apron between them
  const drawer = (dy: number, dh: number) =>
    rect(x + 20, top + dy, 104, dh, p.woodMid, { rx: 4 }) + rect(x + 20, top + dy, 104, dh, c.ref('round'), { rx: 4 }) + rect(x + 62, top + dy + dh / 2 - 3, 20, 6, p.brass, { rx: 3 });
  s += rect(x + 12, top + 20, 120, tall, p.wood) + drawer(30, 70) + drawer(108, 74);
  s += rect(x + w - 30, top + 20, 18, tall, p.wood) + rect(x + 132, top + 20, w - 162, 26, p.woodDark);
  s += rect(x, top, w, 22, p.woodDark, { rx: 4 }) + rect(x, top, w, 5, p.white, { opacity: 0.1, rx: 2 }) + rect(x, top, w, 22, c.ref('grain'), { rx: 4 });

  // banker's lamp
  const lx = m.lamp;
  const shade = `M${lx - 48} ${top - 58} q48 -30 96 0 l-6 10 l-84 0Z`;
  if (night) s += ellipse(lx, top + 10, 120, 46, c.ref('glow'));
  s += ellipse(lx, top, 28, 7, p.lampFoot) + rect(lx - 4, top - 62, 8, 62, p.brass) + path(shade, p.lampGreen) + path(shade, c.ref('round')) + ellipse(lx, top - 46, 36, 4, p.lampInside, { opacity: 0.95 });
  if (night) s += path(`M${lx - 36} ${top - 46} L${lx + 36} ${top - 46} L${lx + 100} ${top + 2} L${lx - 100} ${top + 2}Z`, p.lamp, { opacity: 0.18, filter: c.ref('soft') });

  s += typewriter(c, m.typewriter, top);
  // paper: two piles one on the other, flat on the desk
  const half = (top - m.papers.top) / 2;
  s += rect(m.papers.x, top - half, m.papers.w - 3, half, p.paperShade) + rect(m.papers.x + 3, m.papers.top, m.papers.w - 3, half, p.paper);
  // the mug with steam
  s += g(
    `translate(${m.mug} ${top})`,
    rect(-9, -20, 18, 20, p.china, { rx: 3 }) + stroke('M9 -16 q9 0 9 6 q0 6 -9 6', p.china, 3) + stroke('M-3 -24 q-6 -8 0 -14 q6 -6 0 -12', p.white, 2, { opacity: night ? 0.4 : 0.8 }),
  );
  // the telephone
  s += g(
    `translate(${m.phone} ${top})`,
    path('M-30 0 l7 -24 l46 0 l7 24Z', p.phone) + circle(0, -12, 9, p.dial) + circle(0, -12, 3, p.phone) + path('M-34 -28 q34 -20 68 0 l-7 7 q-27 -12 -54 0Z', p.phoneDark),
  );
  return s;
}
