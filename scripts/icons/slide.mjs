// Slide: a small board of the fifteen as the game draws it (games/slide/styles/app.css): eight tiles with an edge on
// the board, the gap in the corner, and the tile next to it halfway into the gap — sliding. The colours from
// tokens.css. Our own picture, not taken from any game.
export const TOKENS = {
  ground: '--accent',
  board: '--board',
  tile: '--tile',
  line: '--tile-line',
};

/** The picture on a square of `size`; `full` — the ground fills the square (maskable, Apple), else rounded. */
export function picture(size, { full, share }, C) {
  const side = size * share;
  const x0 = (size - side) / 2;
  const y0 = (size - side) / 2;
  const cell = side / 3;
  const pad = cell * 0.07;
  const stroke = Math.max(1.5, cell * 0.05);
  const tile = (c, r, shift = 0) =>
    `<rect x="${x0 + c * cell + pad + shift}" y="${y0 + r * cell + pad}" width="${cell - 2 * pad}" height="${cell - 2 * pad}" rx="${cell * 0.16}" fill="${C.tile}" stroke="${C.line}" stroke-width="${stroke}"/>`;
  const tiles = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) if (!(r === 2 && c >= 1)) tiles.push(tile(c, r));
  // the moving tile: halfway between its cell and the gap
  tiles.push(tile(1, 2, cell * 0.5));
  const ground = full
    ? `<rect width="${size}" height="${size}" fill="${C.ground}"/>`
    : `<rect width="${size}" height="${size}" rx="${size * 0.22}" fill="${C.ground}"/>`;
  const board = `<rect x="${x0 - pad}" y="${y0 - pad}" width="${side + 2 * pad}" height="${side + 2 * pad}" rx="${cell * 0.2}" fill="${C.board}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${ground}${board}${tiles.join('')}</svg>`;
}

/** How much of the square the picture takes: browser tab and launcher, maskable (the middle 80 % stays), Apple. */
export const SHARE = { plain: 0.6, maskable: 0.5, apple: 0.56 };
