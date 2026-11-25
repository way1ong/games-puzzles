// The arrow keys (docs/pairs/SPEC.md, "Екрани й керування"): from a tile to the nearest free tile in that
// direction, by the tiles' places on the table (half tiles). A tile straight ahead wins over one aside. Pure.
import type { Slot } from './layouts.ts';

export type Direction = 'left' | 'right' | 'up' | 'down';

/** How far a tile lies ahead and aside of another, in half tiles, for a direction. */
function measure(from: Slot, to: Slot, dir: Direction): { ahead: number; aside: number } {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (dir === 'right') return { ahead: dx, aside: Math.abs(dy) };
  if (dir === 'left') return { ahead: -dx, aside: Math.abs(dy) };
  if (dir === 'down') return { ahead: dy, aside: Math.abs(dx) };
  return { ahead: -dy, aside: Math.abs(dx) };
}

/** The nearest of `candidates` in the direction from the place `from`; null — none lies that way. */
export function nearest(slots: readonly Slot[], from: number, candidates: readonly number[], dir: Direction): number | null {
  const start = slots[from];
  if (!start) return null;
  let best: number | null = null;
  let bestScore = Infinity;
  let bestAside = Infinity;
  for (const i of candidates) {
    const to = slots[i];
    if (i === from || !to) continue;
    const { ahead, aside } = measure(start, to, dir);
    if (ahead <= 0) continue;
    // A step aside counts twice a step ahead: the way the arrow points comes first.
    const score = ahead + 2 * aside;
    if (score < bestScore || (score === bestScore && aside < bestAside)) {
      best = i;
      bestScore = score;
      bestAside = aside;
    }
  }
  return best;
}
