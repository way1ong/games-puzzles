// A wicker basket of buns on a checked cloth.
import type { Ctx } from '../defs.ts';
import { ellipse, path, rect } from '../svg.ts';

/** `x` — the middle, `y` — the line it stands on, `half` — half its width. */
export function bunBasket(c: Ctx, x: number, y: number, half: number): string {
  const { p } = c;
  let s = '';
  for (const [dx, dy] of [[-17, -28], [1, -31], [18, -27], [-8, -36], [10, -37]] as const) {
    s += ellipse(x + dx, y + dy, 11, 9, p.crust) + ellipse(x + dx, y + dy, 11, 9, c.ref('round')) + ellipse(x + dx - 2, y + dy - 4, 4, 2, p.crustLight, { opacity: 0.8 });
  }
  // the cloth hangs over the rim
  s += path(`M${x - half + 2} ${y - 24} l${2 * half - 4} 0 l-8 12 l${-(2 * half - 20)} 0Z`, p.awningPale);
  for (let i = 1; i < 6; i++) s += rect(x - half + 4 + i * ((2 * half - 8) / 6), y - 24, 2, 11, p.awning, { opacity: 0.55 });
  const body = `M${x - half} ${y - 22} L${x + half} ${y - 22} L${x + half - 7} ${y} L${x - half + 7} ${y}Z`;
  s += path(body, p.wicker) + path(body, c.ref('round'));
  for (let i = 1; i < 3; i++) s += rect(x - half + 3, y - 22 + i * 7.5, 2 * half - 6, 1.6, p.wickerDark, { opacity: 0.55 });
  return s + rect(x - half - 2, y - 25, 2 * half + 4, 5, p.wickerDark, { rx: 2.5 });
}
