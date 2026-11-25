// A picture of the game (docs/nonograms/SPEC.md, "Малюнки"): a square of cells, each empty or filled with a colour of
// art/palette.ts. The filled cells are the answer; the colours show at the end. Pure, no DOM.
import type { Size } from '../config.ts';

/** An empty cell in a picture's rows. */
export const EMPTY_PIXEL = '.';

export interface Picture {
  /** Its key in saved progress, unique in the album; never changes once published (art/pictures.ts: "<name>-<size>"). */
  id: string;
  /** What it shows: its key in the dictionaries (pictures.<name>); two sizes may show the same thing. */
  name: string;
  size: Size;
  /** The rows from the top: `EMPTY_PIXEL` for an empty cell, a letter of art/palette.ts for a filled one. */
  rows: readonly string[];
}

/** The answer, row after row: true — a filled cell. */
export function solutionOf(picture: Picture): boolean[] {
  return picture.rows.flatMap((row) => [...row].map((c) => c !== EMPTY_PIXEL));
}

/** The colour letter of each cell, row after row (`EMPTY_PIXEL` for an empty one). */
export const pixelsOf = (picture: Picture): string[] => picture.rows.flatMap((row) => [...row]);

/** What is wrong with a picture's shape (empty when nothing): rows of its size, of single letters. */
export function shapeProblems(picture: Picture): string[] {
  const out: string[] = [];
  if (picture.rows.length !== picture.size) out.push(`${picture.id}: ${picture.rows.length} rows, not ${picture.size}`);
  picture.rows.forEach((row, r) => {
    if ([...row].length !== picture.size) out.push(`${picture.id}: row ${r + 1} has ${[...row].length} cells, not ${picture.size}`);
  });
  if (!solutionOf(picture).some(Boolean)) out.push(`${picture.id}: nothing filled`);
  return out;
}
