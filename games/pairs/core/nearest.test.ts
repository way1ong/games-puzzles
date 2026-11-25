import { describe, expect, it } from 'vitest';
import type { Slot } from './layouts.ts';
import { nearest } from './nearest.ts';

describe('arrow keys', () => {
  // A row of three tiles, a fourth half a tile lower on the right, and one above the middle.
  const slots: Slot[] = [
    { x: 0, y: 2, z: 0 },
    { x: 2, y: 2, z: 0 },
    { x: 4, y: 2, z: 0 },
    { x: 6, y: 3, z: 0 },
    { x: 2, y: 0, z: 0 },
  ];
  const all = slots.map((_, i) => i);

  it('goes to the next tile straight ahead', () => {
    expect(nearest(slots, 0, all, 'right')).toBe(1);
    expect(nearest(slots, 2, all, 'left')).toBe(1);
    expect(nearest(slots, 1, all, 'up')).toBe(4);
    expect(nearest(slots, 4, all, 'down')).toBe(1);
  });

  it('skips tiles that are not candidates (not free) and reaches tiles half a row aside', () => {
    expect(nearest(slots, 0, [0, 2, 3], 'right')).toBe(2);
    expect(nearest(slots, 2, all, 'right')).toBe(3);
  });

  it('stays when nothing lies that way', () => {
    expect(nearest(slots, 3, all, 'right')).toBeNull();
    expect(nearest(slots, 4, all, 'up')).toBeNull();
    expect(nearest(slots, 9, all, 'up')).toBeNull();
  });

  it('prefers the tile straight ahead to a nearer one aside', () => {
    const s: Slot[] = [
      { x: 0, y: 0, z: 0 },
      { x: 2, y: 3, z: 0 },
      { x: 6, y: 0, z: 0 },
    ];
    expect(nearest(s, 0, [1, 2], 'right')).toBe(2);
  });
});
