// Menu: language, large board, vibration, clear progress, about the game and the "Made by way1ong" line.
import { BLOCKS } from '../config.ts';
import { h } from './dom.ts';
import { dict, LANGS, type Dict } from './i18n.ts';
import type { Settings } from './storage.ts';

export interface MenuActions {
  setLang(lang: string): void;
  setBig(on: boolean): void;
  setVibration(on: boolean): void;
  clearProgress(): void;
}

export function createMenuDialog(): { el: HTMLDialogElement; open(d: Dict, lang: string, settings: Settings, actions: MenuActions): void } {
  const el = h('dialog', { class: 'dialog' });
  return {
    el,
    open(d, lang, settings, actions) {
      const langs = h('div', { class: 'choices', role: 'group', 'aria-label': d.settings.language });
      for (const code of LANGS) {
        const b = h('button', { class: 'choices__btn', type: 'button', lang: code, 'aria-pressed': String(code === lang) }, dict(code).meta.langName);
        b.addEventListener('click', () => actions.setLang(code));
        langs.append(b);
      }

      const toggle = (label: string, checked: boolean, onChange: (on: boolean) => void) => {
        const input = h('input', { type: 'checkbox', checked });
        input.addEventListener('change', () => onChange(input.checked));
        return h('label', { class: 'toggle' }, input, h('span', {}, label));
      };

      let armed = false;
      const reset = h('button', { class: 'btn btn--ghost', type: 'button' }, d.settings.reset);
      const resetNote = h('output', { class: 'dialog__note' });
      reset.addEventListener('click', () => {
        if (!armed) {
          armed = true;
          resetNote.textContent = d.settings.resetSure;
          return;
        }
        armed = false;
        actions.clearProgress();
        resetNote.textContent = d.settings.resetDone;
      });

      const site = BLOCKS.links.site;
      const credit = site ? h('a', { href: site }, d.about.credit) : h('span', {}, d.about.credit);
      const close = h('button', { class: 'btn btn--primary', type: 'button' }, d.actions.close);
      close.addEventListener('click', () => el.close());

      el.replaceChildren(
        h(
          'div',
          { class: 'dialog__body' },
          h('h2', {}, d.settings.title),
          h('p', { class: 'dialog__label' }, d.settings.language),
          langs,
          toggle(d.settings.big, settings.big, actions.setBig),
          'vibrate' in navigator ? toggle(d.settings.vibration, settings.vibration, actions.setVibration) : null,
          reset,
          resetNote,
          h('h2', {}, d.about.title),
          h('p', {}, d.about.text),
          h('p', {}, d.app.hint),
          h('p', { class: 'dialog__note' }, d.about.keys),
          h('p', { class: 'dialog__credit' }, credit),
          h('div', { class: 'dialog__actions' }, close),
        ),
      );
      if (!el.open) el.showModal();
      close.focus();
    },
  };
}
