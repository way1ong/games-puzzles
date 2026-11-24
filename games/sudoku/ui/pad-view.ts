// The digits 1–9 and "Erase" under the board. With "digit first" the chosen digit stays pressed; with the
// count switched on, each digit shows how many are still to place.
import { h } from '../../../shared/ui/dom.ts';
import { SIZE } from '../core/grid.ts';
import { fmt, plural, type Dict } from './i18n.ts';
import { checkSign, eraseSign } from './icons.ts';

export interface PadState {
  /** How many of each digit are left (index 0 — the digit 1); null — the count is not shown. */
  left: readonly number[] | null;
  /** The digit held in "digit first" input; null — none, or "cell first". */
  held: number | null;
  digitFirst: boolean;
}

export interface PadView {
  el: HTMLElement;
  render(state: PadState, d: Dict, lang: string): void;
}

export function createPadView(onDigit: (digit: number) => void, onErase: () => void): PadView {
  const digits = Array.from({ length: SIZE }, (_, i) => {
    const digit = i + 1;
    const left = h('span', { class: 'pad__left', 'aria-hidden': 'true' });
    // A space between the digit and its count: the name read aloud starts with what is seen ("5 3 left").
    const button = h('button', { class: 'pad__btn', type: 'button' }, h('span', { class: 'pad__digit', 'aria-hidden': 'true' }, String(digit)), ' ', left);
    button.addEventListener('click', () => onDigit(digit));
    return { button, left };
  });
  const eraseLabel = h('span', { class: 'pad__label' });
  const erase = h('button', { class: 'pad__btn pad__btn--erase', type: 'button' }, eraseSign(), eraseLabel);
  erase.addEventListener('click', onErase);
  const el = h('div', { class: 'pad', role: 'group' }, ...digits.map((x) => x.button), erase);

  return {
    el,
    render(state, d, lang) {
      el.setAttribute('aria-label', d.pad.label);
      digits.forEach(({ button, left }, i) => {
        const digit = i + 1;
        const n = state.left?.[i] ?? null;
        const done = n === 0;
        left.replaceChildren(n === null ? '' : done ? checkSign() : String(n));
        button.classList.toggle('is-done', done);
        const label =
          n === null
            ? fmt(d.pad.digit, { number: digit })
            : done
              ? fmt(d.pad.digitDone, { number: digit })
              : plural(lang, n, d.pad.digitLeft, { number: digit, left: n });
        button.setAttribute('aria-label', label);
        if (state.digitFirst) button.setAttribute('aria-pressed', String(state.held === digit));
        else button.removeAttribute('aria-pressed');
      });
      eraseLabel.textContent = d.tools.erase;
    },
  };
}
