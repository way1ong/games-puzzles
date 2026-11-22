import { BLOCKS } from '../config.ts';

/** Points for one move: every placed cell, plus lineBonus × k × k for k lines cleared together. */
export function movePoints(cellsPlaced: number, linesCleared: number): number {
  return cellsPlaced * BLOCKS.pointsPerCell + BLOCKS.lineBonus * linesCleared * linesCleared;
}
