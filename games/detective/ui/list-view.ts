// The list of things to find: a small picture and the name of each; found things are ticked and struck
// through, found evidence is marked as evidence.
import { h, svg } from '../../../shared/ui/dom.ts';
import { thingIcon } from '../art/things.ts';
import type { CaseDef } from '../core/cases.ts';
import { isEvidence, type Progress } from '../core/game.ts';
import type { Dict } from './i18n.ts';
import { checkSign } from './icons.ts';

export function thingList(d: Dict, def: CaseDef, progress: Progress): HTMLUListElement {
  const list = h('ul', { class: 'things', 'aria-label': d.search.list });
  for (const { thing } of def.things) {
    const found = progress.found.includes(thing);
    const item = h('li', { class: found ? 'thing-chip is-found' : 'thing-chip' });
    const text = h('span', { class: 'thing-chip__text' }, h('span', { class: 'thing-chip__name' }, d.things[thing]));
    if (found) text.append(h('span', { class: 'visually-hidden' }, ` — ${d.search.foundMark}`));
    // found evidence says so under its name
    if (found && isEvidence(def, thing)) text.append(h('span', { class: 'thing-chip__clue' }, d.search.clueMark));
    item.append(found ? checkSign() : svg(thingIcon(thing)), text);
    list.append(item);
  }
  return list;
}
