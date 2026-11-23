// Seeded random numbers for every game: the same seed always gives the same draws (tests, undo, daily puzzles).
// The state is one unsigned 32-bit number, so it is saved with the game. Algorithm: mulberry32.

export interface Draw {
  value: number; // 0 <= value < 1
  state: number;
}

export function nextRandom(state: number): Draw {
  const a = (state + 0x6d2b79f5) >>> 0;
  let t = a;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return { value: ((t ^ (t >>> 14)) >>> 0) / 4294967296, state: a };
}

/** A whole number 0 <= n < max, and the next state. */
export function nextInt(state: number, max: number): { value: number; state: number } {
  const draw = nextRandom(state);
  return { value: Math.floor(draw.value * max), state: draw.state };
}

/** A 32-bit seed from text (FNV-1a), e.g. "way1ong-blocks:daily:2026-11-22". */
export function seedFromText(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}
