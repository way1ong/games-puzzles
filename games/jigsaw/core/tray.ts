// The order of the tray (docs/jigsaw/SPEC.md, "Як грати"): the corner and border pieces first — people put the frame
// together first — then the pieces from inside; each group in an order from the seed. Pure.
import { nextInt } from '../../../shared/core/rng.ts';
import { kindOf } from './cut.ts';

function shuffled(items: readonly number[], seed: number): { items: number[]; state: number } {
  const out = items.slice();
  let state = seed >>> 0;
  for (let i = out.length - 1; i > 0; i--) {
    const draw = nextInt(state, i + 1);
    state = draw.state;
    const j = draw.value;
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return { items: out, state };
}

/** Every piece of a cols x rows puzzle in the order of its tray. */
export function trayOrder(cols: number, rows: number, seed: number): number[] {
  const all = Array.from({ length: cols * rows }, (_, i) => i);
  const frame = all.filter((p) => kindOf(cols, rows, p) !== 'inner');
  const inside = all.filter((p) => kindOf(cols, rows, p) === 'inner');
  const first = shuffled(frame, seed);
  return [...first.items, ...shuffled(inside, first.state).items];
}
