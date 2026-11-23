// A face: skin with light and shade, eyes, brows, nose, mouth, and what age and a razor add.
import type { Hair } from '../../core/traits.ts';
import { EYES, FACE, HAIR_PAINT, SKIN } from '../palette.ts';
import { circle, el, ellipse, path, stroke } from '../svg.ts';
import { FRINGE } from './hair.ts';
import type { Look } from './looks.ts';

export const HEAD = 'M65 84 C65 54 80 36 100 36 C120 36 135 54 135 84 C135 106 126 124 112 131 C106 134 94 134 88 131 C74 124 65 106 65 84 Z';

/** References to the definitions of a portrait. */
export interface FaceRefs {
  /** A clip to the head's outline; a soft blur; light from one side. */
  head: string;
  blur: string;
  side: string;
}

function eye(cx: number, cy: number, look: Look): string {
  const skin = SKIN[look.skin];
  let s = path(`M${cx - 7} ${cy} Q${cx} ${cy - 7} ${cx + 7} ${cy} Q${cx} ${cy + 5.6} ${cx - 7} ${cy} Z`, FACE.eyeWhite);
  s += circle(cx + 0.4, cy - 0.2, 3.1, EYES[look.eyes]) + circle(cx + 0.4, cy - 0.2, 1.55, FACE.pupil) + circle(cx + 1.5, cy - 1.3, 0.95, FACE.white);
  s += stroke(`M${cx - 7.6} ${cy + 0.4} Q${cx} ${cy - 7.6} ${cx + 7.6} ${cy + 0.4}`, FACE.lid, 1.9);
  s += stroke(`M${cx - 5.5} ${cy + 3.4} Q${cx} ${cy + 5.6} ${cx + 5.5} ${cy + 3.4}`, skin.shade, 1, { opacity: 0.9 });
  if (look.lashes) {
    const out = cx < 100 ? -1 : 1;
    s += stroke(`M${cx + out * 7} ${cy - 0.6} l${out * 2.6} -2.2`, FACE.lid, 1.4) + stroke(`M${cx + out * 5.2} ${cy - 2.6} l${out * 1.8} -2.4`, FACE.lid, 1.2);
  }
  return s;
}

function mouth(look: Look): string {
  const skin = SKIN[look.skin];
  const shapes = {
    smile: ['M90 119 Q100 126 110 119', 'M93 121.4 Q100 127.6 107 121.4 Q100 124.6 93 121.4 Z'],
    neutral: ['M91 120.5 Q100 123 109 120.5', 'M94 122 Q100 125.6 106 122 Q100 123.8 94 122 Z'],
    smirk: ['M91 121.5 Q103 124.6 110.5 117.8', 'M95 123 Q102 126.4 108 121.4 Q102 124.6 95 123 Z'],
  } as const;
  const [lips, lower] = shapes[look.mouth];
  return path(lower, skin.lip) + stroke(lips, skin.lipDark, 2.1);
}

const MOUSTACHE = 'M85 116.5 C89.5 110 97 110.5 100 113.2 C103 110.5 110.5 110 115 116.5 C109 119.6 104.6 117.6 100 117 C95.4 117.6 91 119.6 85 116.5 Z';

export function face(look: Look, hair: Hair, refs: FaceRefs): string {
  const skin = SKIN[look.skin];
  const h = HAIR_PAINT[hair];
  let s = path(HEAD, skin.base);
  // light from the left, the shadow of the hair or the hat on the forehead, the chin's shade
  let shade = path(HEAD, refs.side);
  const fringe = FRINGE[look.style];
  if (fringe && look.style !== 'sides') shade += el('g', { transform: 'translate(0 3.5)', opacity: 0.55, filter: refs.blur }, path(fringe, skin.shade));
  if (look.style === 'curly') shade += ellipse(100, 66, 34, 8, skin.shade, { opacity: 0.55, filter: refs.blur });
  if (look.hat) shade += ellipse(100, 70, 36, 7, skin.shade, { opacity: 0.6, filter: refs.blur });
  shade += ellipse(100, 136, 30, 10, skin.shade, { opacity: 0.6, filter: refs.blur });
  s += el('g', { 'clip-path': refs.head }, shade);

  s += ellipse(79, 108, 7.5, 4.2, FACE.blush, { opacity: 0.3, filter: refs.blur }) + ellipse(121, 108, 7.5, 4.2, FACE.blush, { opacity: 0.3, filter: refs.blur });
  if (look.freckles) {
    for (const [x, y] of [[80, 101], [84.5, 103.5], [78, 105.5], [88, 101.5], [120, 101], [115.5, 103.5], [122, 105.5], [112, 101.5]] as const) {
      s += circle(x, y, 0.95, FACE.freckle, { opacity: 0.7 });
    }
  }
  if (look.older) {
    s += stroke('M72 93 l-4 -2.2 M72 96 l-4.2 0.8', skin.shade, 1.2) + stroke('M128 93 l4 -2.2 M128 96 l4.2 0.8', skin.shade, 1.2);
    s += stroke('M90 109 Q86 116 89 123', skin.shade, 1.3, { opacity: 0.85 }) + stroke('M110 109 Q114 116 111 123', skin.shade, 1.3, { opacity: 0.85 });
  }
  s += eye(86, 94, look) + eye(114, 94, look);
  const lift = look.raisedBrows ? 1 : 0;
  const width = look.heavyBrows ? 3.3 : 2.6;
  s += stroke(`M77 ${84 - lift} Q86 ${78.5 - lift} 95 ${82.5 - lift}`, h.dark, width) + stroke(`M105 ${82.5 - lift} Q114 ${78.5 - lift} 123 ${84 - lift}`, h.dark, width);
  s += stroke('M100.5 95 C99 103 96.6 107.4 97.6 110.2 C99 112.2 102.6 112.2 104.8 110.6', skin.shade, 1.9) + ellipse(101, 110.6, 3.4, 1.4, skin.shade, { opacity: 0.45 });
  if (look.stubble) s += path('M69 104 C73 123 86 133 100 134 C114 133 127 123 131 104 C125 117 113 125 100 125 C87 125 75 117 69 104 Z', h.dark, { opacity: 0.16 });
  if (look.beard) {
    s += path('M67 98 C69 126 84 143 100 145 C116 143 131 126 133 98 C129 110 122 116 114 117.5 C108 113.5 92 113.5 86 117.5 C78 116 71 110 67 98 Z', h.base);
    s += stroke('M76 118 q4 8 2 14 M88 128 q2 7 0 12 M112 128 q-2 7 0 12 M124 118 q-4 8 -2 14', h.light, 1.6, { opacity: 0.8 });
  }
  s += mouth(look);
  if (look.beard || look.moustache) s += path(MOUSTACHE, look.beard ? h.dark : h.base);
  return s;
}

/** Ears show unless the hair covers them. */
export function ears(look: Look): string {
  if (look.style === 'bob' || look.style === 'long') return '';
  const skin = SKIN[look.skin];
  return ellipse(64.5, 95, 6.2, 10, skin.base) + ellipse(65.5, 95, 3, 6, skin.shade) + ellipse(135.5, 95, 6.2, 10, skin.base) + ellipse(134.5, 95, 3, 6, skin.shade);
}
