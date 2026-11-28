// A framed poster of a big postage stamp, our own picture and no words: a swallow carrying a letter over green
// hills, a blank corner for the value, the perforated edge, and a round postmark with wavy lines over a corner.
import type { Ctx } from '../defs.ts';
import { circle, g, path, rect, stroke } from '../svg.ts';

export function stampPoster(c: Ctx, m: { x: number; y: number; w: number; h: number }): string {
  const { p } = c;
  const { x, y, w, h } = m;
  let s = rect(x + 3, y + 5, w, h, p.black, { opacity: 0.2, filter: c.ref('soft') }) + rect(x, y, w, h, p.woodDark, { rx: 3 }) + rect(x + 6, y + 6, w - 12, h - 12, p.cream);
  // the stamp: a white sheet with a perforated edge (bites of the poster's ground along every side)
  const [sx, sy, sw, sh] = [x + 20, y + 18, w - 40, h - 40];
  // round dots of the ground's colour along the edge: a dotted line as wide as a bite
  s += rect(sx, sy, sw, sh, p.feather) + rect(sx, sy, sw, sh, 'none', { stroke: p.cream, 'stroke-width': 4.8, 'stroke-dasharray': '0 7', 'stroke-linecap': 'round' });
  // the picture: sky, a pale sun, two hills, a road, the swallow with the letter
  const [px, py, pw, ph] = [sx + 8, sy + 8, sw - 16, sh - 16];
  s += rect(px, py, pw, ph, p.pictureSky) + circle(px + pw - 20, py + 22, 11, p.pictureSun);
  s += path(`M${px} ${py + ph * 0.66} q${pw * 0.3} -${ph * 0.2} ${pw * 0.55} -${ph * 0.04} q${pw * 0.25} -${ph * 0.16} ${pw * 0.45} ${ph * 0.02} L${px + pw} ${py + ph} L${px} ${py + ph}Z`, p.pictureHill);
  s += path(`M${px + pw * 0.42} ${py + ph} q${pw * 0.06} -${ph * 0.16} ${pw * 0.2} -${ph * 0.3} l4 0 q-${pw * 0.08} ${ph * 0.14} -${pw * 0.04} ${ph * 0.3}Z`, p.cream, { opacity: 0.8 });
  s += g(
    `translate(${px + pw * 0.42} ${py + ph * 0.36})`,
    // wings, the body with a pale belly, the forked tail, the letter held under it
    path('M-4 0 Q-22 -16 -34 -10 Q-18 -6 -6 4Z', p.postBlue) +
      path('M4 -2 Q20 -22 34 -20 Q20 -8 6 4Z', p.postBlue) +
      path('M-14 2 Q0 -6 14 0 Q4 8 -14 2Z', p.postBlueDark) +
      path('M-10 3 Q0 6 10 1 Q2 9 -10 3Z', p.cream) +
      path('M14 0 l12 -6 l-6 6 l8 2 l-14 0Z', p.postBlueDark) +
      circle(10, -1, 1.4, p.white) +
      g('translate(-2 14) rotate(-8)', rect(-9, -6, 18, 12, p.feather, { stroke: p.linenEdge, 'stroke-width': 1 }) + stroke('M-9 -6 l9 6 l9 -6', p.linenEdge, 1) + circle(0, 1, 2, p.red)),
  );
  // the blank corner for the value, the postmark
  s += rect(px + 6, py + ph - 22, 26, 16, p.feather, { opacity: 0.85 });
  const [mx, my] = [sx + sw - 8, sy + sh - 14];
  s += circle(mx, my, 17, 'none', { stroke: p.ink, 'stroke-width': 2, opacity: 0.45 }) + circle(mx, my, 11, 'none', { stroke: p.ink, 'stroke-width': 1.2, opacity: 0.35 });
  s += stroke(`M${mx - 60} ${my - 6} q6 -5 12 0 t12 0 t12 0 t12 0 M${mx - 60} ${my + 4} q6 -5 12 0 t12 0 t12 0 t12 0`, p.ink, 1.6, { opacity: 0.4 });
  return s;
}
