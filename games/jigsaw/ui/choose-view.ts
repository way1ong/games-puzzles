// The choice of a picture before a new puzzle of free play (decision of 28.11): "Any picture" — drawn from the
// puzzle's seed — then the pictures room by room, small and named: each room by day and by night, then its close-ups.
import { h } from '../../../shared/ui/dom.ts';
import { PICTURES, type Room } from '../config.ts';
import { pictureUrl } from '../art/picture.ts';
import type { Dict } from './i18n.ts';
import { anySign } from './icons.ts';
import { pictureName } from './words.ts';

/** The rooms in the order of the choice. */
const ROOMS: readonly Room[] = ['study', 'bakery', 'station', 'post'];

/** The pictures without things, drawn once (the things of a puzzle come from its seed). */
const thumbs = new Map<number, string>();
const thumbOf = (i: number): string => {
  let url = thumbs.get(i);
  if (!url) thumbs.set(i, (url = pictureUrl(i, null)));
  return url;
};

/** `choose(null)` — any picture. */
export function chooseView(note: string, d: Dict, choose: (picture: number | null) => void): HTMLElement {
  const button = (inner: (Node | string)[], picture: number | null, kind: string) => {
    const b = h('button', { class: `choice ${kind}`.trim(), type: 'button', 'data-picture': picture ?? 'any' }, ...inner);
    b.addEventListener('click', () => choose(picture));
    return b;
  };
  const any = button([anySign(), h('span', { class: 'choice__name' }, d.choose.any), h('span', { class: 'choice__note' }, d.choose.anyNote)], null, 'choice--any');
  // a room's pictures in the order of the list: the whole room by day and by night, then the close-ups
  const rooms = ROOMS.map((room) =>
    h(
      'section',
      { class: 'choose__room' },
      h('h2', { class: 'choose__heading' }, d.choose.rooms[room]),
      h(
        'div',
        { class: 'choose__grid' },
        ...PICTURES.flatMap((p, i) =>
          p.room === room
            ? [button([h('img', { class: 'choice__img', src: thumbOf(i), alt: '', width: 150, height: 100, loading: 'lazy', decoding: 'async' }), h('span', { class: 'choice__name' }, pictureName(p, d))], i, '')]
            : [],
        ),
      ),
    ),
  );
  return h('div', { class: 'choose' }, h('p', { class: 'choose__note' }, note), h('div', { class: 'choose__grid' }, any), ...rooms);
}
