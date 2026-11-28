// Where a puzzle's randomness comes from (docs/jigsaw/SPEC.md): one seed per puzzle — a new one for each free game,
// the date's for the puzzle of the day — and from it a seed of its own for each part (the cut, the tray, the things in
// the room, the picture drawn for "Any", how the pieces lie turned), so the parts do not go together. Pure.
import { nextInt, seedFromText } from '../../../shared/core/rng.ts';

export type Part = 'cut' | 'tray' | 'things' | 'picture' | 'turns';

/** The seed of one part of the puzzle played from `seed`. */
export function partSeed(seed: number, part: Part): number {
  return seedFromText(`way1ong-jigsaw:${part}:${seed >>> 0}`);
}

/** The seed of the puzzle of the day: the same for everybody on that date ("YYYY-MM-DD"). */
export function dailySeed(date: string): number {
  return seedFromText(`way1ong-jigsaw:daily:${date}`);
}

/** One of `count` things from a seed — through the generator, not a remainder (.claude/rules/game-logic.md). */
export function pick(seed: number, count: number): number {
  return nextInt(seed, count).value;
}

/** The picture of a puzzle whose picture was not chosen (the day's, or "Any"). */
export function pictureOf(seed: number, pictures: number): number {
  return pick(partSeed(seed, 'picture'), pictures);
}
