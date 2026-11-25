// What a word means (docs/words/SPEC.md, "Значення слів"): the words of a tapped crossword cell — one, or two where
// words cross — each with its short meaning, or a line saying there is none yet.
import { h } from '../../../shared/ui/dom.ts';
import type { Dict } from './i18n.ts';

export interface WordMeaning {
  word: string;
  meaning: string | null;
}

/** The words with their meanings, as a list of terms (also used in the window at the end of a level). */
export function meaningList(words: readonly WordMeaning[], d: Dict, lang: string): HTMLElement {
  return h(
    'dl',
    { class: 'meanings' },
    ...words.flatMap(({ word, meaning }) => [
      h('dt', { lang }, word),
      h('dd', meaning ? { lang } : { class: 'meanings__none' }, meaning ?? d.meaning.none),
    ]),
  );
}

export function createMeaningDialog(): { el: HTMLDialogElement; open(d: Dict, words: readonly WordMeaning[], lang: string): void } {
  const el = h('dialog', { class: 'dialog', 'aria-labelledby': 'meaning-title' });
  return {
    el,
    open(d, words, lang) {
      const close = h('button', { class: 'btn btn--primary', type: 'button' }, d.app.close);
      close.addEventListener('click', () => el.close());
      el.replaceChildren(
        h('div', { class: 'dialog__body' }, h('h2', { id: 'meaning-title' }, d.meaning.title), meaningList(words, d, lang), h('div', { class: 'dialog__actions' }, close)),
      );
      if (!el.open) el.showModal();
      close.focus();
    },
  };
}
