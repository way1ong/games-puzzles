// How hard a deal is (docs/pairs/SPEC.md, "Розклади й рівні"; decision of 25.11, «Пари дуже прості»): how often a
// player who takes any matching pair of free tiles at random clears the table. A deal with few traps is cleared
// nearly always; one where the wrong pair of four alike, or a pair taken too early, closes the way — rarely. The random
// player draws from a seed, so the same deal gets the same rate on every device. Pure.
import { makeRand, type Rand } from './rand.ts';
import { freePlaces, type Table } from './table.ts';

/** One random play to the end: true if it clears the table. */
function clears(table: Table, kinds: readonly number[], rand: Rand): boolean {
  const present = kinds.map((kind) => kind >= 0);
  let left = present.filter(Boolean).length;
  while (left > 0) {
    const free = freePlaces(table, present);
    const pairs: [number, number][] = [];
    for (let a = 0; a < free.length; a++) {
      for (let b = a + 1; b < free.length; b++) if (kinds[free[a]!] === kinds[free[b]!]) pairs.push([free[a]!, free[b]!]);
    }
    if (pairs.length === 0) return false;
    const [x, y] = pairs[rand.int(pairs.length)]!;
    present[x] = false;
    present[y] = false;
    left -= 2;
  }
  return true;
}

/** The share (0…1) of `plays` random plays from a full table that clear it. */
export function clearRate(table: Table, kinds: readonly number[], plays: number, seed: number): number {
  const rand = makeRand(seed);
  let won = 0;
  for (let k = 0; k < plays; k++) if (clears(table, kinds, rand)) won += 1;
  return won / plays;
}
