// The pieces' drawings (docs/jigsaw/SPEC.md, "Частинки"): a piece is the picture cut out along its outline, with a
// thin edge. Text of SVG in the board's coordinates (one piece is 1 x 1); the edge's colour comes from the screen's
// tokens (styles/tokens.css) through its class, so the drawing holds no colour of its own.
import { JIGSAW } from '../config.ts';

/** A piece's drawing box in the board's coordinates: its square and the margin round it, where the knobs reach. */
export function boxOf(cols: number, piece: number): { x: number; y: number; w: number; h: number } {
  const m = JIGSAW.margin;
  return { x: (piece % cols) - m, y: Math.floor(piece / cols) - m, w: 1 + 2 * m, h: 1 + 2 * m };
}

/**
 * One piece as an SVG drawing: the picture (`href`, the whole picture cols x rows) cut along `outline`. `id` names the
 * cut; it is unique on the page (`jigsaw-…`, rules: several drawings may be on a page at once).
 */
export function pieceSvg(cols: number, rows: number, piece: number, outline: string, href: string, id: string): string {
  const b = boxOf(cols, piece);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${b.x} ${b.y} ${b.w} ${b.h}" class="piece-art" aria-hidden="true" focusable="false">` +
    `<defs><clipPath id="${id}"><path d="${outline}"/></clipPath></defs>` +
    `<image href="${href}" x="0" y="0" width="${cols}" height="${rows}" preserveAspectRatio="none" clip-path="url(#${id})"/>` +
    `<path class="piece-art__edge" d="${outline}"/>` +
    `</svg>`
  );
}
