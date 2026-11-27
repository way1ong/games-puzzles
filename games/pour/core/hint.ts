// The hint and the dead end (docs/pour/SPEC.md, "Допомога", "Кожен рівень проходиться"): the next pour of a way to
// the end; while the player follows the hints, the same way is kept, so it never leads round in circles. With no way
// left, how many pours back there is one. Pure.
import { POUR } from '../config.ts';
import type { Bottles, Move } from './bottles.ts';
import { pour } from './bottles.ts';
import { takenBack, type PourPlay } from './play.ts';
import { placeKey, solve } from './solve.ts';

/** A way to the end: the position before each of its pours. */
export interface PourWay {
  keys: string[];
  moves: Move[];
}

export type HintResult =
  | { kind: 'move'; move: Move; way: PourWay }
  /** No way to the end from here; `back` — pours to take back to a position that has one. */
  | { kind: 'stuck'; back: number | null }
  /** The solver stopped at its limit: not known. */
  | { kind: 'unknown' };

export function wayFrom(start: Bottles, moves: readonly Move[]): PourWay {
  const keys: string[] = [];
  let bottles = start;
  for (const m of moves) {
    keys.push(placeKey(bottles));
    bottles = pour(bottles, m, POUR.capacity);
  }
  return { keys, moves: [...moves] };
}

/** The next pour when the bottles are on the way. */
export function nextOnWay(way: PourWay | null, bottles: Bottles): Move | null {
  if (!way) return null;
  const i = way.keys.indexOf(placeKey(bottles));
  return i >= 0 ? way.moves[i]! : null;
}

/** Pours to take back to a position with a way to the end; null — none (it cannot happen from a solvable deal). */
export function stepsBack(play: PourPlay): number | null {
  for (let k = 1; k <= play.history.length; k++) {
    if (solve(takenBack(play, k), POUR.capacity, POUR.solveLimit).moves) return k;
  }
  return null;
}

export function findHint(play: PourPlay, way: PourWay | null): HintResult {
  const known = nextOnWay(way, play.bottles);
  if (known && way) return { kind: 'move', move: known, way };
  const r = solve(play.bottles, POUR.capacity, POUR.solveLimit);
  if (r.moves?.length) {
    const fresh = wayFrom(play.bottles, r.moves);
    return { kind: 'move', move: fresh.moves[0]!, way: fresh };
  }
  if (r.capped || r.moves) return { kind: 'unknown' };
  return { kind: 'stuck', back: stepsBack(play) };
}

/** After a pour: is there still a way to the end? */
export function hasWay(bottles: Bottles): boolean | null {
  const r = solve(bottles, POUR.capacity, POUR.solveLimit);
  return r.moves ? true : r.capped ? null : false;
}
