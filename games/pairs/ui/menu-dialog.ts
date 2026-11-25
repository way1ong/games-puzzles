// Menu: language; the settings approved on 25.11 (playing and look); installing; clearing progress; statistics;
// about the game and the "Made by way1ong" line (docs/pairs/SPEC.md, "Налаштування").
import { h } from '../../../shared/ui/dom.ts';
import { install, installWay } from '../../../shared/ui/install.ts';
import { PAIRS } from '../config.ts';
import type { Stats } from '../core/stats.ts';
import { dict, LANGS, num, plural, type Dict } from './i18n.ts';
import type { Settings, Theme } from './storage.ts';

export interface MenuActions {
  setLang(lang: string): void;
  set(patch: Partial<Settings>): void;
  clearProgress(): void;
}

export interface MenuContent {
  d: Dict;
  lang: string;
  settings: Settings;
  stats: Stats;
  /** The longest run of layouts of the day, in days. */
  longest: number;
}

export function createMenuDialog(): { el: HTMLDialogElement; open(content: MenuContent, actions: MenuActions): void } {
  const el = h('dialog', { class: 'dialog dialog--menu', 'aria-labelledby': 'menu-title' });
  const menu = {
    el,
    open(content: MenuContent, actions: MenuActions): void {
      const { d, lang, settings, stats } = content;
      const s = d.settings;

      const toggle = (label: string, checked: boolean, onChange: (on: boolean) => void) => {
        const input = h('input', { type: 'checkbox', checked });
        input.addEventListener('change', () => onChange(input.checked));
        return h('label', { class: 'toggle' }, input, h('span', {}, label));
      };

      const langs = h('div', { class: 'choices', role: 'group', 'aria-label': s.language });
      for (const code of LANGS) {
        const b = h('button', { class: 'choices__btn', type: 'button', lang: code, 'aria-pressed': String(code === lang) }, dict(code).meta.langName);
        b.addEventListener('click', () => actions.setLang(code));
        langs.append(b);
      }

      const themes = h('div', { class: 'choices', role: 'group', 'aria-label': s.theme });
      const themeOptions: { value: Theme; text: string }[] = [
        { value: 'system', text: s.themeSystem },
        { value: 'light', text: s.themeLight },
        { value: 'dark', text: s.themeDark },
      ];
      for (const o of themeOptions) {
        const b = h('button', { class: 'choices__btn', type: 'button', 'aria-pressed': String(o.value === settings.theme) }, o.text);
        b.addEventListener('click', () => {
          for (const other of themes.querySelectorAll('button')) other.setAttribute('aria-pressed', String(other === b));
          actions.set({ theme: o.value });
        });
        themes.append(b);
      }

      let armed = false;
      const reset = h('button', { class: 'btn btn--ghost', type: 'button' }, s.reset);
      const resetNote = h('output', { class: 'dialog__note' });
      reset.addEventListener('click', () => {
        if (!armed) {
          armed = true;
          resetNote.textContent = s.resetSure;
          return;
        }
        armed = false;
        actions.clearProgress();
        resetNote.textContent = s.resetDone;
      });

      // Install: the browser's window (the menu is drawn again afterwards: the offer works once) or how to.
      const way = installWay();
      let installPart: HTMLElement | null = null;
      if (way === 'prompt') {
        const button = h('button', { class: 'btn btn--ghost', type: 'button' }, s.install);
        button.addEventListener('click', async () => {
          await install();
          if (el.open) menu.open(content, actions);
        });
        installPart = button;
      } else if (way === 'ios') {
        installPart = h('p', { class: 'dialog__note' }, s.installIos);
      }

      const row = (name: string, passed: number, clean: number) =>
        h('tr', {}, h('th', { scope: 'row' }, name), h('td', {}, num(lang, passed)), h('td', {}, num(lang, clean)));
      const statsTable = h(
        'table',
        { class: 'stats' },
        h('thead', {}, h('tr', {}, h('td', {}), h('th', { scope: 'col' }, d.stats.passed), h('th', { scope: 'col' }, d.stats.clean))),
        h('tbody', {}, row(d.stats.levels, stats.levels, stats.levelsClean), row(d.stats.days, stats.days, stats.daysClean)),
      );

      const site = PAIRS.links.site;
      const credit = site ? h('a', { href: site }, d.about.credit) : h('span', {}, d.about.credit);
      // Close at the top (the menu is long: the focus starts here, not at the end) and once more at the end.
      const close = h('button', { class: 'btn btn--ghost', type: 'button' }, d.app.close);
      const closeEnd = h('button', { class: 'btn btn--primary', type: 'button' }, d.app.close);
      close.addEventListener('click', () => el.close());
      closeEnd.addEventListener('click', () => el.close());

      el.replaceChildren(
        h(
          'div',
          { class: 'dialog__body' },
          h('div', { class: 'dialog__head' }, h('h2', { id: 'menu-title' }, s.title), close),
          h('p', { class: 'dialog__label' }, s.language),
          langs,
          h('h3', {}, s.play),
          toggle(s.dim, settings.dim, (on) => actions.set({ dim: on })),
          toggle(s.pairs, settings.pairs, (on) => actions.set({ pairs: on })),
          toggle(s.time, settings.time, (on) => actions.set({ time: on })),
          h('h3', {}, s.look),
          toggle(s.big, settings.big, (on) => actions.set({ big: on })),
          h('p', { class: 'dialog__label' }, s.theme),
          themes,
          installPart,
          reset,
          resetNote,
          h('h2', {}, d.stats.title),
          statsTable,
          h('p', {}, plural(lang, content.longest, d.stats.longest, { n: content.longest })),
          h('h2', {}, d.about.title),
          h('p', {}, d.about.rules),
          h('p', {}, d.about.text),
          h('p', { class: 'dialog__note' }, d.about.keys),
          h('p', { class: 'dialog__credit' }, credit),
          h('div', { class: 'dialog__actions' }, closeEnd),
        ),
      );
      if (!el.open) el.showModal();
      close.focus();
    },
  };
  return menu;
}
