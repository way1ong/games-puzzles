// Menu: language, large board, vibration, installing, clear progress, about the game and the "Made by
// way1ong" line.
import { BLOCKS } from '../config.ts';
import { h } from './dom.ts';
import { dict, LANGS, type Dict } from './i18n.ts';
import { install, installWay } from './install.ts';
import type { Settings } from './storage.ts';

/**
 * Vibration only where it can work: the phone supports it and the game is not shown inside another site's
 * frame (browsers block vibration there), so the switch never does nothing.
 */
function canVibrate(): boolean {
  return 'vibrate' in navigator && window.self === window.top;
}

export interface MenuActions {
  setLang(lang: string): void;
  setBig(on: boolean): void;
  setVibration(on: boolean): void;
  clearProgress(): void;
}

export function createMenuDialog(): { el: HTMLDialogElement; open(d: Dict, lang: string, settings: Settings, actions: MenuActions): void } {
  const el = h('dialog', { class: 'dialog' });
  const menu = {
    el,
    open(d: Dict, lang: string, settings: Settings, actions: MenuActions): void {
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

      // Install: the browser's window (the menu is drawn again afterwards: the offer works once) or how to.
      const way = installWay();
      let installPart: HTMLElement | null = null;
      if (way === 'prompt') {
        const button = h('button', { class: 'btn btn--ghost', type: 'button' }, d.settings.install);
        button.addEventListener('click', async () => {
          await install();
          if (el.open) menu.open(d, lang, settings, actions);
        });
        installPart = button;
      } else if (way === 'ios') {
        installPart = h('p', { class: 'dialog__note' }, d.settings.installIos);
      }

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
          canVibrate() ? toggle(d.settings.vibration, settings.vibration, actions.setVibration) : null,
          installPart,
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
  return menu;
}
