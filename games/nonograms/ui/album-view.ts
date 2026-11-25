// A chapter of the album (docs/nonograms/SPEC.md, "Екрани"): every picture of a size, all open at once — solved ones
// in colour with their names, begun ones with the player's cells, new ones as an empty sheet with their number.
import { h } from '../../../shared/ui/dom.ts';
import type { Picture } from '../core/picture.ts';
import type { Mark } from '../core/play.ts';
import type { Dict } from './i18n.ts';
import { fmt } from './i18n.ts';
import { pictureSvg } from './thumb.ts';

export interface AlbumItem {
  picture: Picture;
  state: 'new' | 'started' | 'done';
  /** The cells of a begun picture. */
  marks: readonly Mark[] | null;
  /** Its number, or its name (solved, or the setting). */
  title: string;
}

export function albumView(items: readonly AlbumItem[], d: Dict, colour: boolean, open: (picture: Picture) => void): HTMLElement {
  const list = h('ul', { class: 'album' });
  for (const item of items) {
    const look =
      item.state === 'done'
        ? colour
          ? ({ kind: 'colour' } as const)
          : ({ kind: 'ink' } as const)
        : item.marks
          ? ({ kind: 'marks', marks: item.marks } as const)
          : ({ kind: 'blank' } as const);
    const state = item.state === 'done' ? d.album.solved : item.state === 'started' ? d.album.started : '';
    const b = h(
      'button',
      {
        class: `album__item is-${item.state}`,
        type: 'button',
        'aria-label': state ? fmt(d.album.item, { name: item.title, state }) : item.title,
      },
      pictureSvg(item.picture, look),
      h('span', { class: 'album__name', 'aria-hidden': 'true' }, item.title),
    );
    b.addEventListener('click', () => open(item.picture));
    list.append(h('li', {}, b));
  }
  return list;
}
