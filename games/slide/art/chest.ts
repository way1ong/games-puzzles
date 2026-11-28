// The drawings of "The chest" (docs/slide/SPEC.md, "Скринька"), seen from above, as SVG text: the tray — its lining,
// its sides and the slot in the middle of the bottom side with an arrow out — and the pieces: the chest (wood with a
// lid of boards, brass bands and corners, and a brass clasp on its front, toward the slot) and plain wooden blocks — a small
// one shows the rings of the end grain, a lying and a standing one the grain along them, so they differ by more than
// their colour (rule 6). A piece is drawn in cells (across × down). Colours only from art/palette.ts.
import type { BoxShape } from '../config.ts';
import { BOX_LOOK as P } from './palette.ts';
import { FRAME, r2, svgOpen } from './pieces.ts';

const M = 0.07; // a piece's margin inside its cells

/** The chest, `w` × `h` cells: the body, the lid's edge and boards, the brass bands and corners, the clasp at the front. */
function chestArt(w: number, h: number): string {
  const [x0, y0, x1, y1] = [M, M, w - M, h - M];
  const body = `<rect x="${x0}" y="${y0}" width="${r2(x1 - x0)}" height="${r2(y1 - y0)}" rx="0.16" fill="${P.chest}" stroke="${P.outline}" stroke-width="0.06"/>`;
  const lid = `<rect x="${r2(x0 + 0.13)}" y="${r2(y0 + 0.13)}" width="${r2(x1 - x0 - 0.26)}" height="${r2(y1 - y0 - 0.26)}" rx="0.1" fill="none" stroke="${P.chestLine}" stroke-width="0.04"/>`;
  const boards = [1, 2, 3]
    .map((k) => {
      const y = r2(y0 + 0.13 + ((y1 - y0 - 0.26) * k) / 4);
      return `<line x1="${r2(x0 + 0.13)}" y1="${y}" x2="${r2(x1 - 0.13)}" y2="${y}" stroke="${P.chestLine}" stroke-width="0.035"/>`;
    })
    .join('');
  const bands = [0.27, 0.73]
    .map((at) => `<rect x="${r2(w * at - 0.065)}" y="${y0}" width="0.13" height="${r2(y1 - y0)}" fill="${P.brass}" stroke="${P.outline}" stroke-width="0.03"/>`)
    .join('');
  const corners = [
    [x0, y0],
    [x1 - 0.24, y0],
    [x0, y1 - 0.24],
    [x1 - 0.24, y1 - 0.24],
  ]
    .map(([x, y]) => `<rect x="${r2(x!)}" y="${r2(y!)}" width="0.24" height="0.24" rx="0.08" fill="${P.brass}" stroke="${P.outline}" stroke-width="0.03"/>`)
    .join('');
  const mid = w / 2;
  const clasp =
    `<rect x="${r2(mid - 0.17)}" y="${r2(y1 - 0.44)}" width="0.34" height="0.4" rx="0.06" fill="${P.brass}" stroke="${P.outline}" stroke-width="0.035"/>` +
    `<circle cx="${r2(mid)}" cy="${r2(y1 - 0.29)}" r="0.05" fill="${P.outline}"/>` +
    `<rect x="${r2(mid - 0.02)}" y="${r2(y1 - 0.29)}" width="0.04" height="0.12" fill="${P.outline}"/>`;
  return body + lid + boards + bands + corners + clasp;
}

/** A block lying, `length` × 1 cells: its sides, its top, and its grain — rings when it is one cell, lines along it. */
function blockArt(length: number): string {
  const [x0, y0, x1, y1] = [M, M, length - M, 1 - M];
  const body = `<rect x="${x0}" y="${y0}" width="${r2(x1 - x0)}" height="${r2(y1 - y0)}" rx="0.12" fill="${P.block}" stroke="${P.outline}" stroke-width="0.06"/>`;
  const top = `<rect x="${r2(x0 + 0.09)}" y="${r2(y0 + 0.09)}" width="${r2(x1 - x0 - 0.18)}" height="${r2(y1 - y0 - 0.18)}" rx="0.08" fill="${P.blockTop}"/>`;
  if (length === 1) {
    const rings = [0.11, 0.23].map((r) => `<circle cx="0.5" cy="0.5" r="${r}" fill="none" stroke="${P.blockLine}" stroke-width="0.04"/>`).join('');
    return `${body}${top}${rings}<circle cx="0.5" cy="0.5" r="0.035" fill="${P.blockLine}"/>`;
  }
  const grain = [0.36, 0.5, 0.64]
    .map((y, i) => {
      const [a, b] = [x0 + 0.22 + i * 0.12, x1 - 0.22 - i * 0.08];
      return `<path d="M${r2(a)} ${y}C${r2(a + (b - a) * 0.35)} ${r2(y - 0.07)} ${r2(a + (b - a) * 0.65)} ${r2(y + 0.07)} ${r2(b)} ${y}" fill="none" stroke="${P.blockLine}" stroke-width="0.035" stroke-linecap="round"/>`;
    })
    .join('');
  return body + top + grain;
}

/** A piece as SVG, `w` × `h` cells: the chest, or a block (a standing one is the lying drawing turned a quarter). */
export function boxPieceSvg(shape: BoxShape, w: number, h: number): string {
  let art: string;
  if (shape === 'chest') art = chestArt(w, h);
  else if (h > w) art = `<g transform="translate(0 ${h}) rotate(-90)">${blockArt(h)}</g>`;
  else art = blockArt(w);
  return `${svgOpen(w, h, 'piece__art')}${art}</svg>`;
}

/** A down arrow in a box of the given size: the way out through the slot. */
function downArrow(x: number, y: number, w: number, h: number): string {
  const mid = x + w / 2;
  const head = Math.min(h * 0.55, w * 0.5);
  const shaft = w * 0.16;
  const path = `M${r2(mid - shaft)} ${r2(y)}H${r2(mid + shaft)}V${r2(y + h - head)}H${r2(x + w)}L${r2(mid)} ${r2(y + h)}L${r2(x)} ${r2(y + h - head)}H${r2(mid - shaft)}Z`;
  return `<path d="${path}" fill="${P.arrow}" stroke="${P.outline}" stroke-width="0.025" stroke-linejoin="round"/>`;
}

/** The tray of `cols` × `rows` cells: the lining, the sides, and the slot `slotWidth` cells wide from column `slot` in the bottom side. */
export function trayGroundSvg(cols: number, rows: number, slot: number, slotWidth: number): string {
  const [w, h] = [cols + 2 * FRAME, rows + 2 * FRAME];
  const [s0, s1] = [FRAME + slot, FRAME + slot + slotWidth];
  const weave: string[] = [];
  for (let k = 1; k < rows * 2; k++) {
    const y = r2(FRAME + k / 2);
    weave.push(`<line x1="${FRAME}" y1="${y}" x2="${r2(w - FRAME)}" y2="${y}" stroke="${P.groundLine}" stroke-width="0.02"/>`);
  }
  for (let k = 1; k < cols * 2; k++) {
    const x = r2(FRAME + k / 2);
    weave.push(`<line x1="${x}" y1="${FRAME}" x2="${x}" y2="${r2(h - FRAME)}" stroke="${P.groundLine}" stroke-width="0.02"/>`);
  }
  // the sides: the outer edge with the slot cut through the bottom one, less the lining inside
  const sides =
    `<path d="M0 0H${r2(w)}V${r2(h)}H${r2(s1)}V${r2(h - FRAME)}H${r2(s0)}V${r2(h)}H0Z` +
    `M${FRAME} ${FRAME}V${r2(h - FRAME)}H${r2(w - FRAME)}V${FRAME}Z" fill="${P.frame}" stroke="${P.frameLine}" stroke-width="0.04" fill-rule="evenodd"/>`;
  const sign = downArrow((s0 + s1) / 2 - 0.2, h - FRAME + 0.03, 0.4, FRAME - 0.06);
  return `${svgOpen(w, h, 'yard__ground')}<rect width="${r2(w)}" height="${r2(h)}" fill="${P.ground}"/>${weave.join('')}${sides}${sign}</svg>`;
}
