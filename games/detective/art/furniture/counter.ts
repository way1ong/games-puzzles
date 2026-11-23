// The shop counter: a wooden front with panels, a glass case of pastries on it and the scales. It runs
// off the right edge of the picture.
import { DETECTIVE } from '../../config.ts';
import { floorShadow, type Ctx } from '../defs.ts';
import { circle, ellipse, line, path, rect, stroke } from '../svg.ts';

const W = DETECTIVE.scene.width;

export interface Counter {
  x: number;
  top: number;
  foot: number;
  showcase: { x: number; w: number; top: number };
  scales: number;
}

/** The glass case: two shelves of pastries behind glass, a wooden top things can stand on. */
function showcase(c: Ctx, x: number, w: number, top: number, bottom: number): string {
  const { p } = c;
  const tall = bottom - top;
  const mid = top + tall / 2 + 3;
  let s = rect(x, top, w, tall, p.woodMid, { rx: 3 }) + rect(x + 6, top + 8, w - 12, tall - 12, p.cream);
  s += rect(x + 6, mid, w - 12, 3, p.woodMid);
  // upper shelf: little cakes with a berry; lower shelf: crescents
  for (let i = 0; i < 4; i++) {
    const cx = x + 26 + i * ((w - 52) / 3);
    s += path(`M${cx - 9} ${mid} l2 -10 l14 0 l2 10Z`, p.crustDark) + ellipse(cx, mid - 11, 10, 5.5, p.icing) + circle(cx, mid - 16, 3, p.berry);
  }
  for (let i = 0; i < 3; i++) {
    const cx = x + 32 + i * ((w - 64) / 2);
    s += stroke(`M${cx - 13} ${bottom - 7} q13 -20 26 0`, p.crust, 8) + stroke(`M${cx - 9} ${bottom - 10} q9 -11 18 0`, p.crustLight, 2);
  }
  // the glass with two streaks of light
  s += rect(x + 6, top + 8, w - 12, tall - 12, p.glass, { opacity: 0.28 });
  s += path(`M${x + 16} ${top + 10} l16 0 l-22 ${tall - 16} l-10 0Z`, p.white, { opacity: 0.22 }) + path(`M${x + 44} ${top + 10} l7 0 l-22 ${tall - 16} l-5 0Z`, p.white, { opacity: 0.16 });
  return s + rect(x - 3, top, w + 6, 7, p.woodDark, { rx: 3 }) + rect(x - 3, top, w + 6, 2.5, p.white, { opacity: 0.14, rx: 1.2 });
}

/** Kitchen scales with a brass pan; `y` — the counter they stand on. */
function scales(c: Ctx, x: number, y: number): string {
  const { p } = c;
  return (
    rect(x - 22, y - 8, 44, 8, p.ironDark, { rx: 3 }) +
    path(`M${x - 17} ${y - 8} l5 -26 l24 0 l5 26Z`, p.iron) +
    circle(x, y - 21, 10, p.paper, { stroke: p.brassDark, 'stroke-width': 2 }) +
    line(x, y - 21, x + 5, y - 27, p.red, 1.8) +
    rect(x - 2.5, y - 42, 5, 9, p.brassDark) +
    path(`M${x - 27} ${y - 48} q27 14 54 0Z`, p.brass) +
    rect(x - 28, y - 50, 56, 3, p.brassDark, { rx: 1.5 })
  );
}

export function counter(c: Ctx, m: Counter): string {
  const { p } = c;
  const { x, top, foot } = m;
  const w = W - x;
  let s = floorShadow(c, x + w / 2, foot + 8, w / 2 + 10, 12, 0.35);
  s += rect(x + 6, top + 18, w, foot - top - 18, p.wood) + rect(x + 6, top + 18, w, foot - top - 18, c.ref('grain'));
  for (let px = x + 26; px < W; px += 116) {
    s += rect(px, top + 40, 96, foot - top - 76, p.woodMid, { rx: 5, opacity: 0.55 }) + rect(px, top + 40, 96, foot - top - 76, 'none', { rx: 5, stroke: p.woodDark, 'stroke-width': 3 });
  }
  s += rect(x + 6, foot - 16, w, 16, p.woodDark) + rect(x + 6, top + 18, w, 8, p.black, { opacity: 0.2 });
  s += rect(x - 6, top, w + 12, 20, p.woodDark, { rx: 4 }) + rect(x - 6, top, w + 12, 5, p.white, { opacity: 0.1, rx: 2 }) + rect(x - 6, top, w + 12, 20, c.ref('grain'), { rx: 4 });
  return s + showcase(c, m.showcase.x, m.showcase.w, m.showcase.top, top) + scales(c, m.scales, top);
}
