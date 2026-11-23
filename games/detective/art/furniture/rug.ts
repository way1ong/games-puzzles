// An oval rug with a braided edge all round (an oval rug has no fringe — owner's remark of 23.11).
import { floorShadow, type Ctx } from '../defs.ts';
import { circle, ellipse, n } from '../svg.ts';

export function rug(c: Ctx, m: { cx: number; cy: number; rx: number; ry: number }): string {
  const { p } = c;
  const { cx, cy, rx, ry } = m;
  let s = floorShadow(c, cx, cy + 8, rx + 8, ry + 4, 0.35) + ellipse(cx, cy, rx, ry, p.rug);
  s += ellipse(cx, cy, rx - 5, ry - 2.5, 'none', { stroke: p.rugGold, 'stroke-width': 3, 'stroke-dasharray': '7 5', opacity: 0.65 });
  s += ellipse(cx, cy, rx - 22, ry - 10, 'none', { stroke: p.rugGold, 'stroke-width': 5 }) + ellipse(cx, cy, rx - 48, ry - 20, p.rugInner);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    s += circle(n(cx + Math.cos(a) * (rx - 74)), n(cy + Math.sin(a) * (ry - 26)), 4, p.rugGold, { opacity: 0.8 });
  }
  return s + ellipse(cx, cy, rx - 190, ry - 42, 'none', { stroke: p.rugGold, 'stroke-width': 3, 'stroke-dasharray': '10 8' });
}
