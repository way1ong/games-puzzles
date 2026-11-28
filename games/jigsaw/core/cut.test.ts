import { describe, expect, it } from 'vitest';
import { JIGSAW } from '../config.ts';
import { kindOf, lyingAt, makeCut, neighboursOf, uprightAt } from './cut.ts';

describe('the cut', () => {
  it('has one knob for every edge between two pieces', () => {
    const cut = makeCut(9, 6, 1);
    expect(cut.lying).toHaveLength(5 * 9);
    expect(cut.upright).toHaveLength(6 * 8);
  });

  it('is the same for the same seed and differs for another', () => {
    expect(makeCut(6, 4, 42)).toEqual(makeCut(6, 4, 42));
    expect(makeCut(6, 4, 42)).not.toEqual(makeCut(6, 4, 43));
  });

  it('keeps every knob within the bounds of the config, sticking out both ways', () => {
    const { shift, vary } = JIGSAW.knob;
    const cut = makeCut(12, 8, 7);
    const knobs = [...cut.lying, ...cut.upright];
    for (const k of knobs) {
      expect([1, -1]).toContain(k.out);
      expect(k.at).toBeGreaterThanOrEqual(0.5 - shift);
      expect(k.at).toBeLessThanOrEqual(0.5 + shift);
      expect(k.size).toBeGreaterThanOrEqual(1 - vary);
      expect(k.size).toBeLessThanOrEqual(1 + vary);
    }
    const outward = knobs.filter((k) => k.out === 1).length / knobs.length;
    expect(outward).toBeGreaterThan(0.3);
    expect(outward).toBeLessThan(0.7);
  });

  it('has no knob on the picture’s border', () => {
    const cut = makeCut(6, 4, 3);
    expect(uprightAt(cut, 0, 0)).toBeNull();
    expect(uprightAt(cut, 2, 6)).toBeNull();
    expect(lyingAt(cut, 0, 3)).toBeNull();
    expect(lyingAt(cut, 4, 3)).toBeNull();
    expect(uprightAt(cut, 1, 3)).toBe(cut.upright[1 * 5 + 2]);
    expect(lyingAt(cut, 2, 5)).toBe(cut.lying[1 * 6 + 5]);
  });
});

describe('the knobs’ measures (config)', () => {
  const { head, neck, shoulder, reach, shift, vary } = JIGSAW.knob;
  const big = 1 + vary;

  it('fit within a piece’s drawing', () => {
    expect(reach * big).toBeLessThanOrEqual(JIGSAW.margin);
  });

  it('meet the head above the edge: a neck under a wider head', () => {
    expect(neck).toBeLessThan(head);
    expect(reach - head - Math.sqrt(head * head - neck * neck)).toBeGreaterThan(0);
  });

  it('stay within their edge, and two knobs on sides of one corner never meet', () => {
    // the knob with its shoulders, from where it stands at the most
    expect(0.5 + shift + (neck + shoulder) * big).toBeLessThan(1);
    expect(0.5 + shift + head * big).toBeLessThan(1);
    // a knob reaching in from the top ends before one reaching in from the right begins
    expect(0.5 + shift + head * big).toBeLessThan(1 - reach * big);
  });
});

describe('the pieces', () => {
  it('are corners, border pieces and pieces from inside', () => {
    const kinds = Array.from({ length: 24 }, (_, p) => kindOf(6, 4, p));
    expect(kinds.filter((k) => k === 'corner')).toHaveLength(4);
    expect(kinds.filter((k) => k === 'edge')).toHaveLength(2 * 4 + 2 * 2);
    expect(kinds.filter((k) => k === 'inner')).toHaveLength(4 * 2);
    expect([0, 5, 18, 23].map((p) => kindOf(6, 4, p))).toEqual(['corner', 'corner', 'corner', 'corner']);
    expect(kindOf(6, 4, 7)).toBe('inner');
    expect(kindOf(6, 4, 6)).toBe('edge');
  });

  it('have their neighbours, each the other’s', () => {
    expect(neighboursOf(6, 4, 0).sort((a, b) => a - b)).toEqual([1, 6]);
    expect(neighboursOf(6, 4, 3)).toHaveLength(3);
    expect(neighboursOf(6, 4, 8).sort((a, b) => a - b)).toEqual([2, 7, 9, 14]);
    for (let p = 0; p < 24; p++) for (const n of neighboursOf(6, 4, p)) expect(neighboursOf(6, 4, n)).toContain(p);
  });
});
