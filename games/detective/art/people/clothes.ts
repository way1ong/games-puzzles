// Clothes: a coat with lapels or a cardigan — both with two buttons whose colour is a trait; a shirt, a
// scarf (every colour has its own pattern), a bow, a bag strap.
import type { Buttons, Scarf } from '../../core/traits.ts';
import { buttonArt } from '../button.ts';
import { COATS, EXTRAS, FACE, SCARF_PAINT, SHIRTS, SKIN, darker } from '../palette.ts';
import { circle, el, path, rect, stroke } from '../svg.ts';
import type { Look } from './looks.ts';

const BODY = 'M12 200 C14 167 45 150 84 146 L116 146 C155 150 186 167 188 200 Z';

/** The pattern of a scarf: red — stripes, yellow — dots, blue — slanted lines. */
export function scarfPattern(id: string, scarf: Scarf): string {
  const { main, other } = SCARF_PAINT[scarf];
  const ground = rect(0, 0, 10, 10, main);
  const marks =
    scarf === 'red'
      ? rect(0, 0, 10, 4, other)
      : scarf === 'yellow'
        ? circle(2.5, 2.5, 1.5, other) + circle(7.5, 7.5, 1.5, other)
        : stroke('M-2 8 L8 -2 M3 13 L13 3', other, 1.8, { 'stroke-linecap': 'butt' });
  return el('pattern', { id, width: 10, height: 10, patternUnits: 'userSpaceOnUse' }, ground + marks);
}

export interface Outfit {
  buttons: Buttons;
  scarf: Scarf | null;
}

/** `volume` — the roundness gradient; `scarfFill` — the scarf pattern, when there is a scarf. */
export function clothes(look: Look, outfit: Outfit, volume: string, scarfFill: string | null): string {
  const skin = SKIN[look.skin];
  const coat = COATS[look.coat];
  const dark = darker(coat);
  const shirt = SHIRTS[look.shirt];
  let s = path(BODY, coat) + path(BODY, volume);
  // the neck, with the chin's shade
  s += path('M88 112 L88 150 C94 154 106 154 112 150 L112 112 Z', skin.base) + path('M88 126 C94 135 106 135 112 126 L112 140 C106 145 94 145 88 140 Z', skin.shade, { opacity: 0.75 });
  const edge = { stroke: FACE.black, 'stroke-opacity': 0.13, 'stroke-width': 1 };
  if (look.top === 'cardigan') {
    // a round neck with a ribbed band, the shirt collar over it, buttons down the front
    s += path('M81 143 C89 161 111 161 119 143 L124 148 C113 170 87 170 76 148 Z', dark);
    s += path('M86 144.5 L100 154 L93 163 L81.5 149.5 Z', shirt, edge) + path('M114 144.5 L100 154 L107 163 L118.5 149.5 Z', shirt, edge);
    s += stroke('M100 168 L100 200', FACE.black, 1.4, { 'stroke-opacity': 0.2 });
    s += buttonArt(outfit.buttons, 90, 178, 4.8) + buttonArt(outfit.buttons, 90, 194, 4.8);
  } else {
    s += path('M84 146 L116 146 L100 177 Z', shirt);
    s += path('M86 144.5 L100 156 L92.5 166 L80.5 150 Z', shirt, edge) + path('M114 144.5 L100 156 L107.5 166 L119.5 150 Z', shirt, edge);
    s += path('M84 146 L67 152 L88 187 L100 177 Z', dark) + path('M116 146 L133 152 L112 187 L100 177 Z', dark);
    s += stroke('M67 152 L88 187', FACE.white, 1.2, { opacity: 0.18 }) + stroke('M133 152 L112 187', FACE.black, 1.2, { opacity: 0.18 });
    s += buttonArt(outfit.buttons, 90, 191, 4.8) + buttonArt(outfit.buttons, 110, 191, 4.8);
  }
  if (look.extra === 'bow') {
    s += path('M100 153 L88 147 L88 160 Z', EXTRAS.bow) + path('M100 153 L112 147 L112 160 Z', EXTRAS.bow) + circle(100, 153.5, 3.2, EXTRAS.bow, { stroke: FACE.black, 'stroke-opacity': 0.2, 'stroke-width': 1 });
  }
  if (look.extra === 'strap') s += path('M54 156 L64 152 L150 200 L134 200 Z', EXTRAS.strap) + stroke('M60 155 L142 200', FACE.black, 1.4, { 'stroke-opacity': 0.2 });
  if (scarfFill) {
    const wrap = 'M76 137.5 C86 155 114 155 124 137.5 C127 140.5 129 145.5 128 150 C116 168.5 84 168.5 72 150 C71 145.5 73 140.5 76 137.5 Z';
    const end = 'M103 154 L117 156 L120 200 L104 200 Z';
    s += path(wrap, scarfFill) + path(wrap, volume) + path(end, scarfFill) + path(end, volume);
  }
  return s;
}
