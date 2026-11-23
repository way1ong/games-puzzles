// The story of a case before the room: the room itself (empty of things, as a picture), the story, what
// to do, and the button that starts.
import { h, svg } from '../../../shared/ui/dom.ts';
import { sceneSvg } from '../art/scene.ts';
import { DETECTIVE } from '../config.ts';
import type { CaseDef, StoryId } from '../core/cases.ts';
import { plural, type Dict } from './i18n.ts';
import { roomLine } from './home-view.ts';

export function introView(d: Dict, lang: string, def: CaseDef, start: () => void): HTMLElement {
  const story = d.stories[def.story as StoryId];
  const button = h('button', { class: 'btn btn--primary', type: 'button' }, d.intro.start);
  button.addEventListener('click', start);
  const picture = h('div', { class: 'intro__picture' });
  picture.append(svg(sceneSvg({ room: def.room, time: def.time, things: [] }, { 'aria-hidden': 'true', focusable: 'false' })));
  return h(
    'section',
    { class: 'intro' },
    picture,
    h('p', { class: 'intro__meta' }, roomLine(d, def.room, def.time)),
    h('p', { class: 'intro__text' }, story.text),
    h(
      'p',
      { class: 'intro__task' },
      `${plural(lang, DETECTIVE.thingsPerScene, d.intro.things, { n: DETECTIVE.thingsPerScene })} ${plural(lang, def.clues.length, d.intro.clues, { n: def.clues.length })}`,
    ),
    h('div', { class: 'actions' }, button),
  );
}
