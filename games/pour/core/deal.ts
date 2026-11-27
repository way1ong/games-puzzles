// Deals from a seed (docs/pour/SPEC.md, "Як грати"): every colour's layers shuffled into as many bottles as there are
// colours, then the empty bottles; no bottle starts full of one colour. Which paints of the box a deal uses is drawn
// from the seed too, so the first levels are not always the same few colours. Pure; randomness only from the seed.
import { nextInt } from '../../../shared/core/rng.ts';
import { isClosed, type Bottle, type Bottles, type Colour } from './bottles.ts';

export interface Dealt {
  bottles: Bottles;
  /** The paint of each colour: an index into the box of paints (art/palette.ts). */
  paints: number[];
  /** The generator's state after the deal (the next deal from the same seed). */
  state: number;
}

/** Shuffles a list with the generator (Fisher–Yates). */
function shuffled<T>(items: readonly T[], state: number): { items: T[]; state: number } {
  const out = items.slice();
  let s = state;
  for (let i = out.length - 1; i > 0; i--) {
    const d = nextInt(s, i + 1);
    s = d.state;
    [out[i], out[d.value]] = [out[d.value]!, out[i]!];
  }
  return { items: out, state: s };
}

export function deal(colours: number, empty: number, capacity: number, paintsInBox: number, state: number): Dealt {
  if (colours > paintsInBox) throw new Error(`${colours} colours, but ${paintsInBox} paints in the box`);
  // one colour would always fill its bottle: no deal could start unsolved
  if (colours < 2) throw new Error('A deal needs two colours at least');
  const layers: Colour[] = [];
  for (let c = 0; c < colours; c++) for (let k = 0; k < capacity; k++) layers.push(c);
  let s = state;
  for (;;) {
    const mixed = shuffled(layers, s);
    s = mixed.state;
    const full: Bottle[] = Array.from({ length: colours }, (_, i) => mixed.items.slice(i * capacity, (i + 1) * capacity));
    if (full.some((b) => isClosed(b, capacity))) continue;
    const box = shuffled(
      Array.from({ length: paintsInBox }, (_, i) => i),
      s,
    );
    return { bottles: [...full, ...Array.from({ length: empty }, () => [])], paints: box.items.slice(0, colours), state: box.state };
  }
}
