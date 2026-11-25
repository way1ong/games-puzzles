// A stroke keeps to its row or column (docs/nonograms/SPEC.md, "Керування"): the first cell reached decides the
// way; the cells run from the start to the finger's place on that line, back or forth.
import { describe, expect, it } from 'vitest';
import { pathCells, wayOf } from './path.ts';

const S = 10;
const at = (row: number, col: number) => row * S + col;

describe('a stroke', () => {
  it('goes across or down by the first cell it reaches; a diagonal step by the finger’s own move', () => {
    expect(wayOf(S, at(2, 2), at(2, 2))).toBeNull();
    expect(wayOf(S, at(2, 2), at(2, 3))).toBe('row');
    expect(wayOf(S, at(2, 2), at(1, 2))).toBe('col');
    expect(wayOf(S, at(2, 2), at(4, 3))).toBe('col');
    expect(wayOf(S, at(2, 2), at(3, 3), 9, 4)).toBe('row');
    expect(wayOf(S, at(2, 2), at(3, 3), 4, 9)).toBe('col');
  });

  it('runs from the start to the finger’s place on its line, keeping to the line when the finger drifts', () => {
    expect(pathCells(S, at(2, 2), at(7, 7), null)).toEqual([at(2, 2)]);
    expect(pathCells(S, at(2, 2), at(2, 5), 'row')).toEqual([at(2, 2), at(2, 3), at(2, 4), at(2, 5)]);
    expect(pathCells(S, at(2, 2), at(4, 0), 'row')).toEqual([at(2, 2), at(2, 1), at(2, 0)]);
    expect(pathCells(S, at(2, 2), at(5, 3), 'col')).toEqual([at(2, 2), at(3, 2), at(4, 2), at(5, 2)]);
    expect(pathCells(S, at(2, 2), at(0, 9), 'col')).toEqual([at(2, 2), at(1, 2), at(0, 2)]);
    expect(pathCells(S, at(2, 2), at(9, 2), 'row')).toEqual([at(2, 2)]);
  });
});
