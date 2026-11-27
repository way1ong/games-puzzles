// Pour: three bottles as the game draws them (games/pour/styles/app.css): glass with an outline and a pale inside;
// the first with two paints in turn, the second half full, the third full of one paint with a cork. The glass and the
// cork from tokens.css, the paints from art/palette.ts (red and blue). Our own picture, not taken from any game.
import { readFileSync } from 'node:fs';

const palette = readFileSync(new URL('../../games/pour/art/palette.ts', import.meta.url), 'utf8');
const waters = [...palette.matchAll(/water: '(#[0-9a-f]{6})'/gi)].map((m) => m[1]);
const RED = waters[0];
const BLUE = waters[7];

export const TOKENS = {
  ground: '--accent',
  glass: '--glass-in',
  inside: '--glass-in',
  line: '--layer-dark',
  cork: '--cork',
  corkEdge: '--cork-edge',
};

/** The picture on a square of `size`; `full` — the ground fills the square (maskable, Apple), else rounded. */
export function picture(size, { full, share }, C) {
  const side = size * share;
  const w = side * 0.24;
  const h = side * 0.92;
  const gap = (side - 3 * w) / 2;
  const x0 = (size - side) / 2;
  const y0 = (size - h) / 2;
  const stroke = Math.max(2, w * 0.12);
  const layer = h / 4.4;
  const bottle = (x, paints, cork) => {
    const r = w / 2;
    const outline = `M${x} ${y0}V${y0 + h - r}A${r} ${r} 0 0 0 ${x + w} ${y0 + h - r}V${y0}`;
    const clip = `pour-${Math.round(x)}`;
    const layers = paints
      .map((p, i) => `<rect x="${x}" y="${y0 + h - (i + 1) * layer}" width="${w}" height="${layer}" fill="${p}" stroke="${C.line}" stroke-width="${stroke * 0.35}"/>`)
      .join('');
    const top = cork ? `<rect x="${x + w * 0.18}" y="${y0 - layer * 0.15}" width="${w * 0.64}" height="${layer * 0.45}" rx="${w * 0.08}" fill="${C.cork}" stroke="${C.corkEdge}" stroke-width="${stroke * 0.5}"/>` : '';
    return (
      `<clipPath id="${clip}"><path d="${outline}Z"/></clipPath>` +
      `<path d="${outline}Z" fill="${C.inside}"/>` +
      `<g clip-path="url(#${clip})">${layers}</g>` +
      `<path d="${outline}" fill="none" stroke="${C.glass}" stroke-width="${stroke}" stroke-linejoin="round"/>` +
      top
    );
  };
  const ground = full
    ? `<rect width="${size}" height="${size}" fill="${C.ground}"/>`
    : `<rect width="${size}" height="${size}" rx="${size * 0.22}" fill="${C.ground}"/>`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${ground}` +
    bottle(x0, [RED, BLUE, RED, BLUE], false) +
    bottle(x0 + w + gap, [BLUE, RED], false) +
    bottle(x0 + 2 * (w + gap), [RED, RED, RED, RED], true) +
    `</svg>`
  );
}

/** How much of the square the picture takes: browser tab and launcher, maskable (the middle 80 % stays), Apple. */
export const SHARE = { plain: 0.62, maskable: 0.5, apple: 0.56 };
