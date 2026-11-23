// A carpet runner along the hall: a red strip with gold lines and a fringe at both short ends.
import { floorShadow, type Ctx } from '../defs.ts';
import { rect } from '../svg.ts';

export function runner(c: Ctx, m: { x: number; y: number; w: number; h: number }): string {
  const { p } = c;
  let s = floorShadow(c, m.x + m.w / 2, m.y + m.h / 2 + 5, m.w / 2 + 6, m.h / 2, 0.25);
  for (let fy = m.y + 4; fy < m.y + m.h - 2; fy += 7) s += rect(m.x - 9, fy, 9, 2.4, p.rugGold, { rx: 1 }) + rect(m.x + m.w, fy, 9, 2.4, p.rugGold, { rx: 1 });
  s += rect(m.x, m.y, m.w, m.h, p.runner, { rx: 2 }) + rect(m.x, m.y + 14, m.w, m.h - 28, p.runnerInner);
  s += rect(m.x, m.y + 8, m.w, 3, p.rugGold, { opacity: 0.85 }) + rect(m.x, m.y + m.h - 11, m.w, 3, p.rugGold, { opacity: 0.85 });
  for (let dx = 40; dx < m.w - 20; dx += 70) s += rect(m.x + dx, m.y + m.h / 2 - 5, 10, 10, p.rugGold, { opacity: 0.55, transform: `rotate(45 ${m.x + dx + 5} ${m.y + m.h / 2})` });
  return s;
}
