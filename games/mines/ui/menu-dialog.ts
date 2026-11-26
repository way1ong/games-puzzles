// Menu: language; the settings approved on 26.11 — what hides in the field (mines or flowers), who opens the first
// place, what follows a mine — and the rest (docs/mines/SPEC.md, "Налаштування"); installing; clearing progress;
// statistics for each level; about the game and the "Made by way1ong" line.
import { h } from '../../../shared/ui/dom.ts';
import { install, installWay } from '../../../shared/ui/install.ts';
import { updateLine } from '../../../shared/ui/update-view.ts';
import { LEVELS, MINES, type AfterMine, type Start, type Theme } from '../config.ts';
import type { MinesStats } from '../core/stats.ts';
import { dict, LANGS, num, plural, type Dict } from './i18n.ts';
import type { Look, Settings } from './storage.ts';
import { clockText } from './time.ts';

export interface MenuActions {
  setLang(lang: string): void;
  set(patch: Partial<Settings>): void;
  clearProgress(): void;
}

export interface MenuContent {
  d: Dict;
  lang: string;
  settings: Settings;
  stats: MinesStats;
  /** The longest run of days with a field of the day cleared. */
  longest: number;
}

/** Vibration only where the device has it and the page may use it (not inside another page's frame, where browsers
 * block it), so the switch never does nothing. */
const canVibrate = (): boolean => 'vibrate' in navigator && window.self === window.top;

export function createMenuDialog(): { el: HTMLDialogElement; open(content: MenuContent, actions: MenuActions): void } {
  const el = h('dialog', { class: 'dialog dialog--menu', 'aria-labelledby': 'menu-title' });
  const menu = {
    el,
    open(content: MenuContent, actions: MenuActions): void {
      const { d, lang, settings, stats } = content;
      const s = d.settings;

      /** Buttons of which one is chosen. */
      const choices = <T extends string>(label: string, options: readonly { value: T; text: string }[], current: T, choose: (value: T) => void) => {
        const group = h('div', { class: 'choices', role: 'group', 'aria-label': label });
        for (const o of options) {
          const b = h('button', { class: 'choices__btn', type: 'button', 'aria-pressed': String(o.value === current) }, o.text);
          b.addEventListener('click', () => {
            for (const other of group.querySelectorAll('button')) other.setAttribute('aria-pressed', String(other === b));
            choose(o.value);
          });
          group.append(b);
        }
        return [h('p', { class: 'dialog__label' }, label), group];
      };

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

      const play = [
        ...choices<Theme>(
          s.field,
          [
            { value: 'mines', text: d.themes.mines.name },
            { value: 'flowers', text: d.themes.flowers.name },
          ],
          settings.field,
          (field) => actions.set({ field }),
        ),
        ...choices<Start>(
          s.start,
          [
            { value: 'game', text: s.startGame },
            { value: 'player', text: s.startPlayer },
          ],
          settings.start,
          (start) => actions.set({ start }),
        ),
        h('p', { class: 'dialog__note' }, s.startNote),
        ...choices<AfterMine>(
          s.afterMine,
          [
            { value: 'restart', text: s.afterRestart },
            { value: 'undo', text: s.afterUndo },
          ],
          settings.afterMine,
          (afterMine) => actions.set({ afterMine }),
        ),
        toggle(s.chord, settings.chord, (on) => actions.set({ chord: on })),
        toggle(s.wrongFlags, settings.wrongFlags, (on) => actions.set({ wrongFlags: on })),
        toggle(s.time, settings.time, (on) => actions.set({ time: on })),
        canVibrate() ? toggle(s.vibration, settings.vibration, (on) => actions.set({ vibration: on })) : null,
      ];
      const look = [
        toggle(s.big, settings.big, (on) => actions.set({ big: on })),
        toggle(s.leftHand, settings.leftHand, (on) => actions.set({ leftHand: on })),
        ...choices<Look>(
          s.theme,
          [
            { value: 'system', text: s.themeSystem },
            { value: 'light', text: s.themeLight },
            { value: 'dark', text: s.themeDark },
          ],
          settings.theme,
          (theme) => actions.set({ theme }),
        ),
      ];

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

      const statsTable = h(
        'table',
        { class: 'stats' },
        h(
          'thead',
          {},
          h(
            'tr',
            {},
            h('th', { scope: 'col' }, d.stats.level),
            h('th', { scope: 'col' }, d.stats.played),
            h('th', { scope: 'col' }, d.stats.won),
            h('th', { scope: 'col' }, d.stats.clean),
            settings.time ? h('th', { scope: 'col' }, d.stats.best) : null,
          ),
        ),
        h(
          'tbody',
          {},
          ...LEVELS.map((level) => {
            const st = stats[level];
            return h(
              'tr',
              {},
              h('th', { scope: 'row' }, d.levels[level]),
              h('td', {}, num(lang, st.played)),
              h('td', {}, num(lang, st.won)),
              h('td', {}, num(lang, st.clean)),
              settings.time ? h('td', {}, st.bestMs === null ? d.stats.none : clockText(st.bestMs)) : null,
            );
          }),
        ),
      );

      const site = MINES.links.site;
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
          updateLine(d.update),
          h('p', { class: 'dialog__label' }, s.language),
          langs,
          h('h3', {}, s.play),
          ...play,
          h('h3', {}, s.look),
          ...look,
          installPart,
          reset,
          resetNote,
          h('h2', {}, d.stats.title),
          statsTable,
          h('p', { class: 'dialog__note' }, d.stats.cleanNote),
          h('p', {}, plural(lang, content.longest, d.stats.longest, { n: content.longest })),
          h('h2', {}, d.about.title),
          h('p', {}, d.themes[settings.field].rules),
          h('p', {}, d.about.text),
          h('p', {}, d.about.zoom),
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
