// "Who did it?": the evidence found (with the place of each), and the suspects as cards. A card opens the
// person (person-dialog.ts).
import { h, svg } from '../../../shared/ui/dom.ts';
import { portraitSvg } from '../art/people/portrait.ts';
import { thingIcon } from '../art/things.ts';
import type { CaseDef } from '../core/cases.ts';
import type { Progress } from '../core/game.ts';
import { SPOTS } from '../core/rooms.ts';
import type { ClueId } from '../core/traits.ts';
import type { Dict } from './i18n.ts';

/** Where a piece of evidence was found, in words. */
export function whereFound(d: Dict, def: CaseDef, clue: ClueId): string {
  const placed = def.things.find((p) => p.thing === clue);
  const spot = SPOTS[def.room].find((s) => s.id === placed?.spot);
  return spot ? d.where[spot.where] : '';
}

export function clueList(d: Dict, def: CaseDef): HTMLUListElement {
  const list = h('ul', { class: 'clues', 'aria-label': d.search.evidence });
  for (const clue of def.clues) {
    const item = h('li', { class: 'clue' });
    item.append(svg(thingIcon(clue)), h('span', { class: 'clue__text' }, h('span', { class: 'clue__name' }, d.things[clue]), h('span', { class: 'clue__where' }, whereFound(d, def, clue))));
    list.append(item);
  }
  return list;
}

export function suspectsView(d: Dict, def: CaseDef, progress: Progress, open: (suspect: number) => void): HTMLElement {
  const people = h('ul', { class: 'people' });
  def.suspects.forEach((suspect, i) => {
    const aside = progress.ruledOut.includes(i);
    const who = d.people[suspect.person];
    const button = h('button', { class: aside ? 'person is-aside' : 'person', type: 'button' });
    button.append(svg(portraitSvg(suspect)), h('span', { class: 'person__name' }, who.name), h('span', { class: 'person__role' }, who.role));
    if (aside) button.append(h('span', { class: 'badge badge--aside' }, d.suspects.aside));
    button.addEventListener('click', () => open(i));
    people.append(h('li', {}, button));
  });
  return h('section', { class: 'suspects' }, h('h2', { class: 'suspects__title' }, d.suspects.title), h('p', { class: 'suspects__lead' }, d.suspects.lead), clueList(d, def), people);
}
