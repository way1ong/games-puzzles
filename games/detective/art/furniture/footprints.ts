// Footprints across the floor: wet ones after the rain, white ones of flour. `turn` — where the steps
// lead, in degrees from "up the picture".
import type { Ctx } from '../defs.ts';
import { ellipse, g } from '../svg.ts';

export function footprints(c: Ctx, steps: readonly (readonly [number, number])[], flour = false, turn = 0): string {
  const colour = flour ? c.p.flour : c.p.black;
  const opacity = flour ? 0.55 : c.night ? 0.32 : 0.2;
  return steps
    .map(([x, y], i) => g(`translate(${x} ${y}) rotate(${turn - 12 + (i % 2) * 8})`, ellipse(0, 0, 9, 15, colour, { opacity }) + ellipse(0, 19, 7, 7, colour, { opacity })))
    .join('');
}
