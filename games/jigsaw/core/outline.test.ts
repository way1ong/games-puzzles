import { describe, expect, it } from 'vitest';
import { JIGSAW } from '../config.ts';
import { lyingAt, makeCut, uprightAt } from './cut.ts';
import { outlineOf, reversed, sideSegments, SIDES, type Point, type Segment } from './outline.ts';

const cut = makeCut(6, 4, 11);

/** Every point a side's segments name (ends and guide points). */
const pointsOf = (segments: readonly Segment[]): Point[] => segments.flatMap((s) => (s.kind === 'curve' ? [s.a, s.b, s.to] : [s.to]));

const round = (segments: readonly Segment[]) =>
  JSON.stringify(segments, (_, v: unknown) => (typeof v === 'number' ? Math.round(v * 1e9) / 1e9 : v));

describe('a piece’s outline', () => {
  it('goes round the piece: each side ends where the next begins, and back at the start', () => {
    for (const piece of [0, 3, 8, 23]) {
      const r = Math.floor(piece / 6);
      const c = piece % 6;
      const ends = SIDES.map((side) => sideSegments(cut, piece, side).at(-1)!.to);
      expect(ends).toEqual([
        { x: c + 1, y: r },
        { x: c + 1, y: r + 1 },
        { x: c, y: r + 1 },
        { x: c, y: r },
      ]);
      const d = outlineOf(cut, piece);
      expect(d.startsWith(`M${c} ${r}`)).toBe(true);
      expect(d.endsWith('Z')).toBe(true);
    }
  });

  it('has a knob on every side but the picture’s border, which is straight', () => {
    const arcs = (piece: number) => (outlineOf(cut, piece).match(/A/g) ?? []).length;
    expect(arcs(0)).toBe(2);
    expect(arcs(2)).toBe(3);
    expect(arcs(8)).toBe(4);
    expect(sideSegments(cut, 0, 'top')).toEqual([{ kind: 'line', to: { x: 1, y: 0 } }]);
    expect(sideSegments(cut, 0, 'left')).toEqual([{ kind: 'line', to: { x: 0, y: 0 } }]);
  });

  it('fits its neighbours exactly: a shared edge is one line, drawn the other way round', () => {
    for (let piece = 0; piece < 24; piece++) {
      const r = Math.floor(piece / 6);
      const c = piece % 6;
      if (c < 5) {
        const left = sideSegments(cut, piece + 1, 'left');
        expect(round(reversed({ x: c + 1, y: r + 1 }, left))).toBe(round(sideSegments(cut, piece, 'right')));
      }
      if (r < 3) {
        const top = sideSegments(cut, piece + 6, 'top');
        expect(round(reversed({ x: c + 1, y: r + 1 }, sideSegments(cut, piece, 'bottom')))).toBe(round(top));
      }
    }
  });

  it('draws every knob’s head round the same circle from both of its pieces, on the side the cut says', () => {
    // The middle of an arc as a drawing program finds it from its ends, radius and flags (SVG, circles without a turn):
    // of the two circles through both ends, `large` and `sweep` choose one.
    const centreOf = (from: Point, arc: Extract<Segment, { kind: 'arc' }>): Point => {
      const hx = (from.x - arc.to.x) / 2;
      const hy = (from.y - arc.to.y) / 2;
      const h2 = hx * hx + hy * hy;
      const k = (arc.large !== arc.sweep ? 1 : -1) * Math.sqrt(Math.max(0, arc.r * arc.r - h2) / h2);
      return { x: (from.x + arc.to.x) / 2 + k * hy, y: (from.y + arc.to.y) / 2 - k * hx };
    };
    const { head, reach } = JIGSAW.knob;
    for (let piece = 0; piece < 24; piece++) {
      const r = Math.floor(piece / 6);
      const c = piece % 6;
      for (const side of SIDES) {
        const segments = sideSegments(cut, piece, side);
        const i = segments.findIndex((s) => s.kind === 'arc');
        if (i < 0) continue;
        const across = side === 'top' || side === 'bottom';
        const knob = across ? lyingAt(cut, side === 'top' ? r : r + 1, c)! : uprightAt(cut, r, side === 'left' ? c : c + 1)!;
        // the head's middle: `reach - head` (both times the knob's size) from the edge, towards the side it sticks out
        const away = (reach - head) * knob.size * knob.out;
        const expected = across ? { x: c + knob.at, y: (side === 'top' ? r : r + 1) + away } : { x: (side === 'left' ? c : c + 1) + away, y: r + knob.at };
        const centre = centreOf(segments[i - 1]!.to, segments[i] as Extract<Segment, { kind: 'arc' }>);
        expect(centre.x, `${piece} ${side}`).toBeCloseTo(expected.x, 9);
        expect(centre.y, `${piece} ${side}`).toBeCloseTo(expected.y, 9);
      }
    }
  });

  it('sticks the knob out of the piece the cut says', () => {
    // the upright edge between pieces 8 and 9 (x = 3, row 1)
    const knob = uprightAt(cut, 1, 3)!;
    const xs = pointsOf(sideSegments(cut, 8, 'right')).map((p) => p.x);
    const beyond = knob.out === 1 ? Math.max(...xs) > 3 : Math.min(...xs) < 3;
    expect(beyond).toBe(true);
    const towards = knob.out === 1 ? Math.min(...xs) >= 3 - 1e-9 : Math.max(...xs) <= 3 + 1e-9;
    expect(towards).toBe(true);
  });

  it('stays within the piece’s drawing (its square and the margin)', () => {
    const m = JIGSAW.margin;
    for (let piece = 0; piece < 24; piece++) {
      const r = Math.floor(piece / 6);
      const c = piece % 6;
      for (const side of SIDES) {
        for (const s of sideSegments(cut, piece, side)) {
          for (const p of pointsOf([s])) {
            expect(p.x).toBeGreaterThanOrEqual(c - m);
            expect(p.x).toBeLessThanOrEqual(c + 1 + m);
            expect(p.y).toBeGreaterThanOrEqual(r - m);
            expect(p.y).toBeLessThanOrEqual(r + 1 + m);
          }
          if (s.kind === 'arc') expect(s.r).toBeLessThan(m);
        }
      }
    }
  });
});
