// The play of a picture (docs/nonograms/SPEC.md, "Керування"): taps and strokes, the second-tap setting, the cross
// mode, crosses by themselves in a finished line, "Undo", mistakes, the solved picture; the hint — a mistake first,
// then a line that decides more, and following hints alone solves a picture.
import { describe, expect, it } from 'vitest';
import { cluesOf } from './clues.ts';
import { hintFor } from './hint.ts';
import { BLANK, CROSS, FILL, addTime, countHint, fittingLines, fullButWrong, isSolved, mistakes, newPlay, put, stroke, targetOf, undo, type Play, type StrokeOptions } from './play.ts';
import { solutionOf, type Picture } from './picture.ts';

// . # . # .
// # # # # #
// # # # # #
// . # # # .
// . . # . .
const HEART: Picture = { id: 'heart', size: 5, rows: ['.r.r.', 'rrrrr', 'rrrrr', '.rrr.', '..r..'] };
const CLUES = cluesOf(solutionOf(HEART), 5);
const PLAIN: StrokeOptions = { mode: 'fill', secondTap: 'clear', autoCross: false };
const at = (row: number, col: number) => row * 5 + col;

describe('marks', () => {
  it('a tap fills; a second one clears or crosses, by the setting; the cross mode crosses and uncrosses', () => {
    expect(targetOf(BLANK, 'fill', 'clear')).toBe(FILL);
    expect(targetOf(FILL, 'fill', 'clear')).toBe(BLANK);
    expect(targetOf(FILL, 'fill', 'cross')).toBe(CROSS);
    expect(targetOf(CROSS, 'fill', 'cross')).toBe(BLANK);
    expect(targetOf(BLANK, 'cross', 'clear')).toBe(CROSS);
    expect(targetOf(CROSS, 'cross', 'clear')).toBe(BLANK);
    expect(targetOf(FILL, 'cross', 'clear')).toBe(CROSS);
  });

  it('a stroke changes only the cells with the first one’s mark, as one step; "Undo" takes it back whole', () => {
    let p = newPlay(HEART);
    p = stroke(p, CLUES, [at(1, 1)], PLAIN);
    p = stroke(p, CLUES, [at(1, 0), at(1, 1), at(1, 2), at(1, 3)], PLAIN); // starts on a blank cell: fills the blank ones
    expect(p.marks.slice(5, 10)).toEqual([FILL, FILL, FILL, FILL, BLANK]);
    expect(p.history.length).toBe(2);
    p = stroke(p, CLUES, [at(1, 2), at(1, 1)], PLAIN); // starts on a filled cell: clears the filled ones
    expect(p.marks.slice(5, 10)).toEqual([FILL, BLANK, BLANK, FILL, BLANK]);
    p = undo(p);
    expect(p.marks.slice(5, 10)).toEqual([FILL, FILL, FILL, FILL, BLANK]);
    p = undo(p);
    expect(p.marks.slice(5, 10)).toEqual([BLANK, FILL, BLANK, BLANK, BLANK]);
    expect(undo(undo(p)).history.length).toBe(0);
    // a stroke that starts on a blank cell keeps the crosses and the filled cells on its way
    let q = stroke(newPlay(HEART), CLUES, [at(2, 2)], { ...PLAIN, mode: 'cross' });
    q = stroke(q, CLUES, [at(2, 3)], PLAIN);
    q = stroke(q, CLUES, [at(2, 0), at(2, 1), at(2, 2), at(2, 3), at(2, 4)], { ...PLAIN, secondTap: 'cross' });
    expect(q.marks.slice(10, 15)).toEqual([FILL, FILL, CROSS, FILL, FILL]);
    // a stroke that changes nothing is no step
    const same = stroke(p, CLUES, [at(1, 1)], { ...PLAIN, mode: 'fill', secondTap: 'clear' });
    expect(stroke(same, CLUES, [], PLAIN)).toBe(same);
  });

  it('crosses come by themselves in a line whose filled cells fit its numbers, and go back with the move', () => {
    let p = newPlay(HEART);
    p = stroke(p, CLUES, [at(4, 2)], { ...PLAIN, autoCross: true }); // the bottom row "1": done
    expect(p.marks.slice(20, 25)).toEqual([CROSS, CROSS, FILL, CROSS, CROSS]);
    p = undo(p);
    expect(p.marks.slice(20, 25)).toEqual([BLANK, BLANK, BLANK, BLANK, BLANK]);
    expect(fittingLines(newPlay(HEART).marks, CLUES).size).toBe(0);
  });

  it('knows the mistakes, a full grid that is wrong, and the solved picture', () => {
    let p = newPlay(HEART);
    p = stroke(p, CLUES, [at(0, 0)], PLAIN); // against the answer
    p = stroke(p, CLUES, [at(0, 1)], { ...PLAIN, mode: 'cross' }); // crossed, though it is filled in the answer
    expect(mistakes(p.marks, solutionOf(HEART))).toEqual([at(0, 0), at(0, 1)]);
    const solution = solutionOf(HEART);
    const solved = put(newPlay(HEART), CLUES, solution.flatMap((f, c) => (f ? [c] : [])), [], false);
    expect(solved.done).toBe(true);
    expect(isSolved(solved.marks, CLUES)).toBe(true);
    expect(stroke(solved, CLUES, [at(2, 2)], PLAIN)).toBe(solved); // a solved picture takes no more moves
    expect(undo(solved)).toBe(solved);
    // as many filled cells as the numbers, one of them in the wrong place
    const filled = solution.flatMap((f, c) => (f ? [c] : []));
    const wrong = put(newPlay(HEART), CLUES, [...filled.slice(1), at(0, 0)], [], false);
    expect(wrong.done).toBe(false);
    expect(fullButWrong(wrong, CLUES)).toBe(true);
    expect(fullButWrong(newPlay(HEART), CLUES)).toBe(false);
  });

  it('counts hints and time', () => {
    const p: Play = countHint(addTime(newPlay(HEART), 1500));
    expect(p.hints).toBe(1);
    expect(p.ms).toBe(1500);
    expect(addTime(p, -5).ms).toBe(1500);
  });
});

describe('hint', () => {
  it('points at a mistake first, saying what the cell should be', () => {
    let p = newPlay(HEART);
    p = stroke(p, CLUES, [at(0, 0)], PLAIN);
    expect(hintFor(p, HEART, CLUES)).toEqual({ kind: 'mistake', cell: at(0, 0), should: 'empty' });
  });

  it('otherwise gives a line that decides more cells — filled ones first — and never a wrong cell', () => {
    const hint = hintFor(newPlay(HEART), HEART, CLUES);
    expect(hint.kind).toBe('line');
    if (hint.kind !== 'line') return;
    const solution = solutionOf(HEART);
    expect(hint.fill.length).toBeGreaterThan(0);
    expect(hint.fill.every((c) => solution[c])).toBe(true);
    expect(hint.cross.every((c) => !solution[c])).toBe(true);
  });

  it('following the hints alone solves the picture', () => {
    let p = newPlay(HEART);
    for (let guard = 0; guard < 50 && !p.done; guard++) {
      const hint = hintFor(p, HEART, CLUES);
      expect(hint.kind).toBe('line');
      if (hint.kind !== 'line') break;
      p = put(countHint(p), CLUES, hint.fill, hint.cross, true);
    }
    expect(p.done).toBe(true);
    expect(hintFor(p, HEART, CLUES).kind).toBe('none');
  });
});
