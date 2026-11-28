// A picture as a small drawing (the album, the end window): solved — in its colours on its paper, or in ink when the
// colour setting is off; begun — the cells the player has filled (in a picture in colour, each in its paint); new — an
// empty sheet. Colours of pictures come from art/palette.ts; the ink and the empty sheet are the screen's (tokens.css,
// through classes).
import { svg } from '../../../shared/ui/dom.ts';
import { PALETTE, PAPER, type Colour } from '../art/palette.ts';
import { FILL, type Mark } from '../core/play.ts';
import { EMPTY_PIXEL, pixelsOf, type Picture } from '../core/picture.ts';

export type Look =
  | { kind: 'colour' }
  | { kind: 'ink' }
  | { kind: 'marks'; marks: readonly Mark[] }
  /** A begun picture in colour: its marks (a paint from 1, else nothing) and its paints (palette letters). */
  | { kind: 'paints'; marks: readonly number[]; paints: readonly string[] }
  | { kind: 'blank' };

/** Runs of cells of one kind along each row: one rectangle each. */
function runs(size: number, kindOf: (cell: number) => string | null): string {
  let out = '';
  for (let r = 0; r < size; r++) {
    let c = 0;
    while (c < size) {
      const kind = kindOf(r * size + c);
      let end = c + 1;
      while (end < size && kindOf(r * size + end) === kind) end++;
      if (kind !== null) out += `<rect x="${c}" y="${r}" width="${end - c}" height="1" ${kind}/>`;
      c = end;
    }
  }
  return out;
}

export function pictureSvg(picture: Picture, look: Look): SVGSVGElement {
  const n = picture.size;
  const pixels = pixelsOf(picture);
  let paper = 'class="thumb__paper"';
  let cells = '';
  if (look.kind === 'colour') {
    paper = `fill="${PAPER}"`;
    cells = runs(n, (c) => (pixels[c] === EMPTY_PIXEL ? null : `fill="${PALETTE[pixels[c] as Colour]}"`));
  } else if (look.kind === 'ink') {
    cells = runs(n, (c) => (pixels[c] === EMPTY_PIXEL ? null : 'class="thumb__ink"'));
  } else if (look.kind === 'marks') {
    cells = runs(n, (c) => (look.marks[c] === FILL ? 'class="thumb__ink"' : null));
  } else if (look.kind === 'paints') {
    cells = runs(n, (c) => (look.marks[c]! > 0 ? `fill="${PALETTE[look.paints[look.marks[c]! - 1] as Colour]}"` : null));
  }
  return svg(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" class="thumb" aria-hidden="true" focusable="false" shape-rendering="crispEdges"><rect width="${n}" height="${n}" ${paper}/>${cells}</svg>`,
  );
}
