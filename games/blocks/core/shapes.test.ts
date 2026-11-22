import { describe, expect, it } from 'vitest';
import { BLOCKS } from '../config.ts';
import { drawPiece, key, orientations, rotate, rotations, SHAPE_IDS } from './shapes.ts';

describe('shapes', () => {
  it('counts distinct quarter turns', () => {
    expect(rotations(BLOCKS.shapes.dot.cells)).toHaveLength(1);
    expect(rotations(BLOCKS.shapes.square2.cells)).toHaveLength(1);
    expect(rotations(BLOCKS.shapes.i2.cells)).toHaveLength(2);
    expect(rotations(BLOCKS.shapes.t4.cells)).toHaveLength(4);
    expect(rotations(BLOCKS.shapes.zigzag4.cells)).toHaveLength(2);
    expect(rotations(BLOCKS.shapes.l4.cells)).toHaveLength(4);
  });

  it('adds mirror images where they differ', () => {
    expect(orientations(BLOCKS.shapes.zigzag4.cells)).toHaveLength(4);
    expect(orientations(BLOCKS.shapes.l4.cells)).toHaveLength(8);
    expect(orientations(BLOCKS.shapes.square3.cells)).toHaveLength(1);
  });

  it('four quarter turns come back to the start', () => {
    const start = BLOCKS.shapes.corner5.cells;
    expect(key(rotate(rotate(rotate(rotate(start)))))).toBe(key(start));
  });

  it('draws every shape over many pieces, with its own cell count', () => {
    const seen = new Set<string>();
    let s = 1;
    for (let i = 0; i < 2000; i++) {
      const d = drawPiece(s, i);
      seen.add(d.piece.shape);
      expect(d.piece.cells).toHaveLength(BLOCKS.shapes[d.piece.shape].cells.length);
      s = d.state;
    }
    expect([...seen].sort()).toEqual([...SHAPE_IDS].sort());
  });
});
