// A suspect's card: a large portrait, the traits in words (so colour is never the only sign), on a harder
// level what is known about the person, and what the player can do. An easy case: set the person aside,
// bring them back, or name them. A harder case: set aside by naming the reason — the card then turns into
// the list of reasons — and name only the last person left.
import { h, svg } from '../../../shared/ui/dom.ts';
import { portraitSvg } from '../art/people/portrait.ts';
import { thingIcon } from '../art/things.ts';
import type { ReasonId } from '../core/deduction.ts';
import { traitsOf, type Suspect } from '../core/people.ts';
import type { ThingId } from '../core/things.ts';
import { cluesOf } from '../core/traits.ts';
import { fmt, type Dict } from './i18n.ts';

export interface PersonActions {
  toggleAside(): void;
  accuse(): void;
  /** A harder case: "it is not this person, because of this". */
  rule(reason: ReasonId): void;
}

export interface ReasonChoice {
  id: ReasonId;
  label: string;
  icon: ThingId;
}

export interface PersonState {
  suspect: Suspect;
  aside: boolean;
  /** Named wrongly already: cannot be named again. */
  wrong: boolean;
  /** What to say: about the last wrong naming, the reason the person is aside for, or a reason that did not hold. */
  note: string;
  /** A harder case: what is known about the person, the reasons to pick from, whether the rest are aside. */
  harder: { facts: string[]; reasons: ReasonChoice[]; canAccuse: boolean; step: 'card' | 'reasons'; focus: ReasonId | null } | null;
}

export function createPersonDialog(): { el: HTMLDialogElement; open(d: Dict, state: PersonState, actions: PersonActions): void } {
  const el = h('dialog', { class: 'dialog', 'aria-labelledby': 'person-title' });

  function card(d: Dict, state: PersonState, actions: PersonActions): void {
    const who = d.people[state.suspect.person];
    const traits = h('ul', { class: 'traits', 'aria-label': d.suspects.traits });
    for (const trait of cluesOf(traitsOf(state.suspect))) traits.append(h('li', {}, d.traits[trait]));

    const close = h('button', { class: 'btn btn--ghost', type: 'button' }, d.actions.close);
    close.addEventListener('click', () => el.close());
    const accuse = h('button', { class: 'btn btn--primary', type: 'button', 'data-act': 'accuse' }, d.suspects.accuse);
    accuse.addEventListener('click', actions.accuse);

    const buttons: HTMLElement[] = [close];
    let first: HTMLElement = close;
    const known: (HTMLElement | null)[] = [];
    if (!state.harder) {
      const aside = h('button', { class: 'btn btn--ghost', type: 'button' }, state.aside ? d.suspects.bringBack : d.suspects.setAside);
      aside.addEventListener('click', actions.toggleAside);
      if (!state.wrong) {
        buttons.push(aside, accuse);
        first = accuse;
      }
    } else {
      const facts = h('ul', { class: 'traits', 'aria-label': d.suspects.facts });
      for (const line of state.harder.facts) facts.append(h('li', {}, line));
      known.push(h('p', { class: 'dialog__label' }, d.suspects.facts), facts);
      if (!state.aside && state.harder.canAccuse) {
        buttons.push(accuse);
        first = accuse;
      } else if (!state.aside) {
        const ruleOut = h('button', { class: 'btn btn--primary', type: 'button', 'data-act': 'rule' }, d.suspects.ruleOut);
        ruleOut.addEventListener('click', () => reasons(d, { ...state, note: '' }, actions));
        buttons.push(ruleOut);
        first = ruleOut;
      }
    }

    const picture = h('div', { class: 'person-card__picture' });
    picture.append(svg(portraitSvg(state.suspect, {}, 'big')));
    el.replaceChildren(
      h(
        'div',
        { class: 'dialog__body' },
        h('div', { class: 'person-card' }, picture, h('div', {}, h('h2', { id: 'person-title' }, who.name), h('p', { class: 'person-card__role' }, who.role))),
        h('p', { class: 'dialog__label' }, d.suspects.traits),
        traits,
        ...known,
        h('p', { class: 'dialog__note person-card__note', role: 'status' }, state.note),
        h('div', { class: 'dialog__actions' }, ...buttons),
      ),
    );
    if (!el.open) el.showModal();
    first.focus();
  }

  /** "Why is it not this person?" — the circumstances and the evidence as buttons. */
  function reasons(d: Dict, state: PersonState, actions: PersonActions): void {
    if (!state.harder) return;
    const who = d.people[state.suspect.person];
    const list = h('ul', { class: 'reasons' });
    let first: HTMLElement | null = null;
    for (const reason of state.harder.reasons) {
      const button = h('button', { class: 'reason', type: 'button', 'data-reason': reason.id });
      button.append(svg(thingIcon(reason.icon)), h('span', { class: 'reason__name' }, reason.label));
      button.addEventListener('click', () => actions.rule(reason.id));
      if (!first || reason.id === state.harder.focus) first = button;
      list.append(h('li', {}, button));
    }
    const back = h('button', { class: 'btn btn--ghost', type: 'button', 'data-act': 'back' }, d.suspects.backToCard);
    back.addEventListener('click', () => card(d, { ...state, note: '' }, actions));
    el.replaceChildren(
      h(
        'div',
        { class: 'dialog__body' },
        h('h2', { id: 'person-title' }, fmt(d.suspects.whyNot, { name: who.name })),
        h('p', { class: 'dialog__note person-card__note', role: 'status' }, state.note),
        list,
        h('div', { class: 'dialog__actions' }, back),
      ),
    );
    if (!el.open) el.showModal();
    (first ?? back).focus();
  }

  return {
    el,
    open(d, state, actions) {
      if (state.harder?.step === 'reasons') reasons(d, state, actions);
      else card(d, state, actions);
    },
  };
}
