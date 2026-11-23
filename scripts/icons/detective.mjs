// Detective: a magnifying glass. Our own picture.
export const TOKENS = { ground: '--accent', rim: '--bg', glass: '--surface', handle: '--mark' };

/** The picture on a square of `size`; `full` — the ground fills the square (maskable, Apple), else rounded. */
export function picture(size, { full, share }, C) {
  const r = size * share * 0.36;
  const cx = size / 2 - r * 0.32;
  const cy = size / 2 - r * 0.32;
  const rim = r * 0.24;
  // the handle starts at the rim, down and to the right
  const k = Math.SQRT1_2;
  const from = { x: cx + (r + rim * 0.2) * k, y: cy + (r + rim * 0.2) * k };
  const to = { x: cx + r * 2.05 * k, y: cy + r * 2.05 * k };
  const ground = full
    ? `<rect width="${size}" height="${size}" fill="${C.ground}"/>`
    : `<rect width="${size}" height="${size}" rx="${size * 0.22}" fill="${C.ground}"/>`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${ground}` +
    `<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" stroke="${C.handle}" stroke-width="${r * 0.44}" stroke-linecap="round"/>` +
    // a darker collar where the handle meets the rim
    `<line x1="${from.x}" y1="${from.y}" x2="${from.x + r * 0.3 * k}" y2="${from.y + r * 0.3 * k}" stroke="#000" stroke-opacity="0.22" stroke-width="${r * 0.44}"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${C.glass}" fill-opacity="0.28"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${C.rim}" stroke-width="${rim}"/>` +
    `<path d="M${cx - r * 0.55} ${cy - r * 0.15} A${r * 0.6} ${r * 0.6} 0 0 1 ${cx - r * 0.1} ${cy - r * 0.57}" fill="none" stroke="#fff" stroke-opacity="0.85" stroke-width="${rim * 0.5}" stroke-linecap="round"/>` +
    `</svg>`
  );
}

/** How much of the square the picture takes: browser tab and launcher, maskable (the middle 80 % stays), Apple. */
export const SHARE = { plain: 0.6, maskable: 0.5, apple: 0.56 };
