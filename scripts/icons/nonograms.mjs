// Nonograms: a sheet of squared paper with a heart filled in cell by cell — the small heart of the game's own album
// (games/nonograms/art/pictures.ts). Our own picture, not taken from any game.
export const TOKENS = { ground: '--accent', sheet: '--sheet', ink: '--ink', line: '--grid-line' };

const HEART = ['.#.#.', '#####', '#####', '.###.', '..#..'];

/** The picture on a square of `size`; `full` — the ground fills the square (maskable, Apple), else rounded. */
export function picture(size, { full, share }, C) {
  const n = HEART.length;
  const side = size * share;
  const cell = side / n;
  const x0 = (size - side) / 2;
  const y0 = (size - side) / 2;
  const line = Math.max(1, cell * 0.05);
  let cells = '';
  HEART.forEach((row, r) =>
    [...row].forEach((ch, c) => {
      if (ch === '#') cells += `<rect x="${x0 + c * cell}" y="${y0 + r * cell}" width="${cell}" height="${cell}" fill="${C.ink}"/>`;
    }),
  );
  let grid = '';
  for (let i = 1; i < n; i++) {
    grid += `<path d="M${x0 + i * cell} ${y0}V${y0 + side}M${x0} ${y0 + i * cell}H${x0 + side}" stroke="${C.line}" stroke-width="${line}"/>`;
  }
  const pad = cell * 0.18;
  const ground = full
    ? `<rect width="${size}" height="${size}" fill="${C.ground}"/>`
    : `<rect width="${size}" height="${size}" rx="${size * 0.22}" fill="${C.ground}"/>`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${ground}` +
    `<rect x="${x0 - pad}" y="${y0 - pad}" width="${side + 2 * pad}" height="${side + 2 * pad}" rx="${pad}" fill="${C.sheet}"/>` +
    `${cells}${grid}</svg>`
  );
}

/** How much of the square the picture takes: browser tab and launcher, maskable (the middle 80 % stays), Apple. */
export const SHARE = { plain: 0.62, maskable: 0.5, apple: 0.56 };
