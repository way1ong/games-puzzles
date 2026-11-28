// The play of a colour picture (docs/nonograms/SPEC.md, "Кольорові малюнки"): a tap with a paint, with the same paint
// again (the second-tap setting), with another paint, with the cross; strokes decided by their first cell; crosses by
// themselves in a line that fits, colours and all; "Undo"; mistakes of colour; the solved picture; the hint — a mistake
// first, then the line that decides more, with the paint of each cell — and following hints alone solves a picture.
import { describe, expect, it } from 'vitest';
import { colourCluesOfPicture, valuesOf } from './colour-clues.ts';
import { colourHintFor } from './colour-hint.ts';
import {
  BLANK,
  CROSS,
  colourAddTime,
  colourClear,
  colourCountHint,
  colourFittingLines,
  colourFullButWrong,
  colourMistakes,
  colourPut,
  colourSolved,
  colourStroke,
  colourTargetOf,
  colourUndo,
  newColourPlay,
  type ColourStrokeOptions,
} from './colour-play.ts';
import type { Picture } from './picture.ts';

// . r r r .
// r r r r r
// r r r r r
// . . t . .
// . t t t .
const MUSHROOM: Picture = { id: 'mushroom-5', name: 'mushroom', size: 5, rows: ['.rrr.', 'rrrrr', 'rrrrr', '..t..', '.ttt.'] };
const CLUES = colourCluesOfPicture(MUSHROOM);
const VALUES = valuesOf(MUSHROOM, CLUES.paints);
const RED = 1;
const TAN = 2;
const PLAIN: ColourStrokeOptions = { tool: RED, secondTap: 'clear', autoCross: false };
const at = (row: number, col: number) => row * 5 + col;

describe('colour marks', () => {
  it('a paint goes on a blank cell; the same paint again clears or crosses, by the setting; another paint takes its place', () => {
    expect(CLUES.paints).toEqual(['r', 't']);
    expect(colourTargetOf(BLANK, RED, 'clear')).toBe(RED);
    expect(colourTargetOf(RED, RED, 'clear')).toBe(BLANK);
    expect(colourTargetOf(RED, RED, 'cross')).toBe(CROSS);
    expect(colourTargetOf(TAN, RED, 'clear')).toBe(RED);
    expect(colourTargetOf(CROSS, RED, 'clear')).toBe(BLANK);
    expect(colourTargetOf(BLANK, CROSS, 'clear')).toBe(CROSS);
    expect(colourTargetOf(TAN, CROSS, 'clear')).toBe(CROSS);
    expect(colourTargetOf(CROSS, CROSS, 'cross')).toBe(BLANK);
  });

  it('a stroke changes only the cells with the first one’s mark, as one step; "Undo" takes it back whole', () => {
    let p = newColourPlay(MUSHROOM);
    p = colourStroke(p, CLUES, [at(1, 1)], { ...PLAIN, tool: TAN });
    p = colourStroke(p, CLUES, [at(1, 0), at(1, 1), at(1, 2), at(1, 3)], PLAIN); // from a blank cell: paints the blank ones
    expect(p.marks.slice(5, 10)).toEqual([RED, TAN, RED, RED, BLANK]);
    p = colourStroke(p, CLUES, [at(1, 1), at(1, 2)], PLAIN); // from a tan cell: the tan ones turn red
    expect(p.marks.slice(5, 10)).toEqual([RED, RED, RED, RED, BLANK]);
    p = colourStroke(p, CLUES, [at(1, 3), at(1, 2), at(1, 1)], PLAIN); // from a red cell with red: clears the red ones
    expect(p.marks.slice(5, 10)).toEqual([RED, BLANK, BLANK, BLANK, BLANK]);
    expect(p.history.length).toBe(4);
    p = colourUndo(p);
    expect(p.marks.slice(5, 10)).toEqual([RED, RED, RED, RED, BLANK]);
    p = colourUndo(colourUndo(p));
    expect(p.marks.slice(5, 10)).toEqual([BLANK, TAN, BLANK, BLANK, BLANK]);
    expect(colourStroke(p, CLUES, [], PLAIN)).toBe(p); // nothing stroked: no step
    // the cross: on a painted cell too; on a cross it clears
    let q = colourStroke(newColourPlay(MUSHROOM), CLUES, [at(0, 1)], PLAIN);
    q = colourStroke(q, CLUES, [at(0, 1)], { ...PLAIN, tool: CROSS });
    expect(q.marks[at(0, 1)]).toBe(CROSS);
    q = colourStroke(q, CLUES, [at(0, 1)], { ...PLAIN, tool: CROSS });
    expect(q.marks[at(0, 1)]).toBe(BLANK);
  });

  it('crosses come by themselves in a line whose painted cells fit its numbers, colours too, and go back with the move', () => {
    let p = newColourPlay(MUSHROOM);
    p = colourStroke(p, CLUES, [at(3, 2)], { ...PLAIN, tool: RED, autoCross: true }); // "t1" in red: not done
    expect(p.marks.slice(15, 20)).toEqual([BLANK, BLANK, RED, BLANK, BLANK]);
    p = colourStroke(p, CLUES, [at(3, 2)], { ...PLAIN, tool: TAN, autoCross: true }); // in tan: done
    expect(p.marks.slice(15, 20)).toEqual([CROSS, CROSS, TAN, CROSS, CROSS]);
    expect(colourFittingLines(p.marks, CLUES).has('row3')).toBe(true);
    p = colourUndo(p);
    expect(p.marks.slice(15, 20)).toEqual([BLANK, BLANK, RED, BLANK, BLANK]);
    expect(colourFittingLines(newColourPlay(MUSHROOM).marks, CLUES).size).toBe(0);
  });

  it('knows the mistakes — another colour, paint where it is empty, a cross where it is painted — and the solved picture', () => {
    let p = newColourPlay(MUSHROOM);
    p = colourStroke(p, CLUES, [at(0, 0)], PLAIN); // painted where it is empty
    p = colourStroke(p, CLUES, [at(0, 1)], { ...PLAIN, tool: TAN }); // tan where it is red
    p = colourStroke(p, CLUES, [at(4, 2)], { ...PLAIN, tool: CROSS }); // crossed where it is tan
    p = colourStroke(p, CLUES, [at(3, 0)], { ...PLAIN, tool: CROSS }); // crossed where it is empty: right
    expect(colourMistakes(p.marks, VALUES)).toEqual([at(0, 0), at(0, 1), at(4, 2)]);
    const answer = VALUES.flatMap((v, cell) => (v ? [{ cell, paint: v }] : []));
    const solved = colourPut(newColourPlay(MUSHROOM), CLUES, answer, [], false);
    expect(solved.done).toBe(true);
    expect(colourSolved(solved.marks, CLUES)).toBe(true);
    expect(colourStroke(solved, CLUES, [at(2, 2)], PLAIN)).toBe(solved); // a solved picture takes no more moves
    expect(colourUndo(solved)).toBe(solved);
    // the right cells in the wrong colours: as many painted as the numbers ask, yet wrong
    const swapped = colourPut(newColourPlay(MUSHROOM), CLUES, answer.map((a) => ({ cell: a.cell, paint: a.paint === RED ? TAN : RED })), [], false);
    expect(swapped.done).toBe(false);
    expect(colourFullButWrong(swapped, CLUES)).toBe(true);
    expect(colourFullButWrong(newColourPlay(MUSHROOM), CLUES)).toBe(false);
  });

  it('Backspace clears painted and crossed cells as one step, crosses coming by themselves when a line fits again', () => {
    let p = colourStroke(newColourPlay(MUSHROOM), CLUES, [at(3, 2)], { ...PLAIN, tool: TAN });
    p = colourStroke(p, CLUES, [at(3, 0)], PLAIN); // the row "t1" with a red cell too many
    p = colourStroke(p, CLUES, [at(4, 0)], { ...PLAIN, tool: CROSS });
    const cleared = colourClear(p, CLUES, [at(3, 0), at(4, 0)], true);
    expect(cleared.marks.slice(15, 20)).toEqual([CROSS, CROSS, TAN, CROSS, CROSS]);
    expect(cleared.marks[at(4, 0)]).toBe(BLANK);
    expect(cleared.history.length).toBe(p.history.length + 1);
    expect(colourUndo(cleared).marks).toEqual(p.marks);
    expect(colourClear(p, CLUES, [at(0, 0)], true)).toBe(p); // nothing to clear: no step
  });

  it('counts hints and time', () => {
    const p = colourCountHint(colourAddTime(newColourPlay(MUSHROOM), 1500));
    expect(p.hints).toBe(1);
    expect(p.ms).toBe(1500);
    expect(colourAddTime(p, -5).ms).toBe(1500);
  });
});

describe('colour hint', () => {
  it('points at a mistake first, saying what the cell should be: its paint, or empty', () => {
    let p = colourStroke(newColourPlay(MUSHROOM), CLUES, [at(0, 1)], { ...PLAIN, tool: TAN });
    expect(colourHintFor(p, VALUES, CLUES)).toEqual({ kind: 'mistake', cell: at(0, 1), should: RED });
    p = colourStroke(newColourPlay(MUSHROOM), CLUES, [at(0, 0)], PLAIN);
    expect(colourHintFor(p, VALUES, CLUES)).toEqual({ kind: 'mistake', cell: at(0, 0), should: 0 });
  });

  it('otherwise gives a line that decides more cells — painted ones first — each with its paint, and never a wrong cell', () => {
    const hint = colourHintFor(newColourPlay(MUSHROOM), VALUES, CLUES);
    expect(hint.kind).toBe('line');
    if (hint.kind !== 'line') return;
    expect(hint.paint.length).toBeGreaterThan(0);
    for (const { cell, paint } of hint.paint) expect(paint, `${cell}`).toBe(VALUES[cell]);
    for (const cell of hint.cross) expect(VALUES[cell], `${cell}`).toBe(0);
  });

  it('following the hints alone solves the picture', () => {
    let p = newColourPlay(MUSHROOM);
    for (let guard = 0; guard < 50 && !p.done; guard++) {
      const hint = colourHintFor(p, VALUES, CLUES);
      expect(hint.kind).toBe('line');
      if (hint.kind !== 'line') break;
      p = colourPut(colourCountHint(p), CLUES, hint.paint, hint.cross, true);
    }
    expect(p.done).toBe(true);
    expect(colourHintFor(p, VALUES, CLUES).kind).toBe('none');
  });
});
