// The numbers of a line and what they force (docs/nonograms/SPEC.md, "Як грати", "Без вгадування"): known cases, and
// against every way a short line can be filled.
import { describe, expect, it } from 'vitest';
import { allLines, clueOf, cluesOf, filledTotal, lineCells, sameClue } from './clues.ts';
import { EMPTY, FILLED, UNKNOWN, solveLine, type Know } from './line.ts';

const line = (text: string): Know[] => [...text].map((c) => (c === '#' ? FILLED : c === 'x' ? EMPTY : UNKNOWN));
const show = (known: Know[] | null): string | null => (known ? known.map((k) => (k === FILLED ? '#' : k === EMPTY ? 'x' : '.')).join('') : null);

describe('clues', () => {
  it('counts the runs of filled cells in order; an empty line has none', () => {
    expect(clueOf([true, true, false, true])).toEqual([2, 1]);
    expect(clueOf([false, false])).toEqual([]);
    expect(clueOf([true, true, true])).toEqual([3]);
    expect(clueOf([false, true, false, true, true, false])).toEqual([1, 2]);
  });

  it('gives the rows from the top and the columns from the left', () => {
    // # # .
    // . # .
    // # . #
    const solution = [true, true, false, false, true, false, true, false, true];
    const clues = cluesOf(solution, 3);
    expect(clues.rows).toEqual([[2], [1], [1, 1]]);
    expect(clues.cols).toEqual([[1, 1], [2], [1]]);
    expect(filledTotal(clues)).toBe(5);
    expect(lineCells(3, 'row', 1)).toEqual([3, 4, 5]);
    expect(lineCells(3, 'col', 2)).toEqual([2, 5, 8]);
    expect(allLines(3).map((l) => `${l.axis}${l.index}`)).toEqual(['row0', 'row1', 'row2', 'col0', 'col1', 'col2']);
    expect(sameClue([1, 2], [1, 2])).toBe(true);
    expect(sameClue([1, 2], [2, 1])).toBe(false);
  });
});

describe('solveLine', () => {
  it('finds what a person finds along one line', () => {
    expect(show(solveLine([3], line('.....')))).toBe('..#..'); // the overlap of a long run
    expect(show(solveLine([5], line('.....')))).toBe('#####');
    expect(show(solveLine([], line('.....')))).toBe('xxxxx');
    expect(show(solveLine([1, 1], line('...')))).toBe('#x#');
    expect(show(solveLine([2, 2], line('.....')))).toBe('##x##'); // 2 + 1 + 2 = 5: one way only
    expect(show(solveLine([2], line('#....')))).toBe('##xxx'); // a run from the edge
    expect(show(solveLine([3, 1], line('.......')))).toBe('..#....'); // the runs can shift by two: one cell is sure
    expect(show(solveLine([1], line('..#..')))).toBe('xx#xx'); // the only run found: the rest is empty
    expect(show(solveLine([3], line('.x...')))).toBe('xx###'); // a gap too short for the run
  });

  it('says when the numbers cannot lie on the line', () => {
    expect(solveLine([3], line('.x.x.'))).toBeNull();
    expect(solveLine([1], line('#.#'))).toBeNull();
    expect(solveLine([], line('..#'))).toBeNull();
    expect(solveLine([2, 2], line('....'))).toBeNull();
  });

  it('agrees with every way a short line can be filled', () => {
    // all lines up to 8 cells, every clue that fits, and partial knowledge taken from a real filling
    for (let n = 1; n <= 8; n++) {
      const fillings = Array.from({ length: 1 << n }, (_, mask) => Array.from({ length: n }, (_, i) => ((mask >> i) & 1) === 1));
      const clues = new Map<string, boolean[][]>();
      for (const f of fillings) {
        const key = clueOf(f).join(',');
        if (!clues.has(key)) clues.set(key, []);
        clues.get(key)!.push(f);
      }
      let seed = n * 7919;
      const random = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff), seed / 0x7fffffff);
      for (const [key, matching] of clues) {
        const clue = key ? key.split(',').map(Number) : [];
        for (let t = 0; t < 6; t++) {
          const truth = matching[Math.floor(random() * matching.length)]!;
          const known: Know[] = truth.map((f) => (random() < 0.3 ? (f ? FILLED : EMPTY) : UNKNOWN));
          const fits = matching.filter((f) => f.every((v, i) => known[i] === UNKNOWN || (known[i] === FILLED) === v));
          const want = known.map((k, i) => (k !== UNKNOWN ? k : fits.every((f) => f[i]) ? FILLED : fits.every((f) => !f[i]) ? EMPTY : UNKNOWN));
          expect(show(solveLine(clue, known)), `${clue} on ${show(known)}`).toBe(show(want));
        }
      }
    }
  });
});
