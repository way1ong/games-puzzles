// "Who did it?": the evidence found (with the place of each), on a harder level the circumstances too, and
// the suspects as cards. A card opens the person (person-dialog.ts).
import { h, svg } from '../../../shared/ui/dom.ts';
import { portraitSvg } from '../art/people/portrait.ts';
import { thingIcon } from '../art/things.ts';
import type { CaseDef } from '../core/cases.ts';
import { remaining, type Progress } from '../core/game.ts';
import { SPOTS } from '../core/rooms.ts';
import type { ThingId } from '../core/things.ts';
import type { ClueId } from '../core/traits.ts';
import { circumstanceText, statementLines } from './deduction-text.ts';
import type { Dict } from './i18n.ts';

/** Where a thing was found, in words. */
export function whereFound(d: Dict, def: CaseDef, thing: ThingId): string {
  const placed = def.things.find((p) => p.thing === thing);
  const spot = SPOTS[def.room].find((s) => s.id === placed?.spot);
  return spot ? d.where[spot.where] : '';
}

function entry(icon: ThingId, name: string, line: string): HTMLLIElement {
  const item = h('li', { class: 'clue' });
  item.append(svg(thingIcon(icon)), h('span', { class: 'clue__text' }, h('span', { class: 'clue__name' }, name), h('span', { class: 'clue__where' }, line)));
  return item;
}

export function clueList(d: Dict, def: CaseDef): HTMLUListElement {
  const list = h('ul', { class: 'clues', 'aria-label': d.search.evidence });
  for (const clue of def.clues as ClueId[]) list.append(entry(clue, d.things[clue], whereFound(d, def, clue)));
  return list;
}

/** What the scene itself says: each circumstance with what follows from it. */
export function circumstanceList(d: Dict, lang: string, def: CaseDef): HTMLUListElement {
  const list = h('ul', { class: 'clues clues--wide', 'aria-labelledby': 'circumstances-title' });
  for (const c of def.circumstances) {
    const text = circumstanceText(d, lang, c);
    list.append(entry(text.icon, text.name, text.text));
  }
  return list;
}

export interface SuspectsExtras {
  lang: string;
  /** What has just happened ("Sofia: no key…"); read aloud and shown. */
  note: string;
}

export function suspectsView(d: Dict, def: CaseDef, progress: Progress, open: (suspect: number) => void, extras: SuspectsExtras): HTMLElement {
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
  const title = h('h2', { class: 'suspects__title' }, d.suspects.title);
  if (def.level === 'easy') return h('section', { class: 'suspects' }, title, h('p', { class: 'suspects__lead' }, d.suspects.lead), clueList(d, def), people);
  // a hard case: what everybody says, side by side — statements are to be compared
  const said: (HTMLElement | null)[] = [];
  if (def.statements.length > 0) {
    const list = h('ul', { class: 'statements', 'aria-labelledby': 'statements-title' });
    for (const line of statementLines(d, extras.lang, def)) list.append(h('li', { class: 'statement' }, h('span', { class: 'statement__name' }, line.name), h('span', { class: 'statement__text' }, line.text)));
    said.push(h('h3', { class: 'suspects__part', id: 'statements-title' }, d.suspects.statements), list);
  }
  return h(
    'section',
    { class: 'suspects' },
    title,
    h('p', { class: 'suspects__lead' }, def.level === 'hard' ? d.suspects.leadHard : d.suspects.leadMedium),
    h('h3', { class: 'suspects__part', id: 'circumstances-title' }, d.suspects.circumstances),
    circumstanceList(d, extras.lang, def),
    h('h3', { class: 'suspects__part' }, d.search.evidence),
    clueList(d, def),
    ...said,
    h('p', { class: 'suspects__note', role: 'status' }, extras.note),
    h('p', { class: 'suspects__rule' }, remaining(def, progress).length === 1 ? d.suspects.last : d.suspects.rule),
    people,
  );
}
