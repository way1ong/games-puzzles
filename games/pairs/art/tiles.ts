// The pictures on the tiles (decision of 25.11: fruit, vegetables and everyday things): own drawings in SVG code,
// each in a 100 × 100 box. Every picture has a shape of its own and a dark outline, so it is told apart by its
// shape as well as by its colour (rule 6). Colours only from palette.ts. The page holds them once as symbols
// (`pairs-<picture>`); a tile shows one with <use>.
import type { Picture } from '../config.ts';
import { PAINT, type Paint } from './palette.ts';

const LINE = 4;

/** A shape with a fill from the palette and the outline. */
function part(tag: string, attrs: Record<string, string | number>, fill: Paint | 'none', outline = LINE): string {
  const a = Object.entries(attrs)
    .map(([k, v]) => `${k}="${v}"`)
    .join(' ');
  const stroke = outline > 0 ? ` stroke="${PAINT.outline}" stroke-width="${outline}" stroke-linejoin="round" stroke-linecap="round"` : '';
  return `<${tag} ${a} fill="${fill === 'none' ? 'none' : PAINT[fill]}"${stroke}/>`;
}

/** A line of a colour from the palette (stems, veins, steam). */
function stroke(d: string, color: Paint, width: number): string {
  return `<path d="${d}" fill="none" stroke="${PAINT[color]}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
}

/** A soft highlight that gives a fruit its roundness. */
const shine = (cx: number, cy: number, rx: number, ry: number) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${PAINT.shine}" opacity="0.55"/>`;

const leafAt = (d: string) => part('path', { d }, 'leaf', 3);

const DRAW: Record<Picture, () => string> = {
  apple: () =>
    part('path', { d: 'M50 30C38 20 16 24 16 48C16 72 34 88 50 83C66 88 84 72 84 48C84 24 62 20 50 30Z' }, 'apple') +
    stroke('M50 30C50 22 52 16 57 11', 'stem', 5) +
    leafAt('M56 20C62 10 75 9 80 13C74 22 63 25 56 20Z') +
    shine(34, 45, 6, 10),
  pear: () =>
    part('path', { d: 'M50 22C41 22 39 33 39 41C39 50 24 56 24 71C24 85 39 91 50 91C61 91 76 85 76 71C76 56 61 50 61 41C61 33 59 22 50 22Z' }, 'pear') +
    stroke('M50 22C50 16 48 12 45 8', 'stem', 5) +
    leafAt('M52 16C58 8 69 8 73 12C67 19 58 21 52 16Z') +
    shine(38, 68, 5, 9),
  cherries: () =>
    stroke('M33 60C37 40 48 26 58 15', 'stem', 4) +
    stroke('M67 58C65 40 62 27 58 15', 'stem', 4) +
    leafAt('M58 15C66 6 78 8 83 14C75 21 65 21 58 15Z') +
    part('circle', { cx: 31, cy: 68, r: 16 }, 'cherry') +
    part('circle', { cx: 68, cy: 66, r: 16 }, 'cherry') +
    shine(25, 63, 4, 6) +
    shine(62, 61, 4, 6),
  lemon: () =>
    `<g transform="rotate(-24 50 52)">` +
    part('path', { d: 'M10 52L19 47C28 30 72 30 81 47L90 52L81 57C72 74 28 74 19 57Z' }, 'lemon') +
    shine(38, 45, 10, 4) +
    `</g>`,
  grapes: () =>
    stroke('M50 30C50 22 53 16 58 11', 'stem', 5) +
    leafAt('M52 22C44 12 32 12 28 17C35 25 45 27 52 22Z') +
    [
      [33, 40],
      [50, 39],
      [67, 40],
      [41, 55],
      [59, 55],
      [50, 71],
      [33, 69],
      [67, 69],
    ]
      .map(([cx, cy]) => part('circle', { cx: cx!, cy: cy!, r: 10 }, 'grape', 3))
      .join(''),
  strawberry: () =>
    part('path', { d: 'M50 90C33 82 20 63 22 47C24 35 37 32 50 35C63 32 76 35 78 47C80 63 67 82 50 90Z' }, 'strawberry') +
    [
      [36, 48],
      [50, 50],
      [64, 48],
      [42, 62],
      [58, 62],
      [50, 75],
    ]
      .map(([cx, cy]) => `<ellipse cx="${cx}" cy="${cy}" rx="2.5" ry="3.5" fill="${PAINT.seed}"/>`)
      .join('') +
    part('path', { d: 'M50 38L36 24L48 28L50 14L54 28L66 22L60 36Z' }, 'leaf', 3),
  carrot: () =>
    stroke('M68 26C70 16 74 10 80 6', 'leafDark', 5) +
    stroke('M68 26C76 20 84 18 92 18', 'leafDark', 5) +
    stroke('M68 26C66 16 60 10 54 8', 'leafDark', 5) +
    part('path', { d: 'M58 22C70 20 82 32 78 44L30 86C25 91 17 84 22 79Z' }, 'carrot') +
    stroke('M46 46L54 50M38 58L46 61M32 70L38 72', 'outline', 3),
  mushroom: () =>
    part('path', { d: 'M38 56L35 84C35 90 65 90 65 84L62 56Z' }, 'stalk') +
    part('path', { d: 'M12 58C12 28 88 28 88 58C70 63 30 63 12 58Z' }, 'cap') +
    [
      [34, 44, 6],
      [56, 38, 7],
      [72, 50, 5],
      [48, 54, 4],
    ]
      .map(([cx, cy, r]) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${PAINT.capSpot}"/>`)
      .join(''),
  // Lying flat, so it is not taken for the leaf (both are green; the leaf stands on its stalk at a slant).
  cucumber: () =>
    stroke('M86 50H94', 'stem', 6) +
    part('path', { d: 'M10 52C10 42 20 37 32 37H68C80 37 88 42 88 50C88 59 80 64 68 64H32C20 64 10 61 10 52Z' }, 'cucumber') +
    [
      [24, 46],
      [38, 44],
      [52, 46],
      [66, 44],
      [78, 48],
      [30, 56],
      [46, 56],
      [62, 56],
    ]
      .map(([cx, cy]) => `<circle cx="${cx}" cy="${cy}" r="2.6" fill="${PAINT.cucumberSpot}"/>`)
      .join(''),
  key: () =>
    part('path', { d: 'M44 45H86V55H80V66H72V55H66V63H58V55H44Z' }, 'key') +
    part('circle', { cx: 30, cy: 50, r: 17 }, 'key') +
    part('circle', { cx: 30, cy: 50, r: 6 }, 'face', 3),
  bell: () =>
    part('circle', { cx: 50, cy: 14, r: 6 }, 'bell', 3) +
    part('circle', { cx: 50, cy: 80, r: 8 }, 'bell', 3) +
    part('path', { d: 'M50 18C35 18 29 32 29 49C29 61 23 67 16 73H84C77 67 71 61 71 49C71 32 65 18 50 18Z' }, 'bell') +
    shine(40, 40, 4, 10),
  cup: () =>
    stroke('M38 26C34 20 42 16 38 10M52 26C48 20 56 16 52 10', 'steam', 4) +
    `<path d="M68 42C86 40 88 66 66 66" fill="none" stroke="${PAINT.outline}" stroke-width="12" stroke-linecap="round"/>` +
    `<path d="M68 42C86 40 88 66 66 66" fill="none" stroke="${PAINT.cup}" stroke-width="5" stroke-linecap="round"/>` +
    part('path', { d: 'M20 32H72L67 78C66 85 60 88 54 88H38C32 88 27 85 26 78Z' }, 'cup'),
  umbrella: () =>
    stroke('M50 50V80C50 89 39 89 39 81', 'outline', 5) +
    part('path', { d: 'M12 52C12 26 88 26 88 52C82 45 75 45 69 52C63 45 56 45 50 52C44 45 37 45 31 52C25 45 18 45 12 52Z' }, 'umbrella') +
    stroke('M50 28V18', 'outline', 5),
  house: () =>
    part('rect', { x: 24, y: 46, width: 52, height: 40 }, 'wall') +
    part('rect', { x: 43, y: 62, width: 14, height: 24 }, 'door', 3) +
    part('rect', { x: 29, y: 54, width: 10, height: 10 }, 'window', 3) +
    part('rect', { x: 61, y: 54, width: 10, height: 10 }, 'window', 3) +
    part('path', { d: 'M14 50L50 16L86 50Z' }, 'roof'),
  boat: () =>
    stroke('M14 88C22 84 30 84 38 88C46 92 54 92 62 88C70 84 78 84 86 88', 'water', 4) +
    stroke('M48 66V14', 'outline', 4) +
    part('path', { d: 'M52 16L80 60H52Z' }, 'sail', 3) +
    part('path', { d: 'M44 24L24 58H44Z' }, 'sail', 3) +
    part('path', { d: 'M12 66H88L74 82H26Z' }, 'hull'),
  star: () => {
    const points = Array.from({ length: 10 }, (_, i) => {
      const r = i % 2 ? 15 : 38;
      const a = (Math.PI / 5) * i - Math.PI / 2;
      return `${(50 + r * Math.cos(a)).toFixed(1)},${(53 + r * Math.sin(a)).toFixed(1)}`;
    }).join(' ');
    return part('polygon', { points }, 'star');
  },
  moon: () => part('path', { d: 'M64 12C38 14 20 32 20 54C20 76 40 90 62 88C44 81 35 67 35 51C35 34 45 20 64 12Z' }, 'moon'),
  sun: () => {
    const rays = Array.from({ length: 8 }, (_, i) => {
      const a = (Math.PI / 4) * i;
      const at = (r: number, da: number) => `${(50 + r * Math.cos(a + da)).toFixed(1)},${(50 + r * Math.sin(a + da)).toFixed(1)}`;
      return part('polygon', { points: `${at(26, -0.22)} ${at(42, 0)} ${at(26, 0.22)}` }, 'sun', 3);
    }).join('');
    return rays + part('circle', { cx: 50, cy: 50, r: 21 }, 'sun');
  },
  heart: () => part('path', { d: 'M50 84C30 70 13 55 15 36C17 21 36 17 50 32C64 17 83 21 85 36C87 55 70 70 50 84Z' }, 'heart') + shine(32, 36, 5, 8),
  fish: () =>
    part('path', { d: 'M72 50L90 34V66Z' }, 'fish') +
    part('path', { d: 'M14 50C28 28 60 28 76 50C60 72 28 72 14 50Z' }, 'fish') +
    `<circle cx="30" cy="46" r="4" fill="${PAINT.eye}"/>` +
    stroke('M46 38C50 46 50 54 46 62', 'outline', 3),
  flower: () =>
    stroke('M50 60V92', 'leafDark', 5) +
    leafAt('M50 80C40 70 28 72 24 76C32 84 42 86 50 80Z') +
    Array.from({ length: 5 }, (_, i) => {
      const a = ((Math.PI * 2) / 5) * i - Math.PI / 2;
      return part('circle', { cx: (50 + 19 * Math.cos(a)).toFixed(1), cy: (40 + 19 * Math.sin(a)).toFixed(1), r: 12 }, 'petal', 3);
    }).join('') +
    part('circle', { cx: 50, cy: 40, r: 10 }, 'flowerHeart', 3),
  leaf: () =>
    stroke('M28 72L12 90', 'stem', 5) +
    part('path', { d: 'M26 74C22 40 50 12 88 10C88 48 60 78 26 74Z' }, 'leaf') +
    stroke('M30 70L82 16M44 56L42 40M56 44L56 28M54 58L70 56M66 44L80 42', 'leafDark', 3),
  tree: () =>
    part('rect', { x: 43, y: 74, width: 14, height: 16 }, 'trunk', 3) +
    part('path', { d: 'M50 10L72 38H62L80 60H66L84 80H16L34 60H20L38 38H28Z' }, 'pine'),
  drop: () => part('path', { d: 'M50 10C62 32 78 47 78 63C78 80 65 90 50 90C35 90 22 80 22 63C22 47 38 32 50 10Z' }, 'water') + shine(38, 62, 5, 11),
};

/** The inside of a picture's 100 × 100 box. */
export function pictureSvg(picture: Picture): string {
  return DRAW[picture]();
}

/** The id of a picture's symbol on the page. */
export const symbolId = (picture: Picture) => `pairs-${picture}`;

/** Every picture as a symbol, for one hidden <svg> on the page. */
export function symbolsSvg(pictures: readonly Picture[]): string {
  return pictures.map((p) => `<symbol id="${symbolId(p)}" viewBox="0 0 100 100">${pictureSvg(p)}</symbol>`).join('');
}
