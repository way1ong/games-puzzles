// Pairs: two tiles side by side, each with the same star and its side showing below and on the right — a pair to
// take off. Our own picture, not taken from any game.
export const TOKENS = { ground: '--accent', face: '--tile-face', side: '--tile-side', line: '--tile-line', mark: '--accent' };

/** A five-pointed star around (cx, cy). */
function star(cx, cy, outer, fill) {
  const points = Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 ? outer * 0.42 : outer;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
  }).join(' ');
  return `<polygon points="${points}" fill="${fill}"/>`;
}

/** The picture on a square of `size`; `full` — the ground fills the square (maskable, Apple), else rounded. */
export function picture(size, { full, share }, C) {
  const span = size * share;
  const gap = span * 0.07;
  const w = (span - gap) / 2 / 1.08;
  const lift = w * 0.12;
  const h = w * 1.25;
  const x0 = (size - (2 * w + gap + lift)) / 2;
  const y0 = (size - (h + lift)) / 2;
  const r = w * 0.14;
  const line = Math.max(1, w * 0.035);
  const tile = (x) =>
    `<rect x="${x + lift}" y="${y0 + lift}" width="${w}" height="${h}" rx="${r}" fill="${C.side}"/>` +
    `<rect x="${x + line / 2}" y="${y0 + line / 2}" width="${w - line}" height="${h - line}" rx="${r}" fill="${C.face}" stroke="${C.line}" stroke-width="${line}"/>` +
    star(x + w / 2, y0 + h / 2 + w * 0.03, w * 0.34, C.mark);
  const ground = full
    ? `<rect width="${size}" height="${size}" fill="${C.ground}"/>`
    : `<rect width="${size}" height="${size}" rx="${size * 0.22}" fill="${C.ground}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${ground}${tile(x0)}${tile(x0 + w + gap)}</svg>`;
}

/** How much of the square the picture takes: browser tab and launcher, maskable (the middle 80 % stays), Apple. */
export const SHARE = { plain: 0.74, maskable: 0.6, apple: 0.68 };
