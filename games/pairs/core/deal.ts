// A deal that can always be won (docs/pairs/SPEC.md, "Як грати"): first a way to an empty table is found for the
// places alone — two places free at the same moment are taken off together, again and again — and then each such
// pair gets one picture. The way found is a solution, so every deal has one. The same way gives the shuffle: the
// pictures still on the table are laid again over a new way for the places that hold them. Pure, no DOM.
import { PAIRS, PICTURES } from '../config.ts';
import { makeRand, shuffled, type Rand } from './rand.ts';
import { freePlaces, type Table } from './table.ts';

export type Pair = readonly [number, number];

/**
 * A way to take every present tile off in pairs, each pair free at its turn; null if none was found within
 * `tries` attempts. A random choice of pairs with going back, so different seeds give different ways.
 */
export function wayToEmpty(table: Table, present: readonly boolean[], rand: Rand, tries: number = PAIRS.dealTries): Pair[] | null {
  const now = [...present];
  const order: Pair[] = [];
  let budget = tries * Math.max(1, present.filter(Boolean).length);
  const go = (left: number): boolean => {
    if (left === 0) return true;
    if (--budget < 0) return false;
    const free = freePlaces(table, now);
    if (free.length < 2) return false;
    // A few pairs of free places in a random order; tiles of upper layers first, so stacks open up.
    const candidates: Pair[] = [];
    const picks = shuffled(rand, free).sort((a, b) => table.slots[b]!.z - table.slots[a]!.z);
    for (let i = 0; i < picks.length && candidates.length < 6; i++) {
      for (let j = i + 1; j < picks.length && candidates.length < 6; j++) candidates.push([picks[i]!, picks[j]!]);
    }
    for (const [a, b] of shuffled(rand, candidates.slice(0, 3)).concat(candidates.slice(3))) {
      now[a] = false;
      now[b] = false;
      order.push([a, b]);
      if (go(left - 2)) return true;
      order.pop();
      now[a] = true;
      now[b] = true;
      if (budget < 0) return false;
    }
    return false;
  };
  return go(present.filter(Boolean).length) ? order : null;
}

/**
 * Pictures for pairs (picture indices into PICTURES): as few pictures as possible, each at most PAIRS.copies
 * times, chosen and mixed by the seed.
 */
export function picturesFor(pairs: number, rand: Rand): number[] {
  const perPicture = PAIRS.copies / 2;
  const count = Math.ceil(pairs / perPicture);
  if (count > PICTURES.length) throw new Error(`${pairs} pairs need ${count} pictures, there are ${PICTURES.length}`);
  const chosen = shuffled(
    rand,
    PICTURES.map((_, i) => i),
  ).slice(0, count);
  const list = chosen.flatMap((p) => Array.from({ length: perPicture }, () => p)).slice(0, pairs);
  return shuffled(rand, list);
}

/** The picture on each place (-1 — no tile), and the way the deal was built (a solution). */
export interface Deal {
  kinds: number[];
  way: Pair[];
}

/** A deal of a whole layout from a seed; null if no way was found (the caller takes the next seed). */
export function dealOf(table: Table, seed: number): Deal | null {
  const rand = makeRand(seed);
  const present = table.slots.map(() => true);
  const way = wayToEmpty(table, present, rand);
  if (!way) return null;
  const pictures = picturesFor(way.length, rand);
  const kinds = table.slots.map(() => -1);
  way.forEach(([a, b], k) => {
    kinds[a] = pictures[k]!;
    kinds[b] = pictures[k]!;
  });
  return { kinds, way };
}

/**
 * The pictures on the table laid again so that the rest can be won: a new way for the places that hold tiles,
 * and the same pictures (in pairs) over it. null if no way was found.
 */
export function reshuffle(table: Table, kinds: readonly number[], present: readonly boolean[], seed: number): number[] | null {
  const rand = makeRand(seed);
  const way = wayToEmpty(table, present, rand);
  if (!way) return null;
  // The pictures on the table, two by two: every picture is on the table an even number of times.
  const count = new Map<number, number>();
  present.forEach((here, i) => here && count.set(kinds[i]!, (count.get(kinds[i]!) ?? 0) + 1));
  const pairs: number[] = [];
  for (const [kind, n] of count) for (let k = 0; k < n / 2; k++) pairs.push(kind);
  const order = shuffled(rand, pairs);
  const next = [...kinds];
  way.forEach(([a, b], k) => {
    next[a] = order[k]!;
    next[b] = order[k]!;
  });
  return next;
}
