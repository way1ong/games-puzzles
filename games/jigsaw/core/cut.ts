// How a picture is cut (docs/jigsaw/SPEC.md, "Частинки"): a grid of cols x rows pieces, numbered row by row from the
// top left. Every edge between two pieces has one knob sticking out of one of them into the other — which way, where
// along the edge and how large come from the seed; the picture's own border is straight.
import { nextRandom } from '../../../shared/core/rng.ts';
import { JIGSAW } from '../config.ts';

export interface Knob {
  /** +1: the knob sticks out towards larger x (an upright edge) or larger y (a lying edge); -1: the other way. */
  out: 1 | -1;
  /** Where along the edge its middle is, from the edge's top or left end (0..1 of a side). */
  at: number;
  /** Its size: 1 is the usual one. */
  size: number;
}

export interface Cut {
  cols: number;
  rows: number;
  /** Upright edges between columns: the edge at x = c (c = 1 .. cols - 1) in row r is [r * (cols - 1) + c - 1]. */
  upright: Knob[];
  /** Lying edges between rows: the edge at y = r (r = 1 .. rows - 1) in column c is [(r - 1) * cols + c]. */
  lying: Knob[];
}

export function makeCut(cols: number, rows: number, seed: number): Cut {
  const { shift, vary } = JIGSAW.knob;
  let state = seed >>> 0;
  const draw = () => {
    const d = nextRandom(state);
    state = d.state;
    return d.value;
  };
  const knob = (): Knob => {
    const out = draw() < 0.5 ? 1 : -1;
    const at = 0.5 + (draw() * 2 - 1) * shift;
    const size = 1 + (draw() * 2 - 1) * vary;
    return { out, at, size };
  };
  const lying = Array.from({ length: (rows - 1) * cols }, knob);
  const upright = Array.from({ length: rows * (cols - 1) }, knob);
  return { cols, rows, upright, lying };
}

/** The knob of the upright edge at x = c in row r; null on the picture's border. */
export function uprightAt(cut: Cut, r: number, c: number): Knob | null {
  return c <= 0 || c >= cut.cols ? null : (cut.upright[r * (cut.cols - 1) + c - 1] ?? null);
}

/** The knob of the lying edge at y = r in column c; null on the picture's border. */
export function lyingAt(cut: Cut, r: number, c: number): Knob | null {
  return r <= 0 || r >= cut.rows ? null : (cut.lying[(r - 1) * cut.cols + c] ?? null);
}

export type PieceKind = 'corner' | 'edge' | 'inner';

/** A piece of the picture's corner (two straight sides), of its border (one), or from inside. */
export function kindOf(cols: number, rows: number, piece: number): PieceKind {
  const r = Math.floor(piece / cols);
  const c = piece % cols;
  const straight = Number(r === 0) + Number(r === rows - 1) + Number(c === 0) + Number(c === cols - 1);
  return straight >= 2 ? 'corner' : straight === 1 ? 'edge' : 'inner';
}

/** The pieces next to a piece (up, right, down, left — those the picture has). */
export function neighboursOf(cols: number, rows: number, piece: number): number[] {
  const r = Math.floor(piece / cols);
  const c = piece % cols;
  const out: number[] = [];
  if (r > 0) out.push(piece - cols);
  if (c < cols - 1) out.push(piece + 1);
  if (r < rows - 1) out.push(piece + cols);
  if (c > 0) out.push(piece - 1);
  return out;
}
