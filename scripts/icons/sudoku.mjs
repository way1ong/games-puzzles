// Sudoku: a 3 × 3 board with three digits on its diagonal and one chosen cell — "the next digit goes here".
// The digits are drawn as strokes (no font). Our own picture, not taken from any game.
export const TOKENS = { ground: '--accent', cell: '--surface', digit: '--given', chosen: '--selected' };

/** Digits as strokes on a unit square (0…1), drawn with round ends. */
const DIGITS = {
  1: 'M0.36 0.3 0.54 0.16 0.54 0.84',
  4: 'M0.64 0.84 0.64 0.16 0.24 0.62 0.8 0.62',
  7: 'M0.26 0.17 0.76 0.17 0.44 0.84',
};

/** The picture on a square of `size`; `full` — the ground fills the square (maskable, Apple), else rounded. */
export function picture(size, { full, share }, C) {
  const grid = size * share;
  const gap = grid * 0.06;
  const cell = (grid - 2 * gap) / 3;
  const x0 = (size - grid) / 2;
  const y0 = (size - grid) / 2;
  const r = cell * 0.14;
  const at = (col, row) => ({ x: x0 + col * (cell + gap), y: y0 + row * (cell + gap) });
  const box = (col, row, fill) => {
    const { x, y } = at(col, row);
    return `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="${r}" fill="${fill}"/>`;
  };
  const digit = (col, row, d) => {
    const { x, y } = at(col, row);
    const path = DIGITS[d].replace(/[\d.]+ [\d.]+/g, (pair) => {
      const [px, py] = pair.split(' ').map(Number);
      return `${(x + px * cell).toFixed(2)} ${(y + py * cell).toFixed(2)}`;
    });
    return `<path d="${path}" fill="none" stroke="${C.digit}" stroke-width="${cell * 0.12}" stroke-linecap="round" stroke-linejoin="round"/>`;
  };
  const cells = [];
  for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) cells.push(box(col, row, col === 0 && row === 2 ? C.chosen : C.cell));
  const ground = full
    ? `<rect width="${size}" height="${size}" fill="${C.ground}"/>`
    : `<rect width="${size}" height="${size}" rx="${size * 0.22}" fill="${C.ground}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${ground}${cells.join('')}${digit(0, 0, 7)}${digit(1, 1, 4)}${digit(2, 2, 1)}</svg>`;
}

/** How much of the square the picture takes: browser tab and launcher, maskable (the middle 80 % stays), Apple. */
export const SHARE = { plain: 0.62, maskable: 0.52, apple: 0.58 };
