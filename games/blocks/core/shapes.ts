// Shapes, their orientations (rotations and mirror images) and drawing a random piece.
import { BLOCKS, type ShapeId } from '../config.ts';
import { nextInt } from '../../../shared/core/rng.ts';

export type Cell = readonly [row: number, col: number];
export type Cells = readonly Cell[];

export const SHAPE_IDS = Object.keys(BLOCKS.shapes) as ShapeId[];

/** Moves cells so that the smallest row and column are 0, in a stable order. */
export function normalize(cells: Cells): Cell[] {
  const minRow = Math.min(...cells.map(([r]) => r));
  const minCol = Math.min(...cells.map(([, c]) => c));
  return cells
    .map(([r, c]) => [r - minRow, c - minCol] as const)
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}

export function key(cells: Cells): string {
  return normalize(cells)
    .map(([r, c]) => `${r},${c}`)
    .join(';');
}

/** A quarter turn clockwise. */
export function rotate(cells: Cells): Cell[] {
  return normalize(cells.map(([r, c]) => [c, -r] as const));
}

export function mirror(cells: Cells): Cell[] {
  return normalize(cells.map(([r, c]) => [r, -c] as const));
}

/** Distinct quarter turns of a shape (without mirror images). */
export function rotations(cells: Cells): Cell[][] {
  const out: Cell[][] = [];
  const seen = new Set<string>();
  let current = normalize(cells);
  for (let i = 0; i < 4; i++) {
    const k = key(current);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(current);
    }
    current = rotate(current);
  }
  return out;
}

/** Distinct orientations: quarter turns of the shape and of its mirror image. */
export function orientations(cells: Cells): Cell[][] {
  const out: Cell[][] = [];
  const seen = new Set<string>();
  for (const variant of [...rotations(cells), ...rotations(mirror(cells))]) {
    const k = key(variant);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(variant);
    }
  }
  return out;
}

export interface Piece {
  /** Unique within a game. */
  id: number;
  shape: ShapeId;
  cells: Cell[];
}

/** A random shape by weight, in a random orientation. */
export function drawPiece(state: number, id: number): { piece: Piece; state: number } {
  const total = SHAPE_IDS.reduce((sum, s) => sum + BLOCKS.shapes[s].weight, 0);
  const pick = nextInt(state, total);
  let rest = pick.value;
  let shape: ShapeId = SHAPE_IDS[0] ?? 'dot';
  for (const s of SHAPE_IDS) {
    const w = BLOCKS.shapes[s].weight;
    if (rest < w) {
      shape = s;
      break;
    }
    rest -= w;
  }
  const variants = orientations(BLOCKS.shapes[shape].cells);
  const turn = nextInt(pick.state, variants.length);
  const cells = variants[turn.value] ?? normalize(BLOCKS.shapes[shape].cells);
  return { piece: { id, shape, cells }, state: turn.state };
}
