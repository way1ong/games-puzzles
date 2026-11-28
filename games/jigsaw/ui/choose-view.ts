// The choice of a picture before a new puzzle of free play (decision of 28.11): the six rooms, small and named, and
// "Any picture" — drawn from the puzzle's seed.
import { h } from '../../../shared/ui/dom.ts';
import { PICTURES } from '../config.ts';
import { pictureUrl } from '../art/picture.ts';
import type { Dict } from './i18n.ts';
import { anySign } from './icons.ts';
import { pictureName } from './words.ts';

/** The rooms without things, drawn once (the things of a puzzle come from its seed). */
const thumbs = new Map<number, string>();
const thumbOf = (i: number): string => {
  let url = thumbs.get(i);
  if (!url) thumbs.set(i, (url = pictureUrl(i, null)));
  return url;
};

/** `choose(null)` — any picture. */
export function chooseView(note: string, d: Dict, choose: (picture: number | null) => void): HTMLElement {
  const button = (inner: (Node | string)[], picture: number | null, kind: string) => {
    const b = h('button', { class: `choice ${kind}`, type: 'button' }, ...inner);
    b.addEventListener('click', () => choose(picture));
    return b;
  };
  const pictures = PICTURES.map((p, i) =>
    button([h('img', { class: 'choice__img', src: thumbOf(i), alt: '', width: 150, height: 100 }), h('span', { class: 'choice__name' }, pictureName(p, d))], i, ''),
  );
  const any = button([anySign(), h('span', { class: 'choice__name' }, d.choose.any), h('span', { class: 'choice__note' }, d.choose.anyNote)], null, 'choice--any');
  return h('div', { class: 'choose' }, h('p', { class: 'choose__note' }, note), h('div', { class: 'choose__grid' }, ...pictures, any));
}
