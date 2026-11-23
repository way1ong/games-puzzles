// A suspect's card: a large portrait, the traits in words (so colour is never the only sign), and what the
// player can do — set the person aside, bring them back, or name them.
import { h, svg } from '../../../shared/ui/dom.ts';
import { portraitSvg } from '../art/people/portrait.ts';
import { traitsOf, type Suspect } from '../core/people.ts';
import { cluesOf } from '../core/traits.ts';
import type { Dict } from './i18n.ts';

export interface PersonActions {
  toggleAside(): void;
  accuse(): void;
}

export interface PersonState {
  suspect: Suspect;
  aside: boolean;
  /** Named wrongly already: cannot be named again. */
  wrong: boolean;
  /** What to say about the last wrong naming of this person. */
  note: string;
}

export function createPersonDialog(): { el: HTMLDialogElement; open(d: Dict, state: PersonState, actions: PersonActions): void } {
  const el = h('dialog', { class: 'dialog', 'aria-labelledby': 'person-title' });
  return {
    el,
    open(d, state, actions) {
      const who = d.people[state.suspect.person];
      const traits = h('ul', { class: 'traits', 'aria-label': d.suspects.traits });
      for (const trait of cluesOf(traitsOf(state.suspect))) traits.append(h('li', {}, d.traits[trait]));

      const aside = h('button', { class: 'btn btn--ghost', type: 'button' }, state.aside ? d.suspects.bringBack : d.suspects.setAside);
      aside.addEventListener('click', actions.toggleAside);
      const accuse = h('button', { class: 'btn btn--primary', type: 'button' }, d.suspects.accuse);
      accuse.addEventListener('click', actions.accuse);
      const close = h('button', { class: 'btn btn--ghost', type: 'button' }, d.actions.close);
      close.addEventListener('click', () => el.close());

      const picture = h('div', { class: 'person-card__picture' });
      picture.append(svg(portraitSvg(state.suspect, {}, 'big')));
      el.replaceChildren(
        h(
          'div',
          { class: 'dialog__body' },
          h('div', { class: 'person-card' }, picture, h('div', {}, h('h2', { id: 'person-title' }, who.name), h('p', { class: 'person-card__role' }, who.role))),
          h('p', { class: 'dialog__label' }, d.suspects.traits),
          traits,
          h('p', { class: 'dialog__note person-card__note', role: 'status' }, state.note),
          h('div', { class: 'dialog__actions' }, close, state.wrong ? null : aside, state.wrong ? null : accuse),
        ),
      );
      if (!el.open) el.showModal();
      (state.wrong ? close : accuse).focus();
    },
  };
}
