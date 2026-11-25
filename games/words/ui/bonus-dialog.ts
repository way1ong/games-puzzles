// The bonus words of the level: real words made of its letters that are not in the crossword.
import { h } from '../../../shared/ui/dom.ts';
import type { Dict } from './i18n.ts';

export function createBonusDialog(): { el: HTMLDialogElement; open(d: Dict, words: readonly string[], lang: string): void } {
  const el = h('dialog', { class: 'dialog', 'aria-labelledby': 'bonus-title' });
  return {
    el,
    open(d, words, lang) {
      const close = h('button', { class: 'btn btn--primary', type: 'button' }, d.app.close);
      close.addEventListener('click', () => el.close());
      el.replaceChildren(
        h(
          'div',
          { class: 'dialog__body' },
          h('h2', { id: 'bonus-title' }, d.bonusList.title),
          words.length
            ? h('ul', { class: 'bonus-list', lang }, ...[...words].sort((a, b) => a.localeCompare(b, lang)).map((w) => h('li', {}, w)))
            : h('p', { class: 'dialog__note' }, d.bonusList.none),
          h('div', { class: 'dialog__actions' }, close),
        ),
      );
      if (!el.open) el.showModal();
      close.focus();
    },
  };
}
