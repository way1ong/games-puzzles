// The hint: kinds to choose from, given by the screen — on the wheel: the first letter of a word, the letter of
// a cell the player chooses, a whole word; on the Word Field: where a word starts, one more letter, a whole word.
// All free; each is counted.
import { h } from '../../../shared/ui/dom.ts';
import type { Dict } from './i18n.ts';

export interface HintOption<K extends string> {
  kind: K;
  label: string;
  /** Shown but not to be chosen now (e.g. "where a word starts" while a word is already being shown). */
  disabled?: boolean;
}

export function createHintDialog(): {
  el: HTMLDialogElement;
  open<K extends string>(d: Dict, options: readonly HintOption<K>[], choose: (kind: K) => void): void;
} {
  const el = h('dialog', { class: 'dialog', 'aria-labelledby': 'hint-title' });
  return {
    el,
    open(d, options, choose) {
      const buttons = options.map((o) => {
        const b = h('button', { class: 'btn btn--ghost hint-option', type: 'button', 'aria-disabled': o.disabled ? 'true' : null }, o.label);
        b.addEventListener('click', () => {
          if (o.disabled) return;
          el.close();
          choose(o.kind);
        });
        return b;
      });
      const close = h('button', { class: 'btn btn--primary', type: 'button' }, d.app.close);
      close.addEventListener('click', () => el.close());
      el.replaceChildren(
        h(
          'div',
          { class: 'dialog__body' },
          h('h2', { id: 'hint-title' }, d.hint.title),
          h('div', { class: 'hint-options' }, ...buttons),
          h('p', { class: 'dialog__note' }, d.hint.counted),
          h('div', { class: 'dialog__actions' }, close),
        ),
      );
      if (!el.open) el.showModal();
      (buttons.find((_, i) => !options[i]!.disabled) ?? close).focus();
    },
  };
}
