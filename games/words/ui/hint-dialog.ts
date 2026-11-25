// The hint: three kinds to choose from — the first letter of a word, the letter of a cell the player chooses,
// a whole word. All free; each is counted.
import { h } from '../../../shared/ui/dom.ts';
import type { Dict } from './i18n.ts';

export type HintKind = 'firstLetter' | 'chooseCell' | 'wholeWord';

export function createHintDialog(): { el: HTMLDialogElement; open(d: Dict, choose: (kind: HintKind) => void): void } {
  const el = h('dialog', { class: 'dialog', 'aria-labelledby': 'hint-title' });
  return {
    el,
    open(d, choose) {
      const option = (kind: HintKind, label: string) => {
        const b = h('button', { class: 'btn btn--ghost hint-option', type: 'button' }, label);
        b.addEventListener('click', () => {
          el.close();
          choose(kind);
        });
        return b;
      };
      const close = h('button', { class: 'btn btn--primary', type: 'button' }, d.app.close);
      close.addEventListener('click', () => el.close());
      const first = option('firstLetter', d.hint.firstLetter);
      el.replaceChildren(
        h(
          'div',
          { class: 'dialog__body' },
          h('h2', { id: 'hint-title' }, d.hint.title),
          h('div', { class: 'hint-options' }, first, option('chooseCell', d.hint.chooseCell), option('wholeWord', d.hint.wholeWord)),
          h('p', { class: 'dialog__note' }, d.hint.counted),
          h('div', { class: 'dialog__actions' }, close),
        ),
      );
      if (!el.open) el.showModal();
      first.focus();
    },
  };
}
