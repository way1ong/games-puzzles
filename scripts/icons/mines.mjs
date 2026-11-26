// Mines: four tiles of the field — one open with a 1, one with a flag, two still closed (raised, a light and a dark
// edge), as the game draws them (games/mines/styles/app.css). Our own picture, not taken from any game.
export const TOKENS = {
  ground: '--accent',
  closed: '--closed',
  light: '--closed-light',
  dark: '--closed-dark',
  open: '--open',
  grid: '--grid',
  one: '--n1',
  flag: '--flag',
  pole: '--pole',
};

/** The picture on a square of `size`; `full` — the ground fills the square (maskable, Apple), else rounded. */
export function picture(size, { full, share }, C) {
  const side = size * share;
  const cell = side / 2;
  const x0 = (size - side) / 2;
  const y0 = (size - side) / 2;
  const edge = cell * 0.12;
  const closed = (x, y) =>
    `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" fill="${C.dark}"/>` +
    `<path d="M${x} ${y + cell}V${y}H${x + cell}L${x + cell - edge} ${y + edge}H${x + edge}V${y + cell - edge}Z" fill="${C.light}"/>` +
    `<rect x="${x + edge}" y="${y + edge}" width="${cell - 2 * edge}" height="${cell - 2 * edge}" fill="${C.closed}"/>`;
  const open = (x, y) =>
    `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" fill="${C.open}" stroke="${C.grid}" stroke-width="${Math.max(1, cell * 0.02)}"/>`;
  const one = (x, y) =>
    `<path d="M${x + cell * 0.38} ${y + cell * 0.32}L${x + cell * 0.54} ${y + cell * 0.22}V${y + cell * 0.78}M${x + cell * 0.36} ${y + cell * 0.78}H${x + cell * 0.7}" fill="none" stroke="${C.one}" stroke-width="${cell * 0.13}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const flag = (x, y) => {
    const s = cell / 24;
    return (
      `<g transform="translate(${x + cell * 0.12} ${y + cell * 0.1}) scale(${s * 0.8})">` +
      `<path d="M8 20.5V4" stroke="${C.pole}" stroke-width="2" stroke-linecap="round"/>` +
      `<path d="M8.2 4.2h9.6l-2.7 3.9 2.7 3.9H8.2Z" fill="${C.flag}" stroke="${C.pole}" stroke-width="0.8" stroke-linejoin="round"/>` +
      `<path d="M5 20.5h7" stroke="${C.pole}" stroke-width="2" stroke-linecap="round"/></g>`
    );
  };
  const ground = full
    ? `<rect width="${size}" height="${size}" fill="${C.ground}"/>`
    : `<rect width="${size}" height="${size}" rx="${size * 0.22}" fill="${C.ground}"/>`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${ground}` +
    open(x0, y0) +
    one(x0, y0) +
    closed(x0 + cell, y0) +
    flag(x0 + cell, y0) +
    closed(x0, y0 + cell) +
    closed(x0 + cell, y0 + cell) +
    `</svg>`
  );
}

/** How much of the square the picture takes: browser tab and launcher, maskable (the middle 80 % stays), Apple. */
export const SHARE = { plain: 0.62, maskable: 0.5, apple: 0.56 };
