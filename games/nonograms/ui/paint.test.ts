// The looks of a colour picture's paints (docs/nonograms/SPEC.md, "Кольорові малюнки"): the first paint that stands out
// on the sheet by itself goes plain, the others each have their own pattern, light paints always one.
import { expect, it } from 'vitest';
import { COLOUR_PICTURES } from '../art/colour.ts';
import { PAINT_LOOK, PALETTE } from '../art/palette.ts';
import { NONOGRAMS } from '../config.ts';
import { paintsOf } from '../core/colour-clues.ts';
import { paintLooks } from './paint.ts';

it('leaves the first paint that stands out by itself plain and gives the others patterns in turn', () => {
  // red and blue stand out on the sheet, yellow does not
  expect(paintLooks(['y', 'r', 'b']).map((l) => l.pattern)).toEqual([1, 0, 2]);
  expect(paintLooks(['r', 'b']).map((l) => l.pattern)).toEqual([0, 1]);
  expect(paintLooks(['y', 'o']).map((l) => l.pattern)).toEqual([1, 2]);
  expect(paintLooks(['r'])[0]).toEqual({ colour: PALETTE.r, ink: PAINT_LOOK.r.ink, pattern: 0 });
});

it('gives the paints of every colour picture patterns of their own, within the patterns there are', () => {
  for (const p of COLOUR_PICTURES) {
    const looks = paintLooks(paintsOf(p));
    expect(new Set(looks.map((l) => l.pattern)).size, p.id).toBe(looks.length);
    for (const l of looks) expect(l.pattern, p.id).toBeLessThanOrEqual(NONOGRAMS.colour.maxPaints);
  }
});
