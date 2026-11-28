// A number chosen with − and + (the player's own size: Mines, Pour; decision of 28.11): a tap — or Enter, Space —
// counts one; held down, the button goes on counting until it is let go or the number stops changing. The game keeps
// the number and its range; this only shows them and passes the steps on. Styles — shared/styles/ui.css (.stepper).
import { h } from './dom.ts';

/** Held down, − and + count again after this long, ms, and then every this often (C). */
const REPEAT_AFTER_MS = 450;
const REPEAT_EVERY_MS = 90;

export interface StepperWords {
  label: string;
  /** − and + as a screen reader names them ("Width: fewer"). */
  less: string;
  more: string;
}

export interface Stepper {
  el: HTMLElement;
  /** The number shown, and whether − and + may count further. */
  show(value: string, canLess: boolean, canMore: boolean): void;
}

/** `step` counts by −1 or +1 and says whether the number changed; `id` names the row for screen readers. */
export function createStepper(id: string, words: StepperWords, step: (by: number) => boolean): Stepper {
  /** − or +: a tap counts one; held down, it goes on counting until let go or at the end of the range. */
  function button(by: number, label: string): HTMLButtonElement {
    const b = h('button', { class: 'stepper__btn', type: 'button', 'aria-label': label }, h('span', { 'aria-hidden': 'true' }, by < 0 ? '−' : '+'));
    let timer = 0;
    /** When the button was pressed: a long hold has counted already when it is let go. */
    let pressed = 0;
    const stop = () => window.clearTimeout(timer);
    b.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      stop();
      pressed = performance.now();
      const again = () => {
        if (step(by)) timer = window.setTimeout(again, REPEAT_EVERY_MS);
      };
      timer = window.setTimeout(again, REPEAT_AFTER_MS);
    });
    for (const end of ['pointerup', 'pointercancel', 'pointerleave'] as const) b.addEventListener(end, stop);
    // held down on a phone: counting, not the browser's menu
    b.addEventListener('contextmenu', (e) => e.preventDefault());
    // a tap (or Enter, Space: no pointer) counts one
    b.addEventListener('click', (e) => {
      if (e.detail !== 0 && performance.now() - pressed > REPEAT_AFTER_MS) return;
      step(by);
    });
    return b;
  }

  const out = h('output', { class: 'stepper__value', id: `${id}-value` });
  const less = button(-1, words.less);
  const more = button(1, words.more);
  const el = h(
    'div',
    { class: 'stepper', role: 'group', 'aria-labelledby': `${id}-label ${id}-value` },
    h('span', { class: 'stepper__label', id: `${id}-label` }, words.label),
    less,
    out,
    more,
  );
  return {
    el,
    show(value, canLess, canMore) {
      out.textContent = value;
      less.disabled = !canLess;
      more.disabled = !canMore;
    },
  };
}
