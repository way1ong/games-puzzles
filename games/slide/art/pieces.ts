// The drawings of "Clear the way" (docs/slide/SPEC.md, "Три теми навмання"), seen from above, as SVG text: the ground
// with its frame and the way out, and each piece — a boat, a barge and the player's little boat in the harbour; a
// chest, a wardrobe and the sofa in the room; bars and the red bar in the box. A piece is drawn lying, in cells
// (length × 1), and turned for a standing one. Colours only from art/palette.ts.
import type { Theme } from '../config.ts';
import { LOOKS, type LookPaint } from './palette.ts';

/** A piece's kind: the player's, a short or a long one. */
export type PieceKind = 'own' | 'short' | 'long';

/** The frame around the cells, in cells (C). */
export const FRAME = 0.26;

export const r2 = (n: number) => Math.round(n * 1000) / 1000;
export const svgOpen = (w: number, h: number, cls: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${r2(w)} ${r2(h)}" class="${cls}" aria-hidden="true" focusable="false" preserveAspectRatio="none">`;

/** An arrow toward the right, in a box of the given size: the mark of the player's piece. */
function arrow(x: number, y: number, w: number, h: number, colour: string, edge: string): string {
  const mid = y + h / 2;
  const head = Math.min(w * 0.45, h * 0.9);
  const shaft = h * 0.18;
  const path = `M${r2(x)} ${r2(mid - shaft)}H${r2(x + w - head)}V${r2(y)}L${r2(x + w)} ${r2(mid)}L${r2(x + w - head)} ${r2(y + h)}V${r2(mid + shaft)}H${r2(x)}Z`;
  return `<path d="${path}" fill="${colour}" stroke="${edge}" stroke-width="0.03" stroke-linejoin="round"/>`;
}

/** Lines across a piece (planks, bands, seats) at the given places along it. */
const across = (xs: number[], y0: number, y1: number, colour: string, width: number) =>
  xs.map((x) => `<line x1="${r2(x)}" y1="${r2(y0)}" x2="${r2(x)}" y2="${r2(y1)}" stroke="${colour}" stroke-width="${width}" stroke-linecap="round"/>`).join('');

const M = 0.07; // a piece's margin inside its cells

// ---------- harbour ----------
function boat(p: LookPaint, length: number, own: boolean): string {
  const [x0, x1, y0, y1] = [M, length - M, M + 0.06, 1 - M - 0.06];
  const bow = x1 - 0.55;
  const fill = own ? p.own : p.short;
  const line = own ? p.ownLine : p.shortLine;
  const hull = `M${r2(x0 + 0.12)} ${r2(y0)}H${r2(bow)}Q${r2(x1)} ${r2(y0)} ${r2(x1)} 0.5Q${r2(x1)} ${r2(y1)} ${r2(bow)} ${r2(y1)}H${r2(x0 + 0.12)}Q${r2(x0)} ${r2(y1)} ${r2(x0)} ${r2(y1 - 0.12)}V${r2(y0 + 0.12)}Q${r2(x0)} ${r2(y0)} ${r2(x0 + 0.12)} ${r2(y0)}Z`;
  const inner = `M${r2(x0 + 0.2)} ${r2(y0 + 0.12)}H${r2(bow - 0.05)}Q${r2(x1 - 0.14)} ${r2(y0 + 0.12)} ${r2(x1 - 0.14)} 0.5Q${r2(x1 - 0.14)} ${r2(y1 - 0.12)} ${r2(bow - 0.05)} ${r2(y1 - 0.12)}H${r2(x0 + 0.2)}Z`;
  const seats = across([x0 + 0.5, x0 + (length > 2 ? 1.4 : 0.95)], y0 + 0.12, y1 - 0.12, line, 0.07);
  const mark = own ? arrow(x0 + 0.3, 0.32, length - 1.0, 0.36, p.arrow, p.outline) : '';
  return `<path d="${hull}" fill="${fill}" stroke="${p.outline}" stroke-width="0.06"/><path d="${inner}" fill="none" stroke="${line}" stroke-width="0.04"/>${own ? '' : seats}${mark}`;
}

function barge(p: LookPaint, length: number): string {
  const [x0, x1, y0, y1] = [M, length - M, M, 1 - M];
  const body = `<rect x="${x0}" y="${y0}" width="${r2(x1 - x0)}" height="${r2(y1 - y0)}" rx="0.22" fill="${p.long}" stroke="${p.outline}" stroke-width="0.06"/>`;
  const crates = Array.from({ length: length - 1 }, (_, i) => {
    const x = x0 + 0.32 + i * ((x1 - x0 - 0.64) / (length - 1)) + 0.06;
    const w = (x1 - x0 - 0.64) / (length - 1) - 0.12;
    return `<rect x="${r2(x)}" y="${r2(y0 + 0.2)}" width="${r2(w)}" height="${r2(y1 - y0 - 0.4)}" rx="0.05" fill="${p.longLine}" stroke="${p.outline}" stroke-width="0.04"/>`;
  }).join('');
  return body + crates;
}

// ---------- room ----------
function sofa(p: LookPaint, length: number): string {
  const [x0, x1, y0, y1] = [M, length - M, M, 1 - M];
  const back = `<rect x="${x0}" y="${y0}" width="${r2(x1 - x0)}" height="0.26" rx="0.1" fill="${p.ownLine}" stroke="${p.outline}" stroke-width="0.05"/>`;
  const seat = `<rect x="${x0}" y="${y0}" width="${r2(x1 - x0)}" height="${r2(y1 - y0)}" rx="0.14" fill="${p.own}" stroke="${p.outline}" stroke-width="0.06"/>`;
  const arms = [x0, x1 - 0.2].map((x) => `<rect x="${r2(x)}" y="${y0}" width="0.2" height="${r2(y1 - y0)}" rx="0.08" fill="${p.ownLine}" stroke="${p.outline}" stroke-width="0.04"/>`).join('');
  const cushions = across([length / 2], y0 + 0.3, y1 - 0.06, p.ownLine, 0.04);
  return seat + back + arms + cushions + arrow(x0 + 0.38, 0.4, length - 0.9, 0.34, p.arrow, p.outline);
}

function chest(p: LookPaint, length: number): string {
  const [x0, x1, y0, y1] = [M, length - M, M + 0.04, 1 - M - 0.04];
  const body = `<rect x="${x0}" y="${y0}" width="${r2(x1 - x0)}" height="${r2(y1 - y0)}" rx="0.06" fill="${p.short}" stroke="${p.outline}" stroke-width="0.06"/>`;
  const lid = `<rect x="${r2(x0 + 0.1)}" y="${r2(y0 + 0.1)}" width="${r2(x1 - x0 - 0.2)}" height="${r2(y1 - y0 - 0.2)}" rx="0.04" fill="none" stroke="${p.shortLine}" stroke-width="0.04"/>`;
  const bands = across([x0 + 0.38, x1 - 0.38], y0, y1, p.shortLine, 0.08);
  return body + lid + bands;
}

function wardrobe(p: LookPaint, length: number): string {
  const [x0, x1, y0, y1] = [M, length - M, M, 1 - M];
  const body = `<rect x="${x0}" y="${y0}" width="${r2(x1 - x0)}" height="${r2(y1 - y0)}" rx="0.05" fill="${p.long}" stroke="${p.outline}" stroke-width="0.06"/>`;
  const top = `<rect x="${r2(x0 + 0.12)}" y="${r2(y0 + 0.12)}" width="${r2(x1 - x0 - 0.24)}" height="${r2(y1 - y0 - 0.24)}" fill="none" stroke="${p.longLine}" stroke-width="0.04"/>`;
  const doors = across([length / 2], y0 + 0.12, y1 - 0.12, p.longLine, 0.04);
  return body + top + doors;
}

// ---------- box ----------
function bar(p: LookPaint, length: number, kind: PieceKind): string {
  const [x0, x1, y0, y1] = [M, length - M, M, 1 - M];
  const fill = kind === 'own' ? p.own : kind === 'long' ? p.long : p.short;
  const line = kind === 'own' ? p.ownLine : kind === 'long' ? p.longLine : p.shortLine;
  const body = `<rect x="${x0}" y="${y0}" width="${r2(x1 - x0)}" height="${r2(y1 - y0)}" rx="0.16" fill="${fill}" stroke="${p.outline}" stroke-width="0.06"/>`;
  const grain = [0.32, 0.5, 0.68]
    .map((y, i) => `<path d="M${r2(x0 + 0.2 + i * 0.1)} ${y}C${r2(length * 0.35)} ${r2(y - 0.06)} ${r2(length * 0.65)} ${r2(y + 0.06)} ${r2(x1 - 0.2 - i * 0.08)} ${y}" fill="none" stroke="${line}" stroke-width="0.035"/>`)
    .join('');
  return body + (kind === 'own' ? arrow(x0 + 0.3, 0.3, length - 0.75, 0.4, p.arrow, p.outline) : grain);
}

/** A piece as SVG: lying (drawn as is) or standing (turned a quarter); `flip` — its front (a boat's bow) the other way. */
export function pieceSvg(theme: Theme, kind: PieceKind, length: number, lying: boolean, flip = false): string {
  const p = LOOKS[theme];
  let art: string;
  if (theme === 'harbour') art = kind === 'long' ? barge(p, length) : boat(p, length, kind === 'own');
  else if (theme === 'room') art = kind === 'own' ? sofa(p, length) : kind === 'long' ? wardrobe(p, length) : chest(p, length);
  else art = bar(p, length, kind);
  // a standing piece: the lying drawing turned a quarter, its front (a boat's bow) up; flip turns it the other way
  const turn = lying ? (flip ? `rotate(180 ${r2(length / 2)} 0.5)` : '') : flip ? `translate(1 0) rotate(90)` : `translate(0 ${length}) rotate(-90)`;
  const [w, h] = lying ? [length, 1] : [1, length];
  return `${svgOpen(w, h, 'piece__art')}<g${turn ? ` transform="${turn}"` : ''}>${art}</g></svg>`;
}

/** The ground of a board of `size` cells with its frame and the way out in the right side of row `exitRow`. */
export function groundSvg(theme: Theme, size: number, exitRow: number): string {
  const p = LOOKS[theme];
  const total = size + 2 * FRAME;
  const out = { y0: FRAME + exitRow + 0.08, y1: FRAME + exitRow + 0.92 };
  const marks: string[] = [];
  if (theme === 'harbour') {
    for (let r = 0; r < size; r++)
      for (let c = 0; c < size; c++) {
        const x = FRAME + c + ((r * 7 + c * 3) % 5) * 0.12 + 0.15;
        const y = FRAME + r + ((r * 3 + c * 5) % 4) * 0.15 + 0.3;
        marks.push(`<path d="M${r2(x)} ${r2(y)}q0.09 -0.08 0.18 0t0.18 0" fill="none" stroke="${p.groundLine}" stroke-width="0.035" stroke-linecap="round"/>`);
      }
  } else if (theme === 'room') {
    for (let k = 1; k < size * 2; k++) {
      const y = FRAME + k / 2;
      marks.push(`<line x1="${FRAME}" y1="${r2(y)}" x2="${r2(FRAME + size)}" y2="${r2(y)}" stroke="${p.groundLine}" stroke-width="0.025"/>`);
      const x = FRAME + ((k * 1.7) % size);
      marks.push(`<line x1="${r2(x)}" y1="${r2(y - 0.5)}" x2="${r2(x)}" y2="${r2(y)}" stroke="${p.groundLine}" stroke-width="0.025"/>`);
    }
  } else {
    for (let k = 0; k < size * 3; k++) {
      const y = FRAME + 0.2 + k * (size / (size * 3)) * 1;
      marks.push(`<path d="M${FRAME} ${r2(y)}C${r2(FRAME + size * 0.3)} ${r2(y - 0.12)} ${r2(FRAME + size * 0.7)} ${r2(y + 0.12)} ${r2(FRAME + size)} ${r2(y)}" fill="none" stroke="${p.groundLine}" stroke-width="0.025"/>`);
    }
  }
  const frame = `<path d="M0 0H${r2(total)}V${r2(out.y0)}H${r2(total - FRAME)}V${FRAME}H${FRAME}V${r2(total - FRAME)}H${r2(total - FRAME)}V${r2(out.y1)}H${r2(total)}V${r2(total)}H0Z" fill="${p.frame}" stroke="${p.frameLine}" stroke-width="0.04" fill-rule="evenodd"/>`;
  // the way out: the ground goes on through the gap, with an arrow over it
  const gap = `<rect x="${r2(total - FRAME - 0.01)}" y="${r2(out.y0)}" width="${r2(FRAME + 0.01)}" height="${r2(out.y1 - out.y0)}" fill="${p.ground}"/>`;
  const sign = arrow(total - FRAME + 0.04, out.y0 + 0.24, FRAME - 0.08, out.y1 - out.y0 - 0.48, p.arrow, p.outline);
  const door =
    theme === 'room'
      ? `<path d="M${r2(total - FRAME)} ${r2(out.y0)}a${r2(out.y1 - out.y0)} ${r2(out.y1 - out.y0)} 0 0 0 ${r2(-(out.y1 - out.y0))} ${r2(out.y1 - out.y0)}" fill="none" stroke="${p.frameLine}" stroke-width="0.03" stroke-dasharray="0.06 0.05"/>`
      : '';
  return `${svgOpen(total, total, 'yard__ground')}<rect width="${r2(total)}" height="${r2(total)}" fill="${p.ground}"/>${marks.join('')}${frame}${gap}${door}${sign}</svg>`;
}
