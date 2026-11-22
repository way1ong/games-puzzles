// Every number of the Blocks rules lives here (docs/blocks/SPEC.md). (C) = Claude's proposal within the
// approved plan of 22.11; change it here, not in the logic.

export type ShapeId =
  | 'dot'
  | 'i2'
  | 'i3'
  | 'corner3'
  | 'i4'
  | 'square2'
  | 't4'
  | 'zigzag4'
  | 'l4'
  | 'i5'
  | 'corner5'
  | 'square3';

export const BLOCKS = {
  /** Board side, in cells (approved 22.11). */
  boardSize: 8,
  /** Pieces offered at a time (C). */
  piecesPerRound: 3,
  /** Points for every placed cell (C). */
  pointsPerCell: 1,
  /** Points for k lines cleared by one move: lineBonus × k × k (C). */
  lineBonus: 10,
  /** Rounds in the daily puzzle (C). */
  dailyRounds: 20,
  /**
   * Shapes as cells [row, col] in one orientation, and how often each comes (relative weights, C).
   * Our own set — not taken from any particular game.
   */
  shapes: {
    dot: { cells: [[0, 0]], weight: 4 },
    i2: { cells: [[0, 0], [0, 1]], weight: 6 },
    i3: { cells: [[0, 0], [0, 1], [0, 2]], weight: 6 },
    corner3: { cells: [[0, 0], [1, 0], [1, 1]], weight: 6 },
    i4: { cells: [[0, 0], [0, 1], [0, 2], [0, 3]], weight: 4 },
    square2: { cells: [[0, 0], [0, 1], [1, 0], [1, 1]], weight: 5 },
    t4: { cells: [[0, 0], [0, 1], [0, 2], [1, 1]], weight: 4 },
    zigzag4: { cells: [[0, 1], [0, 2], [1, 0], [1, 1]], weight: 3 },
    l4: { cells: [[0, 0], [1, 0], [2, 0], [2, 1]], weight: 4 },
    i5: { cells: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]], weight: 2 },
    corner5: { cells: [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]], weight: 3 },
    square3: {
      cells: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]],
      weight: 2,
    },
  } satisfies Record<ShapeId, { cells: [number, number][]; weight: number }>,
} as const;
