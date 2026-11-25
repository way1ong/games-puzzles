// Can the table still be cleared, and how? A search over the pairs that can be taken off, going back from dead
// ends and remembering positions already found hopeless. A picture whose every tile left is free is taken off
// at once: no later move can need those tiles, and taking tiles off never covers another. It serves the hint
// (a pair that keeps the game winnable) and "it cannot be won from here any more" (docs/pairs/SPEC.md). Pure.
import { PAIRS } from '../config.ts';
import type { Pair } from './deal.ts';
import { freePlaces, type Table } from './table.ts';

/** A way to an empty table; null — none exists; 'unknown' — the search ran out of steps. */
export type Solved = Pair[] | null | 'unknown';

export function solve(table: Table, kinds: readonly number[], present: readonly boolean[], steps: number = PAIRS.solveSteps): Solved {
  const now = [...present];
  const order: Pair[] = [];
  const hopeless = new Set<string>();
  let left = steps;

  const go = (tiles: number): boolean | 'unknown' => {
    if (tiles === 0) return true;
    if (--left < 0) return 'unknown';
    const key = now.map((p) => (p ? '1' : '0')).join('');
    if (hopeless.has(key)) return false;
    const free = new Map<number, number[]>();
    for (const i of freePlaces(table, now)) free.set(kinds[i]!, [...(free.get(kinds[i]!) ?? []), i]);
    const remaining = new Map<number, number>();
    now.forEach((p, i) => p && remaining.set(kinds[i]!, (remaining.get(kinds[i]!) ?? 0) + 1));

    const tryPairs = (pairs: Pair[]): boolean | 'unknown' => {
      for (const [a, b] of pairs) {
        now[a] = false;
        now[b] = false;
      }
      order.push(...pairs);
      const result = go(tiles - 2 * pairs.length);
      if (result === true) return true;
      order.length -= pairs.length;
      for (const [a, b] of pairs) {
        now[a] = true;
        now[b] = true;
      }
      return result;
    };

    // Every tile left of a picture is free: take them all, no choice to make.
    for (const [kind, list] of free) {
      if (list.length >= 2 && list.length === remaining.get(kind)) {
        const pairs: Pair[] = [];
        for (let t = 0; t + 1 < list.length; t += 2) pairs.push([list[t]!, list[t + 1]!]);
        const result = tryPairs(pairs);
        if (result !== false) return result;
        hopeless.add(key);
        return false;
      }
    }
    // Otherwise every pair of free tiles of one picture, upper tiles first (they open the most).
    const moves: Pair[] = [];
    for (const list of free.values()) {
      for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) moves.push([list[i]!, list[j]!]);
    }
    const height = ([a, b]: Pair) => table.slots[a]!.z + table.slots[b]!.z;
    moves.sort((m, n) => height(n) - height(m));
    for (const move of moves) {
      const result = tryPairs([move]);
      if (result !== false) return result;
    }
    hopeless.add(key);
    return false;
  };

  const result = go(now.filter(Boolean).length);
  return result === true ? order : result === 'unknown' ? 'unknown' : null;
}
