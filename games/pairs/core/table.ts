// The table: which places touch or cover which, and which tiles are free. A tile is free when nothing lies
// on it — not even a corner of a tile above — and its left or its right side is open: no tile of its own
// layer right beside it (docs/pairs/SPEC.md, "Як грати"). Pure, no DOM.
import type { Slot } from './layouts.ts';

export interface Table {
  slots: readonly Slot[];
  /** For each place: the places above it that lie on it (even by a corner). */
  above: readonly (readonly number[])[];
  /** For each place: the places of its layer right beside it on the left, on the right. */
  left: readonly (readonly number[])[];
  right: readonly (readonly number[])[];
}

/** Two places of 2 × 2 half tiles overlap when they are less than a whole tile apart both ways. */
const overlap = (a: Slot, b: Slot) => Math.abs(a.x - b.x) < 2 && Math.abs(a.y - b.y) < 2;

export function tableOf(slots: readonly Slot[]): Table {
  const above = slots.map((s) => slots.flatMap((t, j) => (t.z > s.z && overlap(s, t) ? [j] : [])));
  const beside = (s: Slot, t: Slot, side: -1 | 1) => t.z === s.z && t.x === s.x + 2 * side && Math.abs(t.y - s.y) < 2;
  const left = slots.map((s) => slots.flatMap((t, j) => (beside(s, t, -1) ? [j] : [])));
  const right = slots.map((s) => slots.flatMap((t, j) => (beside(s, t, 1) ? [j] : [])));
  return { slots, above, left, right };
}

/** Whether the tile on a place is free; `present` — which places still hold a tile. */
export function isFree(table: Table, present: readonly boolean[], i: number): boolean {
  if (!present[i]) return false;
  const gone = (j: number) => !present[j];
  return table.above[i]!.every(gone) && (table.left[i]!.every(gone) || table.right[i]!.every(gone));
}

/** The places whose tiles are free now. */
export function freePlaces(table: Table, present: readonly boolean[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < table.slots.length; i++) if (isFree(table, present, i)) out.push(i);
  return out;
}

/** Pairs that can be taken off now: for each picture, every two of its free tiles make one (counted once). */
export function pairsNow(table: Table, kinds: readonly number[], present: readonly boolean[]): number {
  const free = new Map<number, number>();
  for (const i of freePlaces(table, present)) free.set(kinds[i]!, (free.get(kinds[i]!) ?? 0) + 1);
  let n = 0;
  for (const count of free.values()) n += Math.floor(count / 2);
  return n;
}
