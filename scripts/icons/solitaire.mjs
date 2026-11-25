// Solitaire: two cards fanned out on the table — an ace of hearts over an ace of spades. Our own picture, not taken
// from any game. The suit shapes are those of games/solitaire/art/suits.ts.
export const TOKENS = { ground: '--accent', face: '--card-face', line: '--card-line', black: '--suit-black', red: '--suit-red' };

const SPADE = 'M50 5C62 25 93 40 93 63C93 77 82 85 70 85C62 85 56 81 53 75C54 84 59 91 67 96H33C41 91 46 84 47 75C44 81 38 85 30 85C18 85 7 77 7 63C7 40 38 25 50 5Z';
const HEART = 'M50 90C18 67 5 48 5 31C5 16 16 6 30 6C39 6 46 11 50 19C54 11 61 6 70 6C84 6 95 16 95 31C95 48 82 67 50 90Z';

/** The picture on a square of `size`; `full` — the ground fills the square (maskable, Apple), else rounded. */
export function picture(size, { full, share }, C) {
  const h = size * share;
  const w = h * (5 / 7);
  const cx = size / 2;
  const cy = size / 2;
  const r = w * 0.1;
  const line = Math.max(1, w * 0.03);
  const card = (angle, dx, path, ink, at) => {
    const x = cx - w / 2 + dx;
    const y = cy - h / 2;
    const s = (w * 0.56) / 100;
    return (
      `<g transform="rotate(${angle} ${cx + dx} ${cy + h * 0.4})">` +
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${C.face}" stroke="${C.line}" stroke-width="${line}"/>` +
      `<path d="${path}" fill="${ink}" transform="translate(${x + w * at} ${y + h * 0.3}) scale(${s})"/>` +
      `</g>`
    );
  };
  const ground = full
    ? `<rect width="${size}" height="${size}" fill="${C.ground}"/>`
    : `<rect width="${size}" height="${size}" rx="${size * 0.22}" fill="${C.ground}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${ground}${card(-12, -w * 0.2, SPADE, C.black, 0.08)}${card(10, w * 0.2, HEART, C.red, 0.22)}</svg>`;
}

/** How much of the square the picture takes: browser tab and launcher, maskable (the middle 80 % stays), Apple. */
export const SHARE = { plain: 0.62, maskable: 0.5, apple: 0.56 };
