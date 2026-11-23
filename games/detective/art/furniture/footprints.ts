// Wet footprints across the floor (a rainy night).
import type { Ctx } from '../defs.ts';
import { ellipse, g } from '../svg.ts';

export function footprints(c: Ctx, steps: readonly (readonly [number, number])[]): string {
  const opacity = c.night ? 0.32 : 0.2;
  return steps
    .map(([x, y], i) => g(`translate(${x} ${y}) rotate(${-12 + (i % 2) * 8})`, ellipse(0, 0, 9, 15, c.p.black, { opacity }) + ellipse(0, 19, 7, 7, c.p.black, { opacity })))
    .join('');
}
