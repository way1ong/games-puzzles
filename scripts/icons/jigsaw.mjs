// Jigsaw: four pieces of a square, as the game cuts them (games/jigsaw/core/outline.ts — a round head on a narrower
// neck): three in place, the fourth lifted a little out of its corner. The colours from tokens.css. Our own picture,
// not taken from any game.
export const TOKENS = {
  ground: '--accent',
  piece: '--slot',
  edge: '--board',
};

/**
 * One side of a piece from (x0, y0) to (x1, y1): straight, or with a knob sticking out to the left of the way
 * (`out` = 1) or to its right (-1); the same measures as the game's usual knob, in parts of the side.
 */
function side(x0, y0, x1, y1, out) {
  if (!out) return `L${x1} ${y1}`;
  const len = Math.hypot(x1 - x0, y1 - y0);
  const ux = (x1 - x0) / len;
  const uy = (y1 - y0) / len;
  // the left of the way in a y-down drawing
  const nx = uy * out;
  const ny = -ux * out;
  const at = (t, n) => `${x0 + (ux * t + nx * n) * len} ${y0 + (uy * t + ny * n) * len}`;
  const [r, a, sh, reach] = [0.125, 0.07, 0.08, 0.26];
  const q = Math.sqrt(r * r - a * a);
  const low = reach - r - q;
  const bend = Math.min(0.06, (low * r) / a);
  const lt = (bend * q) / r;
  const ln = (bend * a) / r;
  const sweep = out > 0 ? 1 : 0;
  return (
    `L${at(0.5 - a - sh, 0)}` +
    `C${at(0.5 - a - sh * 0.4, 0)} ${at(0.5 - a + lt, low - ln)} ${at(0.5 - a, low)}` +
    `A${r * len} ${r * len} 0 1 ${sweep} ${at(0.5 + a, low)}` +
    `C${at(0.5 + a - lt, low - ln)} ${at(0.5 + a + sh * 0.4, 0)} ${at(0.5 + a + sh, 0)}` +
    `L${x1} ${y1}`
  );
}

/** A piece of side `s` with its top left at (x, y); knobs: top, right, bottom, left — 1 out, -1 in, 0 straight. */
function piece(x, y, s, [top, right, bottom, left]) {
  return (
    `M${x} ${y}` +
    side(x, y, x + s, y, top) +
    side(x + s, y, x + s, y + s, right) +
    side(x + s, y + s, x, y + s, bottom) +
    side(x, y + s, x, y, left) +
    'Z'
  );
}

/** The picture on a square of `size`; `full` — the ground fills the square (maskable, Apple), else rounded. */
export function picture(size, { full, share }, C) {
  const whole = size * share;
  const s = whole / 2;
  const x0 = (size - whole) / 2;
  const y0 = (size - whole) / 2;
  const stroke = Math.max(1.5, s * 0.035);
  // the knobs between the four: top left sticks out to the right and down; the others fit them
  const pieces = [
    piece(x0, y0, s, [0, 1, 1, 0]),
    piece(x0 + s, y0, s, [0, 0, 1, 1]),
    piece(x0, y0 + s, s, [1, 1, 0, 0]),
  ];
  // the fourth, lifted up and to the right
  const lift = s * 0.16;
  const last = piece(x0 + s + lift, y0 + s - lift, s, [1, 0, 0, 1]);
  const draw = (d) => `<path d="${d}" fill="${C.piece}" stroke="${C.edge}" stroke-width="${stroke}" stroke-linejoin="round"/>`;
  const ground = full
    ? `<rect width="${size}" height="${size}" fill="${C.ground}"/>`
    : `<rect width="${size}" height="${size}" rx="${size * 0.22}" fill="${C.ground}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${ground}${pieces.map(draw).join('')}${draw(last)}</svg>`;
}

/** How much of the square the picture takes: browser tab and launcher, maskable (the middle 80 % stays), Apple. */
export const SHARE = { plain: 0.56, maskable: 0.46, apple: 0.52 };
