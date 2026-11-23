// Hairstyles: what is behind the head, and what lies over the forehead. A hat hides the top of the hair.
import type { Hair } from '../../core/traits.ts';
import { HAIR_PAINT } from '../palette.ts';
import { circle, el, n, path, stroke } from '../svg.ts';
import type { HairStyle } from './looks.ts';

type Tones = (typeof HAIR_PAINT)[Hair];

const BACK: Partial<Record<HairStyle, string>> = {
  bob: 'M57 94 C53 52 76 27 100 27 C124 27 147 52 143 94 C143 112 145 125 149 135 C137 141 124 137 120 129 L80 129 C76 137 63 141 51 135 C55 125 57 112 57 94 Z',
  long: 'M57 94 C51 50 76 25 100 25 C124 25 149 50 143 94 C147 124 157 154 151 188 C147 198 133 196 129 188 C133 170 127 150 127 130 L73 130 C73 150 67 170 71 188 C67 196 53 198 49 188 C43 154 53 124 57 94 Z',
};

/** The hair over the forehead; also the shape of the shadow it throws on the face. */
export const FRINGE: Partial<Record<HairStyle, string>> = {
  bob: 'M62 90 C59 54 78 31 102 31 C127 31 141 52 139 86 C133 71 121 61 107 57 C99 70 84 82 62 90 Z',
  long: 'M63 96 C59 58 78 31 100 31 C122 31 141 58 137 96 C133 73 121 59 104 56 L100 51 L96 56 C79 59 67 73 63 96 Z',
  bun: 'M64 90 C60 54 78 32 100 32 C122 32 140 54 136 90 C132 70 120 57 100 57 C80 57 68 70 64 90 Z',
  short: 'M63 84 C61 50 82 29 104 29 C127 31 141 52 137 82 C135 71 129 65 121 63 C108 59 90 61 80 63 C71 67 65 74 63 84 Z',
  sides:
    'M63 97 C61 86 62 76 66 70 L74 70 C72 78 71 88 71.5 96 C68.5 98.5 65 98.5 63 97 Z M137 97 C139 86 138 76 134 70 L126 70 C128 78 129 88 128.5 96 C131.5 98.5 135 98.5 137 97 Z',
};

const SHINE: Partial<Record<HairStyle, string>> = {
  bob: 'M80 42 C92 35 110 35 122 42',
  long: 'M76 46 C84 38 92 36 98 36 M104 36 C112 37 120 41 126 48',
  bun: 'M78 46 C90 38 110 38 122 46',
  short: 'M84 38 C96 33 112 33 124 40',
};

function curls(h: Tones): string {
  let s = path('M65 86 C63 52 80 37 100 37 C120 37 137 52 135 86 C127 68 115 62 100 62 C85 62 73 68 65 86 Z', h.base);
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI + (i / 10) * Math.PI;
    s += circle(n(100 + 37 * Math.cos(a)), n(72 + 38 * Math.sin(a)), 11.5, h.base);
  }
  for (const [x, y, r] of [[73, 66, 9], [84, 59, 9.5], [97, 56, 10], [110, 57, 9.5], [122, 62, 9], [131, 70, 8]] as const) s += circle(x, y, r, h.base);
  for (const [x, y] of [[78, 44], [96, 36], [114, 40], [128, 52], [86, 56], [106, 52], [68, 58]] as const) {
    s += stroke(`M${x - 5} ${y + 2} q5 -6 10 0`, h.light, 2.2, { opacity: 0.8 });
  }
  return s;
}

/** Hair behind the head and the shoulders (drawn first). `volume` — the reference to the roundness gradient. */
export function hairBehind(style: HairStyle, hair: Hair, volume: string): string {
  const h = HAIR_PAINT[hair];
  let s = '';
  if (style === 'bun') s += circle(100, 25, 16, h.base) + stroke('M88 22 q12 -8 24 0 M90 30 q10 5 20 0', h.light, 2, { opacity: 0.7 });
  const back = BACK[style];
  if (back) s += path(back, h.base) + path(back, volume);
  return s;
}

/** Long hair falling over the shoulders (drawn over the coat). */
export function hairOnShoulders(style: HairStyle, hair: Hair): string {
  if (style !== 'long') return '';
  const h = HAIR_PAINT[hair];
  return (
    path('M62 98 C56 126 51 156 59 186 C65 193 74 191 75 183 C72 162 74 134 74 112 Z', h.base) +
    path('M138 98 C144 126 149 156 141 186 C135 193 126 191 125 183 C128 162 126 134 126 112 Z', h.base) +
    stroke('M64 120 C61 144 60 164 64 182', h.dark, 1.6, { opacity: 0.6 }) +
    stroke('M136 120 C139 144 140 164 136 182', h.dark, 1.6, { opacity: 0.6 })
  );
}

/** Hair over the face. Under a hat only what is below the brim shows (`belowHat` — a clip that keeps it). */
export function hairInFront(style: HairStyle, hair: Hair, sideburns: boolean, belowHat: string | null): string {
  const h = HAIR_PAINT[hair];
  let s = '';
  const fringe = FRINGE[style];
  if (style === 'curly') s += curls(h);
  else if (fringe) {
    s += belowHat ? el('g', { 'clip-path': belowHat }, path(fringe, h.base)) : path(fringe, h.base) + (SHINE[style] ? stroke(SHINE[style] as string, h.light, 3, { opacity: 0.7 }) : '');
  }
  if (style === 'long') s += stroke('M100 52 L100 40', h.dark, 1.4, { opacity: 0.6 });
  if (style === 'bun') s += stroke('M66 84 q-2 8 1 14', h.base, 2) + stroke('M134 84 q2 8 -1 14', h.base, 2);
  if (style === 'sides') s += stroke('M66.5 75 C65.5 82 65.5 89 66.5 95 M134 75 C135 82 135 89 134 95', h.light, 1.3, { opacity: 0.8 });
  if (sideburns) {
    s +=
      path('M64 76 C63 85 64 94 66 100 C67.5 100.6 69 100 69.5 98 C69 90 69.5 83 71 76 Z', h.base) +
      path('M136 76 C137 85 136 94 134 100 C132.5 100.6 131 100 130.5 98 C131 90 130.5 83 129 76 Z', h.base);
  }
  return s;
}
