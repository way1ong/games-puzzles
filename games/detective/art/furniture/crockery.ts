// What stands on the café's shelves: each drawing starts at its left edge on the shelf line and keeps to its
// width — cups on saucers, a stack of cups, jars of coffee beans, coffee tins, a teapot, a milk jug, plates.
import type { Ctx } from '../defs.ts';
import { circle, ellipse, g, path, rect, stroke } from '../svg.ts';

/** A cup on its saucer, its middle at `x`, with a blue band. */
function cup(c: Ctx, x: number, y: number): string {
  const { p } = c;
  const body = `M${x - 11} ${y - 23} L${x + 11} ${y - 23} L${x + 9} ${y - 8} Q${x} ${y - 3} ${x - 9} ${y - 8}Z`;
  return (
    ellipse(x, y - 2.5, 14, 3, p.china) +
    ellipse(x, y - 1.4, 14, 2.2, p.black, { opacity: 0.12 }) +
    stroke(`M${x + 10} ${y - 19} q8 0 7 6 q-1 5 -8 4`, p.china, 2.6) +
    path(body, p.china) +
    path(body, c.ref('round')) +
    rect(x - 10.6, y - 19, 21.2, 3, p.blueLight) +
    ellipse(x, y - 23, 11, 2.4, p.paperShade)
  );
}

/** Cups on saucers in a row. */
export function cups(c: Ctx, x: number, y: number, w: number): string {
  const count = Math.max(1, Math.floor((w + 2) / 32));
  const step = w / count;
  let s = '';
  for (let i = 0; i < count; i++) s += cup(c, x + step * (i + 0.5), y);
  return s;
}

/** Saucers in a pile with two cups upside down on top. */
export function cupStack(c: Ctx, x: number, y: number, w: number): string {
  const { p } = c;
  const mid = x + w / 2;
  let s = '';
  for (let i = 0; i < 5; i++) s += ellipse(mid, y - 2 - i * 3, w / 2, 2.6, p.china) + ellipse(mid, y - 1 - i * 3, w / 2, 1.4, p.black, { opacity: 0.1 });
  for (let i = 0; i < 3; i++) {
    const base = y - 16 - i * 15;
    const body = `M${mid - 11} ${base} L${mid + 11} ${base} L${mid + 8} ${base - 14} L${mid - 8} ${base - 14}Z`;
    s += path(body, p.china) + path(body, c.ref('round')) + rect(mid - 10, base - 4, 20, 2.4, p.blueLight);
  }
  return s;
}

/** A glass jar of coffee beans under a brass lid. */
export function beanJar(c: Ctx, x: number, y: number, w: number): string {
  const { p } = c;
  let s = rect(x + 2, y - 36, w - 4, 34, p.bean, { rx: 4 });
  for (const [dx, dy] of [[0.3, 10], [0.62, 16], [0.44, 24], [0.24, 30], [0.72, 28], [0.5, 8]] as const) {
    s += ellipse(x + w * dx, y - dy, 2.6, 1.8, p.crema, { opacity: 0.6 });
  }
  s += rect(x + 1, y - 44, w - 2, 44, p.glass, { rx: 5, opacity: 0.35 }) + rect(x + 4, y - 40, 3, 34, p.white, { opacity: 0.45, rx: 1.5 });
  return s + rect(x + 3, y - 50, w - 6, 7, p.brassDark, { rx: 2 }) + rect(x + 4, y - 50, w - 8, 2.4, p.white, { opacity: 0.25 }) + circle(x + w / 2, y - 52, 3, p.brass);
}

/** A round coffee tin of colour `fill` with a pale band (a label without words). */
export function coffeeTin(c: Ctx, x: number, y: number, w: number, fill: string): string {
  const { p } = c;
  return (
    rect(x + 1, y - 40, w - 2, 40, fill, { rx: 3 }) +
    rect(x + 1, y - 40, w - 2, 40, c.ref('round'), { rx: 3 }) +
    rect(x + 1, y - 28, w - 2, 14, p.cream) +
    circle(x + w / 2, y - 21, 4.5, fill, { opacity: 0.8 }) +
    rect(x, y - 44, w, 6, p.steel, { rx: 2 }) +
    rect(x, y - 44, w, 2, p.white, { opacity: 0.35 })
  );
}

/** A round china teapot. */
export function teapot(c: Ctx, x: number, y: number, w: number): string {
  const { p } = c;
  const mid = x + w / 2;
  return (
    path(`M${mid - 13} ${y - 14} Q${mid - 24} ${y - 18} ${mid - 27} ${y - 32} L${mid - 23} ${y - 33} Q${mid - 20} ${y - 24} ${mid - 12} ${y - 23}Z`, p.china) +
    stroke(`M${mid + 13} ${y - 30} q12 -4 10 12 q-2 10 -12 8`, p.china, 3.4) +
    ellipse(mid, y - 20, 17, 16, p.china) +
    ellipse(mid, y - 20, 17, 16, c.ref('round')) +
    rect(mid - 16, y - 24, 32, 3, p.blueLight, { opacity: 0.9 }) +
    ellipse(mid, y - 35, 9, 3, p.paperShade) +
    circle(mid, y - 39, 3.4, p.china) +
    rect(mid - 9, y - 4, 18, 4, p.paperShade, { rx: 2 })
  );
}

/** A small milk jug. */
export function milkJug(c: Ctx, x: number, y: number, w: number): string {
  const { p } = c;
  const mid = x + w / 2;
  const body = `M${mid - 8} ${y - 24} L${mid + 6} ${y - 24} L${mid + 11} ${y - 28} L${mid + 9} ${y - 20} Q${mid + 10} ${y - 4} ${mid + 6} ${y} L${mid - 7} ${y} Q${mid - 11} ${y - 8} ${mid - 8} ${y - 24}Z`;
  return stroke(`M${mid - 8} ${y - 20} q-7 2 -5 9 q1 4 5 3`, p.china, 2.4) + path(body, p.china) + path(body, c.ref('round'));
}

/** Plates standing on their rims against the wall, one before the other. */
export function plates(c: Ctx, x: number, y: number, w: number): string {
  const { p } = c;
  const r = Math.min(20, (w - 10) / 2);
  let s = '';
  for (let i = 0; i < 3; i++) {
    const cx = x + 1 + r + i * 4;
    s += g(
      `translate(${cx} ${y - r})`,
      circle(1.5, 1.5, r, p.black, { opacity: 0.12 }) + circle(0, 0, r, p.china) + circle(0, 0, r - 3, 'none', { stroke: p.blueLight, 'stroke-width': 1.6 }) + circle(0, 0, r - 8, p.paperShade, { opacity: 0.45 }),
    );
  }
  return s;
}
