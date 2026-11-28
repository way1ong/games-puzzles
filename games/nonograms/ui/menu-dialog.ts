// Menu: language; the settings approved on 25.11 — a menu where everybody fits the game to themselves (playing and look);
// installing; clearing progress; statistics for each size, of the pictures in colour apart ("Кольорові малюнки");
// about the game and the "Made by way1ong" line (docs/nonograms/SPEC.md, "Налаштування").
import { h } from '../../../shared/ui/dom.ts';
import { updateLine } from '../../../shared/ui/update-view.ts';
import { install, installWay } from '../../../shared/ui/install.ts';
import { NONOGRAMS, SIZES } from '../config.ts';
import type { SecondTap } from '../core/play.ts';
import type { Stats } from '../core/stats.ts';
import { dict, LANGS, num, plural, type Dict } from './i18n.ts';
import type { Settings, Theme } from './storage.ts';
import { clockText } from './time.ts';
import { sizeText } from './words.ts';

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
  /** Statistics of the pictures in colour. */
  colourStats: Stats;
  /** The longest run of pictures of the day, in days. */
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
        ...choices<SecondTap>(
          s.secondTap,
          [
            { value: 'clear', text: s.secondClear },
            { value: 'cross', text: s.secondCross },
          ],
          settings.secondTap,
          (secondTap) => actions.set({ secondTap }),
        ),
        toggle(s.mistakes, settings.mistakes, (on) => actions.set({ mistakes: on })),
        toggle(s.autoCross, settings.autoCross, (on) => actions.set({ autoCross: on })),
        toggle(s.time, settings.time, (on) => actions.set({ time: on })),
        canVibrate() ? toggle(s.vibration, settings.vibration, (on) => actions.set({ vibration: on })) : null,
      ];
      const look = [
        toggle(s.fade, settings.fade, (on) => actions.set({ fade: on })),
        toggle(s.highlight, settings.highlight, (on) => actions.set({ highlight: on })),
        ...choices<'after' | 'first'>(
          s.name,
          [
            { value: 'after', text: s.nameAfter },
            { value: 'first', text: s.nameFirst },
          ],
          settings.nameFirst ? 'first' : 'after',
          (when) => actions.set({ nameFirst: when === 'first' }),
        ),
        toggle(s.colour, settings.colour, (on) => actions.set({ colour: on })),
        toggle(s.big, settings.big, (on) => actions.set({ big: on })),
        toggle(s.leftHand, settings.leftHand, (on) => actions.set({ leftHand: on })),
        ...choices<Theme>(
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

      const statsTable = (of: Stats) =>
        h(
          'table',
          { class: 'stats' },
          h(
            'thead',
            {},
            h(
              'tr',
              {},
              h('th', { scope: 'col' }, d.stats.size),
              h('th', { scope: 'col' }, d.stats.solved),
              h('th', { scope: 'col' }, d.stats.hints),
              settings.time ? h('th', { scope: 'col' }, d.stats.best) : null,
            ),
          ),
          h(
            'tbody',
            {},
            ...SIZES.map((size) => {
              const st = of[size];
              return h(
                'tr',
                {},
                h('th', { scope: 'row' }, sizeText(size, d)),
                h('td', {}, num(lang, st.solved)),
                h('td', {}, num(lang, st.hints)),
                settings.time ? h('td', {}, st.bestMs === null ? d.stats.none : clockText(st.bestMs)) : null,
              );
            }),
          ),
        );

      const site = NONOGRAMS.links.site;
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
          statsTable(stats),
          h('p', {}, plural(lang, content.longest, d.stats.longest, { n: content.longest })),
          h('h3', {}, d.stats.colour),
          statsTable(content.colourStats),
          h('h2', {}, d.about.title),
          h('p', {}, d.about.rules),
          h('p', {}, d.about.colour),
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
