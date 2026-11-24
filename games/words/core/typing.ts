// Making a word with the keys of a keyboard. Each key picks a free tile of the wheel with that letter. A
// Hungarian two-character tile (cs, sz…) is typed with its two keys; when the first key has a tile of its own on
// the wheel too (s and sz), that tile is picked at once and gives way to the pair if the next key makes one.

export interface Typing {
  /** The wheel's tiles picked, in order (indices into the wheel). */
  selected: readonly number[];
  /** The last key while it may still begin a two-character tile, with the index of its own tile picked (or -1). */
  pending: { key: string; index: number } | null;
}

/** The typing after one more key (one character, lower case); the same object when the key does nothing. */
export function typeKey(wheel: readonly string[], typing: Typing, key: string): Typing {
  const { selected, pending } = typing;
  const free = (tile: string, taken: readonly number[]) => wheel.findIndex((t, i) => t === tile && !taken.includes(i));
  if (pending) {
    const last = selected[selected.length - 1];
    const kept = pending.index >= 0 && last === pending.index ? selected.slice(0, -1) : selected;
    const pair = free(pending.key + key, kept);
    if (pair >= 0) return { selected: [...kept, pair], pending: null };
  }
  const startsPair = wheel.some((t, i) => t.length > 1 && t.startsWith(key) && !selected.includes(i));
  const single = free(key, selected);
  if (single >= 0) return { selected: [...selected, single], pending: startsPair ? { key, index: single } : null };
  if (startsPair) return { selected, pending: { key, index: -1 } };
  return typing;
}
