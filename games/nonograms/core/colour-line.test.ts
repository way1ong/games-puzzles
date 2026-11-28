// The numbers of a colour line and what they force (docs/nonograms/SPEC.md, "Кольорові малюнки"): runs of one colour,
// touching when the colours differ, apart when they are the same; known cases, the black-and-white solver's answers
// with one paint, and every way a short line can be painted.
import { describe, expect, it } from 'vitest';
import { clueOf } from './clues.ts';
import { colourClueOf, colourCluesOf, colourCluesOfPicture, lengthsOf, paintedTotal, paintsOf, sameColourClue, valuesOf, type Run } from './colour-clues.ts';
import { anyOf, bitOf, onlyValue, solveColourLine, type Can } from './colour-line.ts';
import { EMPTY, FILLED, UNKNOWN, solveLine, type Know } from './line.ts';
import type { Picture } from './picture.ts';

const PAINTS = ['r', 'g', 'b'];
/** A line as text: '.' anything, 'x' empty, a paint's letter — that paint; '?' — not empty (any paint). */
function line(text: string, paints = PAINTS): Can[] {
  return [...text].map((c) => {
    if (c === '.') return anyOf(paints.length);
    if (c === 'x') return bitOf(0);
    if (c === '?') return anyOf(paints.length) & ~bitOf(0);
    return bitOf(paints.indexOf(c) + 1);
  });
}
/** What is known, as text: a letter or 'x' where one value is left, '.' where more are. */
const show = (cans: Can[] | null, paints = PAINTS): string | null =>
  cans ? cans.map((can) => (onlyValue(can) === null ? '.' : onlyValue(can) === 0 ? 'x' : paints[onlyValue(can)! - 1])).join('') : null;
/** Runs from text: "r2 g1". */
const runs = (text: string): Run[] => (text ? text.split(' ').map((t) => ({ colour: t[0]!, length: Number(t.slice(1)) })) : []);
const solve = (clue: Run[], known: Can[]) => solveColourLine(clue, known, PAINTS);
const values = (text: string, paints = PAINTS) => [...text].map((c) => (c === '.' ? 0 : paints.indexOf(c) + 1));

describe('colour clues', () => {
  it('count runs of one colour in order: a new run where the colour changes, apart or touching', () => {
    expect(colourClueOf(values('rrg.r'), PAINTS)).toEqual(runs('r2 g1 r1'));
    expect(colourClueOf(values('r.r'), PAINTS)).toEqual(runs('r1 r1'));
    expect(colourClueOf(values('rg'), PAINTS)).toEqual(runs('r1 g1'));
    expect(colourClueOf(values('...'), PAINTS)).toEqual([]);
    expect(sameColourClue(runs('r1 g2'), runs('r1 g2'))).toBe(true);
    expect(sameColourClue(runs('r1 g2'), runs('g1 g2'))).toBe(false);
  });

  it('take a picture’s paints most cells first, the rows from the top and the columns from the left', () => {
    // g r .
    // r r .
    // . r g
    const picture = { id: 'test-5', name: 'test', size: 3, rows: ['gr.', 'rr.', '.rg'] } as unknown as Picture;
    expect(paintsOf(picture)).toEqual(['r', 'g']);
    expect(valuesOf(picture, ['r', 'g'])).toEqual([2, 1, 0, 1, 1, 0, 0, 1, 2]);
    const clues = colourCluesOfPicture(picture);
    expect(clues.paints).toEqual(['r', 'g']);
    expect(clues.rows).toEqual([runs('g1 r1'), runs('r2'), runs('r1 g1')]);
    expect(clues.cols).toEqual([runs('g1 r1'), runs('r3'), runs('g1')]);
    expect(lengthsOf(clues).rows).toEqual([[1, 1], [2], [1, 1]]);
    expect(paintedTotal(clues)).toBe(6);
    // the same count: the paint met first comes first
    const even = { id: 'even-5', name: 'even', size: 2, rows: ['bg', 'gb'] } as unknown as Picture;
    expect(paintsOf(even)).toEqual(['b', 'g']);
    expect(colourCluesOf([1, 2, 2, 1], 2, ['b', 'g']).cols).toEqual([runs('b1 g1'), runs('g1 b1')]);
  });
});

describe('solveColourLine', () => {
  it('finds what a person finds along one line', () => {
    expect(show(solve(runs('r2 g1'), line('...')))).toBe('rrg'); // different colours touch: one way only
    expect(show(solve(runs('r1 r1'), line('...')))).toBe('rxr'); // the same colour needs a gap
    expect(show(solve(runs('r1 g1'), line('...')))).toBe('...'); // rg., r.g, .rg
    expect(show(solve(runs('r3'), line('.....')))).toBe('..r..'); // the overlap of a long run
    expect(show(solve(runs('r2 r2'), line('.....')))).toBe('rrxrr');
    expect(show(solve(runs('r2 g2'), line('.....')))).toBe('.r.g.');
    expect(show(solve([], line('....')))).toBe('xxxx');
    expect(show(solve(runs('g1'), line('..g..')))).toBe('xxgxx'); // the only run found: the rest is empty
    expect(show(solve(runs('r2'), line('.x...')))).toBe('xx.r.'); // a gap too short for the run
    expect(show(solve(runs('r2 b1'), line('..b..')))).toBe('rrbxx'); // the red run fits before the blue one, touching it
  });

  it('narrows a cell to the paints it can take, without deciding it', () => {
    // r1 g1 on three cells: the middle one may be red, green or empty; the first never green, the last never red
    const result = solve(runs('r1 g1'), line('...'))!;
    expect(result).toEqual([bitOf(0) | bitOf(1), bitOf(0) | bitOf(1) | bitOf(2), bitOf(0) | bitOf(2)]);
    // r1 g1 b1 on four cells, the second one painted (but not known which): rgb., rg.b or .rgb
    expect(solve(runs('r1 g1 b1'), line('.?..'))).toEqual([
      bitOf(0) | bitOf(1),
      bitOf(1) | bitOf(2),
      bitOf(0) | bitOf(2) | bitOf(3),
      bitOf(0) | bitOf(3),
    ]);
  });

  it('says when the runs cannot lie on the line', () => {
    expect(solve(runs('r2 r1'), line('...'))).toBeNull(); // 2 + gap + 1 is 4
    expect(solve(runs('r1 g1'), line('.'))).toBeNull();
    expect(solve(runs('r1'), line('g..'))).toBeNull(); // a green cell where only red may be
    expect(solve([], line('.r.'))).toBeNull();
    expect(solve(runs('v1'), line('...'))).toBeNull(); // a colour the picture does not have
  });

  it('with one paint, finds what the black-and-white solver finds', () => {
    const one = ['k'];
    for (let n = 1; n <= 7; n++) {
      for (let mask = 0; mask < 1 << n; mask++) {
        const truth = Array.from({ length: n }, (_, i) => ((mask >> i) & 1) === 1);
        for (let knownMask = 0; knownMask < 1 << n; knownMask += 3) {
          const known: Know[] = truth.map((f, i) => (((knownMask >> i) & 1) === 1 ? (f ? FILLED : EMPTY) : UNKNOWN));
          const bw = solveLine(clueOf(truth), known);
          const cans = known.map((k) => (k === FILLED ? bitOf(1) : k === EMPTY ? bitOf(0) : anyOf(1)));
          const colour = solveColourLine(colourClueOf(truth.map((f) => (f ? 1 : 0)), one), cans, one);
          const asKnow = colour?.map((can): Know => (onlyValue(can) === 1 ? FILLED : onlyValue(can) === 0 ? EMPTY : UNKNOWN)) ?? null;
          expect(asKnow, `${mask}/${knownMask}`).toEqual(bw);
        }
      }
    }
  });

  it('agrees with every way a short line can be painted', () => {
    // two paints up to 6 cells, three paints up to 4; partial knowledge drawn from a real painting
    for (const [paints, longest] of [[['r', 'g'], 6] as const, [['r', 'g', 'b'], 4] as const]) {
      const m = paints.length;
      let seed = m * 7919;
      const random = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff), seed / 0x7fffffff);
      for (let n = 1; n <= longest; n++) {
        const all: number[][] = [];
        for (let code = 0; code < (m + 1) ** n; code++) all.push(Array.from({ length: n }, (_, i) => Math.floor(code / (m + 1) ** i) % (m + 1)));
        const byClue = new Map<string, number[][]>();
        for (const v of all) {
          const key = JSON.stringify(colourClueOf(v, paints));
          if (!byClue.has(key)) byClue.set(key, []);
          byClue.get(key)!.push(v);
        }
        for (const [key, matching] of byClue) {
          const clue = JSON.parse(key) as Run[];
          for (let t = 0; t < 6; t++) {
            const truth = matching[Math.floor(random() * matching.length)]!;
            // each cell: its true value and, now and then, some others it might be
            const known: Can[] = truth.map((v) => {
              let can = bitOf(v);
              for (let o = 0; o <= m; o++) if (random() < (t === 0 ? 1 : 0.6)) can |= bitOf(o);
              return can;
            });
            const fits = matching.filter((f) => f.every((v, i) => (known[i]! & bitOf(v)) !== 0));
            const want = known.map((_, i) => fits.reduce((can, f) => can | bitOf(f[i]!), 0));
            expect(solveColourLine(clue, known, paints), `${key} on ${known}`).toEqual(want);
          }
        }
      }
    }
  });
});
