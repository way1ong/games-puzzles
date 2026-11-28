// The hint (docs/jigsaw/SPEC.md, "Допомога"): which piece to put next, as a person would — one that touches the most
// pieces already in place; of those, a corner first, then a border piece; on an empty board, a corner. Among equals,
// the one that comes first in the tray. Pure.
import { kindOf, neighboursOf } from './cut.ts';

const KIND_ORDER = { corner: 0, edge: 1, inner: 2 } as const;

/** The piece to suggest from the tray (in the tray's order); null when the tray is empty. */
export function hintPiece(cols: number, rows: number, placed: ReadonlySet<number>, tray: readonly number[]): number | null {
  let best: number | null = null;
  let bestTouch = -1;
  let bestKind = Infinity;
  for (const piece of tray) {
    if (placed.has(piece)) continue;
    const touch = neighboursOf(cols, rows, piece).filter((n) => placed.has(n)).length;
    const kind = KIND_ORDER[kindOf(cols, rows, piece)];
    if (touch > bestTouch || (touch === bestTouch && kind < bestKind)) {
      best = piece;
      bestTouch = touch;
      bestKind = kind;
    }
  }
  return best;
}
