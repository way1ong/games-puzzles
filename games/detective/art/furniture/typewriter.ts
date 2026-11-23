// A typewriter with a sheet of paper in it.
import type { Ctx } from '../defs.ts';
import { circle, g, rect } from '../svg.ts';

/** `x` — the middle, `y` — the line it stands on. */
export function typewriter(c: Ctx, x: number, y: number): string {
  const { p } = c;
  let lines = '';
  for (let i = 0; i < 3; i++) lines += rect(-24, -60 + i * 6, 40 - i * 8, 2, p.typed);
  let keys = '';
  for (let row = 0; row < 3; row++) for (let col = 0; col < 8; col++) keys += circle(-30 + col * 8.5 + row * 2, -22 + row * 7, 2.6, p.ivory);
  return g(
    `translate(${x} ${y})`,
    rect(-46, -30, 92, 30, p.iron, { rx: 6 }) +
      rect(-46, -30, 92, 30, c.ref('round'), { rx: 6 }) +
      rect(-40, -44, 80, 16, p.ironLight, { rx: 5 }) +
      rect(-30, -66, 60, 26, p.paper) +
      lines +
      rect(-50, -48, 100, 6, p.ironDark, { rx: 3 }) +
      keys,
  );
}
