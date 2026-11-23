// A portrait of a suspect as they look in a case: the person's fixed look, plus hair colour and glasses
// (traits of the person) and the outfit of the case (buttons, scarf, flower).
import { PEOPLE, type Suspect } from '../../core/people.ts';
import { BACKDROPS, FACE } from '../palette.ts';
import { circle, el, path, rect, type Attrs } from '../svg.ts';
import { clothes, scarfPattern } from './clothes.ts';
import { glasses, hat, wornFlower } from './extras.ts';
import { HEAD, ears, face } from './face.ts';
import { hairBehind, hairInFront, hairOnShoulders } from './hair.ts';
import { LOOKS } from './looks.ts';

const stop = (offset: number, colour: string, opacity: number): string => el('stop', { offset, 'stop-color': colour, 'stop-opacity': opacity });

/** `scope` keeps the names of this portrait's definitions apart from another portrait of the same person. */
export function portraitSvg(suspect: Suspect, attrs: Attrs = {}, scope = 'card'): string {
  const person = PEOPLE[suspect.person];
  const look = LOOKS[suspect.person];
  const id = (name: string) => `p-${scope}-${suspect.person}-${name}`;
  const ref = (name: string) => `url(#${id(name)})`;

  const defs =
    // roundness: light from the upper left
    el('linearGradient', { id: id('volume'), x1: 0, y1: 0, x2: 1, y2: 1 }, stop(0, FACE.white, 0.16) + stop(0.5, FACE.white, 0) + stop(1, FACE.black, 0.2)) +
    el('linearGradient', { id: id('side'), x1: 0, y1: 0, x2: 1, y2: 0 }, stop(0, FACE.white, 0.12) + stop(0.55, FACE.white, 0) + stop(1, FACE.warmShade, 0.14)) +
    el('radialGradient', { id: id('halo'), cx: 0.5, cy: 0.45, r: 0.5 }, stop(0, FACE.white, 0.55) + stop(1, FACE.white, 0)) +
    el('filter', { id: id('blur'), x: '-30%', y: '-30%', width: '160%', height: '160%' }, el('feGaussianBlur', { stdDeviation: 2.2 })) +
    el('clipPath', { id: id('head') }, path(HEAD, FACE.black)) +
    el('clipPath', { id: id('below') }, rect(0, 58, 200, 142, FACE.black)) +
    (suspect.scarf ? scarfPattern(id('scarf'), suspect.scarf) : '');

  let s = rect(0, 0, 200, 200, BACKDROPS[look.backdrop]) + circle(100, 96, 92, ref('halo'));
  s += hairBehind(look.style, person.hair, ref('volume'));
  s += clothes(look, suspect, ref('volume'), suspect.scarf ? ref('scarf') : null);
  s += hairOnShoulders(look.style, person.hair);
  s += ears(look);
  s += face(look, person.hair, { head: ref('head'), blur: ref('blur'), side: ref('side') });
  s += hairInFront(look.style, person.hair, look.sideburns === true, look.hat ? ref('below') : null);
  if (person.glasses) s += glasses(look.frame);
  if (look.hat) s += hat(look.hat, ref('volume'));
  if (suspect.flower) s += wornFlower(look);
  return el('svg', { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 200 200', class: 'portrait', 'aria-hidden': 'true', focusable: 'false', ...attrs }, el('defs', {}, defs) + s);
}
