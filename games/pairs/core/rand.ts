// A stream of seeded random numbers (shared/core/rng.ts): the same seed gives the same draws, so the same layout,
// the same pictures and the same shuffles.
import { nextInt } from '../../../shared/core/rng.ts';

export interface Rand {
  /** A whole number 0 <= n < max. */
  int(max: number): number;
}

export function makeRand(seed: number): Rand {
  let state = seed >>> 0;
  return {
    int(max) {
      const draw = nextInt(state, max);
      state = draw.state;
      return draw.value;
    },
  };
}

/** The same items in a random order (a new array). */
export function shuffled<T>(rand: Rand, items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = rand.int(i + 1);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}
