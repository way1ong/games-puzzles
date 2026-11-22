import { describe, expect, it } from 'vitest';
import { BLOCKS } from '../config.ts';
import { movePoints } from './scoring.ts';

describe('scoring', () => {
  it('pays for cells and more for several lines at once', () => {
    expect(movePoints(4, 0)).toBe(4 * BLOCKS.pointsPerCell);
    expect(movePoints(4, 1)).toBe(4 * BLOCKS.pointsPerCell + BLOCKS.lineBonus);
    expect(movePoints(4, 2)).toBe(4 * BLOCKS.pointsPerCell + 4 * BLOCKS.lineBonus);
    expect(movePoints(4, 3)).toBe(4 * BLOCKS.pointsPerCell + 9 * BLOCKS.lineBonus);
  });
});
