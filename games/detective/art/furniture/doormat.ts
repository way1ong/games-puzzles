// The doormat: a woven mat with a darker edge, lying flat in front of the door.
import { floorShadow, type Ctx } from '../defs.ts';
import { rect } from '../svg.ts';

export function doormat(c: Ctx, m: { x: number; y: number; w: number; h: number }): string {
  const { p } = c;
  let s = floorShadow(c, m.x + m.w / 2, m.y + m.h / 2 + 5, m.w / 2 + 6, m.h / 2 + 2, 0.3) + rect(m.x, m.y, m.w, m.h, p.matEdge, { rx: 9 }) + rect(m.x + 7, m.y + 7, m.w - 14, m.h - 14, p.mat, { rx: 5 });
  for (let y = m.y + 15; y < m.y + m.h - 10; y += 8) s += rect(m.x + 12, y, m.w - 24, 2, p.matEdge, { opacity: 0.35 });
  return s;
}
