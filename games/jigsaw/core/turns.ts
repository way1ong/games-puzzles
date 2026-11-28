// Turned pieces (docs/jigsaw/SPEC.md, "Поворот частинок"; decision of 28.11: a switch in the menu, off by default):
// every piece of a puzzle starts turned by 0, 1, 2 or 3 quarters clockwise — from the puzzle's seed, so the same
// puzzle lies the same way for everybody; a turn adds a quarter. Pure.
import { nextInt } from '../../../shared/core/rng.ts';
import { partSeed } from './seeds.ts';

/** Quarters in a whole turn: a piece's turn is 0 (standing right) … 3. */
export const QUARTERS = 4;

/** How each of `count` pieces of the puzzle played from `seed` lies at the start, in quarters clockwise. */
export function startTurns(count: number, seed: number): number[] {
  const out: number[] = [];
  let state = partSeed(seed, 'turns');
  for (let i = 0; i < count; i++) {
    const r = nextInt(state, QUARTERS);
    state = r.state;
    out.push(r.value);
  }
  return out;
}

/** A quarter more, clockwise. */
export const turnedOnce = (turn: number): number => (turn + 1) % QUARTERS;

/** A list of turns of `count` pieces that holds together: whole quarters, 0 … 3. */
export function validTurns(turns: unknown, count: number): turns is number[] {
  return Array.isArray(turns) && turns.length === count && turns.every((t) => Number.isInteger(t) && t >= 0 && t < QUARTERS);
}
