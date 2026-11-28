// A piece's outline (docs/jigsaw/SPEC.md, "Частинки"): its four sides, each straight on the picture's border or with
// the edge's knob — a round head on a narrower neck between straight shoulders. An edge is drawn once, from its top or
// left end; the piece on its other side goes along the same line backwards, so the two always fit exactly.
// Coordinates are the board's: one piece is 1 x 1, the piece in row r and column c covers [c, c + 1] x [r, r + 1].
import { JIGSAW } from '../config.ts';
import { lyingAt, uprightAt, type Cut, type Knob } from './cut.ts';

export interface Point {
  x: number;
  y: number;
}

/** A piece of a line: straight, a curve with two guide points, or a part of a circle. */
export type Segment =
  | { kind: 'line'; to: Point }
  | { kind: 'curve'; a: Point; b: Point; to: Point }
  | { kind: 'arc'; r: number; large: boolean; sweep: boolean; to: Point };

export type Side = 'top' | 'right' | 'bottom' | 'left';
export const SIDES: readonly Side[] = ['top', 'right', 'bottom', 'left'];

/**
 * An edge from `from` one side long — across (to the right) or down — with its knob, drawn from that end. Along the
 * edge t runs from 0 to 1; n is the distance from it towards the knob's side.
 */
export function edgeSegments(from: Point, across: boolean, knob: Knob | null): Segment[] {
  const end = across ? { x: from.x + 1, y: from.y } : { x: from.x, y: from.y + 1 };
  if (!knob) return [{ kind: 'line', to: end }];
  const k = JIGSAW.knob;
  const s = knob.size;
  const r = k.head * s;
  const a = k.neck * s;
  const shoulder = k.shoulder * s;
  const reach = k.reach * s;
  const c = knob.at;
  // where the neck meets the head: the head's circle (its middle `reach - r` from the edge) crosses t = c -/+ a
  const q = Math.sqrt(r * r - a * a);
  const low = reach - r - q;
  const at = (t: number, n: number): Point =>
    across ? { x: from.x + t, y: from.y + knob.out * n } : { x: from.x + knob.out * n, y: from.y + t };
  // into the neck the line turns the way the head's circle goes there; out of it, the mirror of that
  const bend = Math.min(0.06 * s, (low * r) / a);
  const lean = { t: (bend * q) / r, n: (bend * a) / r };
  const ease = shoulder * 0.6;
  // The head goes round its far side. Drawn in the board's coordinates (y down), whether that turns with the clock
  // depends on which way the knob sticks out and whether the edge lies or stands.
  const turn = across ? knob.out : -knob.out;
  return [
    { kind: 'line', to: at(c - a - shoulder, 0) },
    { kind: 'curve', a: at(c - a - shoulder + ease, 0), b: at(c - a + lean.t, low - lean.n), to: at(c - a, low) },
    { kind: 'arc', r, large: true, sweep: turn < 0, to: at(c + a, low) },
    { kind: 'curve', a: at(c + a - lean.t, low - lean.n), b: at(c + a + shoulder - ease, 0), to: at(c + a + shoulder, 0) },
    { kind: 'line', to: end },
  ];
}

/** The same line drawn from its other end (which starts where `segments` end). */
export function reversed(start: Point, segments: readonly Segment[]): Segment[] {
  const points = [start, ...segments.map((s) => s.to)];
  return segments
    .map((s, i): Segment => {
      const to = points[i]!;
      if (s.kind === 'line') return { kind: 'line', to };
      if (s.kind === 'curve') return { kind: 'curve', a: s.b, b: s.a, to };
      return { kind: 'arc', r: s.r, large: s.large, sweep: !s.sweep, to };
    })
    .reverse();
}

/** One side of a piece, going round it with the clock. */
export function sideSegments(cut: Cut, piece: number, side: Side): Segment[] {
  const r = Math.floor(piece / cut.cols);
  const c = piece % cut.cols;
  switch (side) {
    case 'top':
      return edgeSegments({ x: c, y: r }, true, lyingAt(cut, r, c));
    case 'right':
      return edgeSegments({ x: c + 1, y: r }, false, uprightAt(cut, r, c + 1));
    case 'bottom':
      return reversed({ x: c, y: r + 1 }, edgeSegments({ x: c, y: r + 1 }, true, lyingAt(cut, r + 1, c)));
    case 'left':
      return reversed({ x: c, y: r }, edgeSegments({ x: c, y: r }, false, uprightAt(cut, r, c)));
  }
}

const num = (n: number): string => String(Math.round(n * 10000) / 10000);
const pt = (p: Point): string => `${num(p.x)} ${num(p.y)}`;

export function segmentsPath(start: Point, segments: readonly Segment[]): string {
  return (
    `M${pt(start)}` +
    segments
      .map((s) => {
        if (s.kind === 'line') return `L${pt(s.to)}`;
        if (s.kind === 'curve') return `C${pt(s.a)} ${pt(s.b)} ${pt(s.to)}`;
        return `A${num(s.r)} ${num(s.r)} 0 ${s.large ? 1 : 0} ${s.sweep ? 1 : 0} ${pt(s.to)}`;
      })
      .join('')
  );
}

/** A piece's whole outline as the path of an SVG drawing, in the board's coordinates. */
export function outlineOf(cut: Cut, piece: number): string {
  const segments = SIDES.flatMap((side) => sideSegments(cut, piece, side));
  return `${segmentsPath({ x: piece % cut.cols, y: Math.floor(piece / cut.cols) }, segments)}Z`;
}
