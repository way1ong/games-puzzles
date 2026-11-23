// What a person may wear on top: glasses, a cap, a flower (in the hair or on the lapel).
import { FACE, FLOWER, GLASSES, HATS } from '../palette.ts';
import { circle, n, path, rect, stroke } from '../svg.ts';
import type { Look } from './looks.ts';

export function glasses(frame: Look['frame']): string {
  const colour = GLASSES[frame];
  const lens = (cx: number) =>
    frame === 'rect'
      ? rect(cx - 11, 87, 22, 14.5, GLASSES.lens, { rx: 4.5, 'fill-opacity': 0.22, stroke: colour, 'stroke-width': 2.2 })
      : circle(cx, 94, 10.5, GLASSES.lens, { 'fill-opacity': 0.22, stroke: colour, 'stroke-width': 2.3 });
  return (
    lens(86) +
    lens(114) +
    stroke('M96.6 92 Q100 89 103.4 92', colour, 2.2) +
    stroke('M75.5 91 L65 88.5', colour, 2.2) +
    stroke('M124.5 91 L135 88.5', colour, 2.2) +
    stroke('M79 89 q3 -2.4 6.5 -2.4', FACE.white, 1.4, { opacity: 0.7 }) +
    stroke('M107 89 q3 -2.4 6.5 -2.4', FACE.white, 1.4, { opacity: 0.7 })
  );
}

/** `volume` — the roundness gradient. */
export function hat(kind: NonNullable<Look['hat']>, volume: string): string {
  if (kind === 'flatcap') {
    const crown = 'M56 67 C53 52 60 40 76 34.5 C88 30.5 112 30.5 124 34.5 C141 40 147 52 144 65 Z';
    return (
      path(crown, HATS.flatcap.top) +
      path(crown, volume) +
      stroke('M100 31.5 C101.5 44 101.5 56 100 66', FACE.black, 1.6, { 'stroke-opacity': 0.19 }) +
      stroke('M70 40 C84 34 116 34 130 40', FACE.white, 1.4, { opacity: 0.2 }) +
      path('M60 65 C82 75 120 75 141 62 C144 66 143 71 138 73 C118 82 82 82 62 74 C57 72 56 67 60 65 Z', HATS.flatcap.brim) +
      stroke('M66 73 C86 80 116 80 136 71', FACE.white, 1.2, { opacity: 0.18 })
    );
  }
  const tones = HATS[kind];
  const crown = 'M55 52 C57 33 143 33 145 52 C145 58 139 63 133 63 L67 63 C61 63 55 58 55 52 Z';
  return (
    path(crown, tones.top) +
    path(crown, volume) +
    rect(65, 60, 70, 11, tones.band) +
    stroke('M65 65.5 L135 65.5', tones.badge, 1.2, { opacity: 0.8, 'stroke-linecap': 'butt' }) +
    path('M66 70 C81 80 119 80 134 70 L136 74 C119 87 81 87 64 74 Z', tones.visor) +
    stroke('M74 76 C88 81 112 81 126 76', FACE.white, 1.4, { opacity: 0.25 }) +
    circle(100, 51, 5.4, tones.badge, { stroke: tones.badgeDark, 'stroke-width': 1 }) +
    circle(100, 51, 2.2, tones.badgeDark)
  );
}

/** A flower of five petals with two leaves; `size` — the radius of a petal. */
export function flower(x: number, y: number, size = 4.6): string {
  const k = size / 4.6;
  let s =
    path(`M${n(x - 4 * k)} ${n(y + 6 * k)} q${n(-8 * k)} ${n(2 * k)} ${n(-10 * k)} ${n(10 * k)} q${n(8 * k)} ${n(-1 * k)} ${n(10 * k)} ${n(-10 * k)}Z`, FLOWER.leaf) +
    path(`M${n(x + 3 * k)} ${n(y + 7 * k)} q${n(8 * k)} 0 ${n(10 * k)} ${n(8 * k)} q${n(-8 * k)} 0 ${n(-10 * k)} ${n(-8 * k)}Z`, FLOWER.leafDark);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    s += circle(n(x + Math.cos(a) * 5.4 * k), n(y + Math.sin(a) * 5.4 * k), size, FLOWER.petal, { stroke: FLOWER.edge, 'stroke-width': n(0.8 * k) });
  }
  return s + circle(x, y, n(3 * k), FLOWER.centre);
}

/** Where a person wears a flower: in the hair, or on the lapel when a hat or short hair leaves no place. */
export function wornFlower(look: Look): string {
  const inHair = !look.hat && (look.style === 'bob' || look.style === 'long' || look.style === 'bun' || look.style === 'curly');
  return inHair ? flower(134, 60) : flower(70, 172, 3.6);
}

