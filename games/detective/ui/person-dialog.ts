// A suspect's card: a large portrait, the traits in words (so colour is never the only sign), on a harder
// level what is known about the person and what they say, and what the player can do. An easy case: set the
// person aside, bring them back, or name them. A harder case: set aside by naming the reason — the card then
// turns into the list of reasons (on the hard level one or two are picked and then checked) — and name only
// the last person left.
import { h, svg } from '../../../shared/ui/dom.ts';
import { portraitSvg } from '../art/people/portrait.ts';
import { thingIcon } from '../art/things.ts';
import type { ReasonId } from '../core/deduction.ts';
import { traitsOf, type Suspect } from '../core/people.ts';
import { cluesOf } from '../core/traits.ts';
import type { ReasonText } from './deduction-text.ts';
import { fmt, type Dict } from './i18n.ts';

export interface PersonActions {
  toggleAside(): void;
  accuse(): void;
  /** A harder case: "it is not this person, because of this" — one reason, or the reasons picked together. */
  rule(picked: ReasonId[]): void;
}

export interface HarderState {
  /** What is known about the person, each line said outright. */
  facts: string[];
  /** What the person says about the moment it happened; '' — nothing. */
  statement: string;
  reasons: ReasonText[];
  /** How many reasons may be named at once; one — a touch on a reason names it. */
  atOnce: number;
  /** Everybody else is set aside: this person can be named. */
  canAccuse: boolean;
  step: 'card' | 'reasons';
  /** The reasons picked before the answer on the screen. */
  picked: readonly ReasonId[];
}

export interface PersonState {
  suspect: Suspect;
  aside: boolean;
  /** Named wrongly already: cannot be named again. */
  wrong: boolean;
  /** What to say: about the last wrong naming, the reason the person is aside for, or reasons that did not hold. */
  note: string;
  harder: HarderState | null;
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
    const known: HTMLElement[] = [];
    if (!state.harder) {
      const aside = h('button', { class: 'btn btn--ghost', type: 'button' }, state.aside ? d.suspects.bringBack : d.suspects.setAside);
      aside.addEventListener('click', actions.toggleAside);
      if (!state.wrong) {
        buttons.push(aside, accuse);
        first = accuse;
      }
    } else {
      if (state.harder.facts.length > 0) {
        const facts = h('ul', { class: 'traits', 'aria-label': d.suspects.facts });
        for (const line of state.harder.facts) facts.append(h('li', {}, line));
        known.push(h('p', { class: 'dialog__label' }, d.suspects.facts), facts);
      }
      if (state.harder.statement) known.push(h('p', { class: 'dialog__label' }, d.suspects.statements), h('p', { class: 'person-card__says' }, state.harder.statement));
      if (!state.aside && state.harder.canAccuse) {
        buttons.push(accuse);
        first = accuse;
      } else if (!state.aside) {
        const ruleOut = h('button', { class: 'btn btn--primary', type: 'button', 'data-act': 'rule' }, d.suspects.ruleOut);
        ruleOut.addEventListener('click', () => reasons(d, { ...state, note: '', harder: state.harder && { ...state.harder, picked: [] } }, actions));
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

  /** "Why is it not this person?" — the circumstances, the evidence and the statements as buttons. */
  function reasons(d: Dict, state: PersonState, actions: PersonActions): void {
    const harder = state.harder;
    if (!harder) return;
    const who = d.people[state.suspect.person];
    const several = harder.atOnce > 1;
    /** The reasons picked, oldest first. */
    let picked = harder.picked.filter((id) => harder.reasons.some((r) => r.id === id));
    const list = h('ul', { class: 'reasons' });
    const buttonOf = new Map<ReasonId, HTMLButtonElement>();
    const check = h('button', { class: 'btn btn--primary', type: 'button', 'data-act': 'check' }, d.suspects.checkReason);
    check.addEventListener('click', () => actions.rule([...picked]));
    const mark = () => {
      for (const [id, button] of buttonOf) button.setAttribute('aria-pressed', String(picked.includes(id)));
      check.hidden = picked.length === 0;
    };
    for (const reason of harder.reasons) {
      const button = h('button', { class: 'reason', type: 'button', 'data-reason': reason.id });
      const text = h('span', { class: 'reason__text' }, h('span', { class: 'reason__name' }, reason.label));
      if (reason.line) text.append(h('span', { class: 'reason__line' }, reason.line));
      if (reason.icon) button.append(svg(thingIcon(reason.icon)));
      button.append(text);
      button.addEventListener('click', () => {
        if (!several) {
          actions.rule([reason.id]);
          return;
        }
        // a third reason takes the place of the one picked first
        picked = picked.includes(reason.id) ? picked.filter((id) => id !== reason.id) : [...picked, reason.id].slice(-harder.atOnce);
        // the answer was about the reasons picked before
        note.textContent = '';
        mark();
      });
      buttonOf.set(reason.id, button);
      list.append(h('li', {}, button));
    }
    if (several) mark();
    const note = h('p', { class: 'dialog__note person-card__note', role: 'status' }, state.note);
    const back = h('button', { class: 'btn btn--ghost', type: 'button', 'data-act': 'back' }, d.suspects.backToCard);
    back.addEventListener('click', () => card(d, { ...state, note: '' }, actions));
    el.replaceChildren(
      h(
        'div',
        { class: 'dialog__body' },
        h('h2', { id: 'person-title' }, fmt(d.suspects.whyNot, { name: who.name })),
        several ? h('p', { class: 'dialog__hint' }, d.suspects.pick) : null,
        list,
        // the answer and the buttons stay in sight while the long list scrolls
        h('div', { class: 'reasons-foot' }, note, h('div', { class: 'dialog__actions' }, back, several ? check : null)),
      ),
    );
    if (!el.open) el.showModal();
    const last = picked[picked.length - 1];
    ((last && buttonOf.get(last)) ?? list.querySelector<HTMLButtonElement>('.reason') ?? back).focus();
  }

  return {
    el,
    open(d, state, actions) {
      if (state.harder?.step === 'reasons') reasons(d, state, actions);
      else card(d, state, actions);
    },
  };
}
