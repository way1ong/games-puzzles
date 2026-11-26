// Menu: language, large mode, installing, clear progress, about the game and the "Made by way1ong" line.
import { h } from '../../../shared/ui/dom.ts';
import { updateLine } from '../../../shared/ui/update-view.ts';
import { install, installWay } from '../../../shared/ui/install.ts';
import { DETECTIVE } from '../config.ts';
import { dict, LANGS, type Dict } from './i18n.ts';
import type { Settings } from './storage.ts';

export interface MenuActions {
  setLang(lang: string): void;
  setBig(on: boolean): void;
  clearProgress(): void;
}

export function createMenuDialog(): { el: HTMLDialogElement; open(d: Dict, lang: string, settings: Settings, actions: MenuActions): void } {
  const el = h('dialog', { class: 'dialog', 'aria-labelledby': 'menu-title' });
  const menu = {
    el,
    open(d: Dict, lang: string, settings: Settings, actions: MenuActions): void {
      const langs = h('div', { class: 'choices', role: 'group', 'aria-label': d.settings.language });
      for (const code of LANGS) {
        const b = h('button', { class: 'choices__btn', type: 'button', lang: code, 'aria-pressed': String(code === lang) }, dict(code).meta.langName);
        b.addEventListener('click', () => actions.setLang(code));
        langs.append(b);
      }

      const big = h('input', { type: 'checkbox', checked: settings.big });
      big.addEventListener('change', () => actions.setBig(big.checked));

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

      const site = DETECTIVE.links.site;
      const credit = site ? h('a', { href: site }, d.about.credit) : h('span', {}, d.about.credit);
      const close = h('button', { class: 'btn btn--primary', type: 'button' }, d.actions.close);
      close.addEventListener('click', () => el.close());

      el.replaceChildren(
        h(
          'div',
          { class: 'dialog__body' },
          h('h2', { id: 'menu-title' }, d.settings.title),
          updateLine(d.update),
          h('p', { class: 'dialog__label' }, d.settings.language),
          langs,
          h('label', { class: 'toggle' }, big, h('span', {}, d.settings.big)),
          installPart,
          reset,
          resetNote,
          h('h2', {}, d.about.title),
          h('p', {}, d.about.text),
          h('p', {}, d.about.how),
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
