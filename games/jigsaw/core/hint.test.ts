import { describe, expect, it } from 'vitest';
import { hintPiece } from './hint.ts';

// a 6 x 4 board; the tray in index order unless a test says otherwise
const all = Array.from({ length: 24 }, (_, i) => i);

describe('the hint', () => {
  it('on an empty board suggests a corner — the first in the tray', () => {
    expect(hintPiece(6, 4, new Set(), all)).toBe(0);
    expect(hintPiece(6, 4, new Set(), [8, 2, 23, 5])).toBe(23);
  });

  it('suggests a piece next to those in place, a border piece before one from inside', () => {
    // piece 1 is in place: its neighbours 0 (corner), 2 (border) and 7 (inside)
    expect(hintPiece(6, 4, new Set([1]), [7, 2, 0, 20])).toBe(0);
    expect(hintPiece(6, 4, new Set([1]), [7, 2, 20])).toBe(2);
    expect(hintPiece(6, 4, new Set([1]), [7, 20])).toBe(7);
  });

  it('prefers the piece that touches the most pieces in place', () => {
    // 7 touches 1, 6 and 8 when they are in place; 2 touches only 1
    expect(hintPiece(6, 4, new Set([1, 6, 8]), [2, 7, 0])).toBe(7);
  });

  it('skips pieces in place, and has nothing to suggest at the end', () => {
    expect(hintPiece(6, 4, new Set([0]), [0, 1])).toBe(1);
    expect(hintPiece(6, 4, new Set(all), all)).toBeNull();
  });
});
