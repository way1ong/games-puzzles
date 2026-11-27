// How hard a deal is (docs/pour/SPEC.md, "Три шляхи"): how often a player who pours at random — never back to a
// position seen — reaches the end. Easy deals: almost always; hard: rarely. Pure; randomness only from the seed.
import { nextInt } from '../../../shared/core/rng.ts';
import { isSolved, keyOf, pour, usefulMoves, type Bottles } from './bottles.ts';

export interface Players {
  /** Random players per deal. */
  players: number;
  /** Pours a player makes at most. */
  maxMoves: number;
}

/** One random player: true when it reaches the end. */
function plays(start: Bottles, capacity: number, maxMoves: number, state: number): { won: boolean; state: number } {
  let bottles = start;
  let s = state;
  const seen = new Set<string>([keyOf(bottles)]);
  for (let m = 0; m < maxMoves; m++) {
    if (isSolved(bottles, capacity)) return { won: true, state: s };
    const next = usefulMoves(bottles, capacity)
      .map((move) => pour(bottles, move, capacity))
      .filter((b) => !seen.has(keyOf(b)));
    if (!next.length) return { won: false, state: s };
    const d = nextInt(s, next.length);
    s = d.state;
    bottles = next[d.value]!;
    seen.add(keyOf(bottles));
  }
  return { won: isSolved(bottles, capacity), state: s };
}

/** The share of random players who reach the end, 0…1. */
export function winRate(start: Bottles, capacity: number, rule: Players, state: number): number {
  let won = 0;
  let s = state;
  for (let p = 0; p < rule.players; p++) {
    const r = plays(start, capacity, rule.maxMoves, s);
    s = r.state;
    if (r.won) won++;
  }
  return won / rule.players;
}
