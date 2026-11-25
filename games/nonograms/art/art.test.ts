// The pictures of the album (docs/nonograms/SPEC.md, "Малюнки", "Без вгадування"): each of its size, of palette
// colours only, solved to the end line by line without a guess; ids that saved progress can rely on; no two alike;
// every size with pictures. Colours of the pictures live in palette.ts only.
import { describe, expect, it } from 'vitest';
import { NONOGRAMS, SIZES } from '../config.ts';
import { chapterOf } from '../core/album.ts';
import { EMPTY_PIXEL, shapeProblems, solutionOf } from '../core/picture.ts';
import { solvableByLines } from '../core/solve.ts';
import { PALETTE } from './palette.ts';
import { PICTURES } from './pictures.ts';

const sources = import.meta.glob('./*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

describe('pictures', () => {
  it('are each a square of their size, of empty cells and palette colours', () => {
    for (const p of PICTURES) {
      expect(shapeProblems(p), p.id).toEqual([]);
      const letters = new Set(p.rows.join(''));
      letters.delete(EMPTY_PIXEL);
      for (const letter of letters) expect(Object.keys(PALETTE), `${p.id}: ${letter}`).toContain(letter);
    }
  });

  it('are solved to the end line by line, without a guess (so each has one answer)', () => {
    for (const p of PICTURES) expect(solvableByLines(p), p.id).toBe(true);
  });

  it('have ids of their name and size, none twice, and names fit for a dictionary key', () => {
    for (const p of PICTURES) {
      expect(p.id).toBe(`${p.name}-${p.size}`);
      expect(p.name, p.id).toMatch(/^[a-z]+$/);
    }
    expect(new Set(PICTURES.map((p) => p.id)).size).toBe(PICTURES.length);
  });

  it('are not the same answer twice', () => {
    const answers = PICTURES.map((p) => `${p.size}:${solutionOf(p).map((f) => (f ? 1 : 0)).join('')}`);
    expect(new Set(answers).size).toBe(PICTURES.length);
  });

  it('fill every size of the album, the daily one too', () => {
    for (const size of SIZES) expect(chapterOf(PICTURES, size).length, `${size}`).toBeGreaterThan(0);
    expect(SIZES).toContain(NONOGRAMS.daily.size);
  });

  it('keep their colours in palette.ts only', () => {
    for (const [file, text] of Object.entries(sources)) {
      if (file.endsWith('/palette.ts') || file.endsWith('.test.ts')) continue;
      expect(text.match(/#[0-9a-fA-F]{3,8}\b|rgb\(|hsl\(/g), file).toBeNull();
    }
    for (const hex of Object.values(PALETTE)) expect(hex).toMatch(/^#[0-9a-f]{6}$/);
  });
});
