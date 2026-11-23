// Blocks: three blocks and one empty place in a 2 × 2 grid — "fill the gap". Our own picture, not taken
// from any game.
export const TOKENS = { ground: '--accent', a: '--c1', b: '--c2', c: '--c3', ghost: '--surface' };

/** The picture on a square of `size`; `full` — the ground fills the square (maskable, Apple), else rounded. */
export function picture(size, { full, share }, C) {
  const grid = size * share;
  const gap = grid * 0.07;
  const cell = (grid - gap) / 2;
  const x0 = (size - grid) / 2;
  const y0 = (size - grid) / 2;
  const r = cell * 0.16;
  const bevel = cell * 0.09;
  const at = (col, row) => ({ x: x0 + col * (cell + gap), y: y0 + row * (cell + gap) });
  const block = (col, row, fill) => {
    const { x, y } = at(col, row);
    return [
      `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="${r}" fill="${fill}"/>`,
      `<rect x="${x}" y="${y + cell - bevel}" width="${cell}" height="${bevel}" rx="${r / 2}" fill="#000" fill-opacity="0.22"/>`,
      `<rect x="${x + r}" y="${y + bevel * 0.4}" width="${cell - 2 * r}" height="${bevel * 0.6}" rx="${bevel * 0.3}" fill="#fff" fill-opacity="0.35"/>`,
    ].join('');
  };
  const ghost = (() => {
    const { x, y } = at(1, 0);
    const w = cell * 0.055;
    return `<rect x="${x + w / 2}" y="${y + w / 2}" width="${cell - w}" height="${cell - w}" rx="${r}" fill="none" stroke="${C.ghost}" stroke-width="${w}" stroke-dasharray="${cell * 0.16} ${cell * 0.1}" stroke-opacity="0.9"/>`;
  })();
  const ground = full
    ? `<rect width="${size}" height="${size}" fill="${C.ground}"/>`
    : `<rect width="${size}" height="${size}" rx="${size * 0.22}" fill="${C.ground}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${ground}${block(0, 0, C.a)}${block(0, 1, C.b)}${block(1, 1, C.c)}${ghost}</svg>`;
}

/** How much of the square the picture takes: browser tab and launcher, maskable (the middle 80 % stays), Apple. */
export const SHARE = { plain: 0.6, maskable: 0.5, apple: 0.56 };
