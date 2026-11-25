// Words: three letter tiles on an arc, joined by a line — "a word made by sliding across the letters".
// The letters are drawn as strokes (no font). Our own picture, not taken from any game.
export const TOKENS = { ground: '--accent', tile: '--surface', letter: '--text', line: '--on-accent' };

/** Letters as strokes on a unit square (0…1), drawn with round ends: W, O, R (our own shapes). */
const LETTERS = {
  W: 'M0.18 0.24 0.32 0.78 0.5 0.4 0.68 0.78 0.82 0.24',
  O: 'M0.5 0.2 C0.78 0.2 0.8 0.42 0.8 0.5 C0.8 0.62 0.74 0.8 0.5 0.8 C0.26 0.8 0.2 0.62 0.2 0.5 C0.2 0.38 0.26 0.2 0.5 0.2 Z',
  D: 'M0.26 0.2 0.26 0.8 0.46 0.8 C0.74 0.8 0.8 0.62 0.8 0.5 C0.8 0.38 0.74 0.2 0.46 0.2 Z',
};

/** The picture on a square of `size`; `full` — the ground fills the square (maskable, Apple), else rounded. */
export function picture(size, { full, share }, C) {
  const area = size * share;
  const tile = area * 0.36;
  const x0 = (size - area) / 2;
  const y0 = (size - area) / 2;
  // three tiles on an arc: left low, middle high, right low
  const spots = [
    [x0 + tile / 2, y0 + area * 0.66],
    [x0 + area / 2, y0 + area * 0.3],
    [x0 + area - tile / 2, y0 + area * 0.66],
  ];
  const r = tile / 2;
  const line = `<polyline points="${spots.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')}" fill="none" stroke="${C.line}" stroke-width="${(tile * 0.14).toFixed(1)}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const glyph = (letter, cx, cy) => {
    const box = tile * 0.62;
    const ox = cx - box / 2;
    const oy = cy - box / 2;
    const path = LETTERS[letter].replace(/(\d*\.?\d+) (\d*\.?\d+)/g, (_, px, py) => `${(ox + Number(px) * box).toFixed(2)} ${(oy + Number(py) * box).toFixed(2)}`);
    return `<path d="${path}" fill="none" stroke="${C.letter}" stroke-width="${(tile * 0.1).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"/>`;
  };
  const tiles = spots.map(([x, y], i) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${C.tile}"/>${glyph(['W', 'O', 'D'][i], x, y)}`).join('');
  const ground = full
    ? `<rect width="${size}" height="${size}" fill="${C.ground}"/>`
    : `<rect width="${size}" height="${size}" rx="${size * 0.22}" fill="${C.ground}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${ground}${line}${tiles}</svg>`;
}

/** How much of the square the picture takes: browser tab and launcher, maskable (the middle 80 % stays), Apple. */
export const SHARE = { plain: 0.68, maskable: 0.56, apple: 0.62 };
