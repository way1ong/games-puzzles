// The colour section (docs/nonograms/SPEC.md, "Кольорові малюнки"): album pictures of two colours or more, each solved
// to the end line by line in colour (so it has one answer and needs no guess) — and every album picture that is so is
// listed, so a new one is noticed; none twice; every size there; no more paints than keys and patterns; and following
// the hints alone, from the marks the player has, solves each of them.
import { describe, expect, it } from 'vitest';
import app from '../styles/app.css?raw';
import { NONOGRAMS, SIZES } from '../config.ts';
import { chapterOf } from '../core/album.ts';
import { colourCluesOfPicture, paintsOf, valuesOf } from '../core/colour-clues.ts';
import type { Picture } from '../core/picture.ts';
import { colourHintFor } from '../core/colour-hint.ts';
import { colourPut, newColourPlay } from '../core/colour-play.ts';
import { colourSolvableByLines } from '../core/colour-solve.ts';
import { COLOUR_IDS, COLOUR_PICTURES } from './colour.ts';
import { PICTURES } from './pictures.ts';

/** The most numbers in one line of a picture in colour. */
const mostNumbers = (p: Picture): number => {
  const clues = colourCluesOfPicture(p);
  return Math.max(...[...clues.rows, ...clues.cols].map((clue) => clue.length));
};

/** Fits the section's bounds: paints and numbers in a line that leave the grid room on a small phone. */
const fits = (p: Picture): boolean => paintsOf(p).length <= NONOGRAMS.colour.maxPaints && mostNumbers(p) <= NONOGRAMS.colour.mostNumbers;

describe('colour section', () => {
  it('lists album pictures only, none twice', () => {
    const album = new Set(PICTURES.map((p) => p.id));
    for (const id of COLOUR_IDS) expect(album.has(id), id).toBe(true);
    expect(new Set(COLOUR_IDS).size).toBe(COLOUR_IDS.length);
    expect(COLOUR_PICTURES.map((p) => p.id)).toEqual(COLOUR_IDS);
  });

  it('holds pictures of two colours or more, each solved to the end line by line in colour', () => {
    for (const p of COLOUR_PICTURES) {
      expect(paintsOf(p).length, p.id).toBeGreaterThanOrEqual(2);
      expect(colourSolvableByLines(p), p.id).toBe(true);
    }
  });

  it('lists every album picture that belongs there (a new one is noticed)', () => {
    const listed = new Set(COLOUR_IDS);
    const missing = PICTURES.filter((p) => paintsOf(p).length >= 2 && fits(p) && colourSolvableByLines(p) && !listed.has(p.id)).map((p) => p.id);
    expect(missing).toEqual([]);
  });

  it('keeps to the paints and the numbers in a line that leave the grid room on a small phone', () => {
    for (const p of COLOUR_PICTURES) expect(fits(p), `${p.id}: ${paintsOf(p).length} paints, ${mostNumbers(p)} numbers in a line`).toBe(true);
    // the busiest pictures of the album stay black-and-white only
    for (const id of ['lighthouse-15', 'snowman-15', 'duck-15']) expect(COLOUR_IDS, id).not.toContain(id);
  });

  it('has every size, each picture with no more paints than keys and patterns', () => {
    for (const size of SIZES) expect(chapterOf(COLOUR_PICTURES, size).length, `${size}`).toBeGreaterThan(0);
    for (const p of COLOUR_PICTURES) expect(paintsOf(p).length, p.id).toBeLessThanOrEqual(NONOGRAMS.colour.maxPaints);
    // a pattern for each paint, should none of them go plain (styles/app.css; ui/paint.ts)
    for (let i = 1; i <= NONOGRAMS.colour.maxPaints; i++) expect(app, `.pat-${i}`).toMatch(new RegExp(`\\.pat-${i}\\b`));
  });

  it('is solved by following the hints alone, each of its pictures', () => {
    for (const p of COLOUR_PICTURES) {
      const clues = colourCluesOfPicture(p);
      const values = valuesOf(p, clues.paints);
      let play = newColourPlay(p);
      for (let guard = 0; guard < p.size * p.size * 2 && !play.done; guard++) {
        const hint = colourHintFor(play, values, clues);
        expect(hint.kind, p.id).toBe('line');
        if (hint.kind !== 'line') break;
        play = colourPut(play, clues, hint.paint, hint.cross, false);
      }
      expect(play.done, p.id).toBe(true);
    }
  });
});
