// Menu: language; the settings approved on 24.11 (playing, look and sound); "new puzzle" while a game is open;
// installing; clearing progress; statistics; about the game and the "Made by way1ong" line.
import { h } from '../../../shared/ui/dom.ts';
import { updateLine } from '../../../shared/ui/update-view.ts';
import { install, installWay } from '../../../shared/ui/install.ts';
import { LEVELS, SUDOKU } from '../config.ts';
import type { Stats } from '../core/stats.ts';
import { dict, LANGS, num, type Dict } from './i18n.ts';
import type { ErrorMode, InputMode, Settings, Theme } from './storage.ts';
import { clockText } from './time.ts';

/**
 * Vibration only where it can work: the phone supports it and the game is not shown inside another site's
 * frame (browsers block vibration there), so the switch never does nothing.
 */
function canVibrate(): boolean {
  return 'vibrate' in navigator && window.self === window.top;
}

export interface MenuActions {
  setLang(lang: string): void;
  set(patch: Partial<Settings>): void;
  /** Present while an ordinary game is open: a new puzzle of its level. */
  newPuzzle: (() => void) | null;
  clearProgress(): void;
}

export interface MenuContent {
  d: Dict;
  lang: string;
  settings: Settings;
  stats: Stats;
  /** How to place a digit, as the input setting says. */
  tip: string;
}

export function createMenuDialog(): { el: HTMLDialogElement; open(content: MenuContent, actions: MenuActions): void } {
  const el = h('dialog', { class: 'dialog dialog--menu', 'aria-labelledby': 'menu-title' });
  const menu = {
    el,
    open(content: MenuContent, actions: MenuActions): void {
      const { d, lang, settings, stats } = content;

      /** Buttons of which one is chosen (languages, error check, input, theme). */
      const choices = <T extends string>(label: string, options: readonly { value: T; text: string; lang?: string }[], current: T, choose: (value: T) => void) => {
        const group = h('div', { class: 'choices', role: 'group', 'aria-label': label });
        for (const o of options) {
          const b = h('button', { class: 'choices__btn', type: 'button', lang: o.lang, 'aria-pressed': String(o.value === current) }, o.text);
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

      const langs = h('div', { class: 'choices', role: 'group', 'aria-label': d.settings.language });
      for (const code of LANGS) {
        const b = h('button', { class: 'choices__btn', type: 'button', lang: code, 'aria-pressed': String(code === lang) }, dict(code).meta.langName);
        b.addEventListener('click', () => actions.setLang(code));
        langs.append(b);
      }

      const s = d.settings;
      const play = [
        toggle(s.autoNotes, settings.autoNotes, (on) => actions.set({ autoNotes: on })),
        toggle(s.fillButton, settings.fillButton, (on) => actions.set({ fillButton: on })),
        ...choices<ErrorMode>(
          s.errors,
          [
            { value: 'off', text: s.errorsOff },
            { value: 'repeats', text: s.errorsRepeats },
            { value: 'solution', text: s.errorsSolution },
          ],
          settings.errors,
          (errors) => actions.set({ errors }),
        ),
        toggle(s.peers, settings.peers, (on) => actions.set({ peers: on })),
        toggle(s.same, settings.same, (on) => actions.set({ same: on })),
        toggle(s.counts, settings.counts, (on) => actions.set({ counts: on })),
        ...choices<InputMode>(
          s.input,
          [
            { value: 'cell', text: s.inputCell },
            { value: 'digit', text: s.inputDigit },
          ],
          settings.input,
          (input) => actions.set({ input }),
        ),
        toggle(s.time, settings.time, (on) => actions.set({ time: on })),
      ];
      const look = [
        toggle(s.big, settings.big, (on) => actions.set({ big: on })),
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
        toggle(s.sound, settings.sound, (on) => actions.set({ sound: on })),
        canVibrate() ? toggle(s.vibration, settings.vibration, (on) => actions.set({ vibration: on })) : null,
      ];

      // A new puzzle drops the unfinished one: the second tap confirms.
      let thisGame: HTMLElement[] = [];
      if (actions.newPuzzle) {
        const run = actions.newPuzzle;
        let armed = false;
        const button = h('button', { class: 'btn btn--ghost', type: 'button' }, d.tools.newGame);
        const note = h('output', { class: 'dialog__note' });
        button.addEventListener('click', () => {
          if (!armed) {
            armed = true;
            note.textContent = d.game.newSure;
            return;
          }
          el.close();
          run();
        });
        thisGame = [h('h3', {}, s.game), button, note];
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

      const statsTable = h(
        'table',
        { class: 'stats' },
        h(
          'thead',
          {},
          h(
            'tr',
            {},
            h('th', { scope: 'col' }, d.levels.label),
            h('th', { scope: 'col' }, d.stats.solved),
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
              h('td', {}, num(lang, st.solved)),
              h('td', {}, num(lang, st.clean)),
              settings.time ? h('td', {}, st.bestMs === null ? d.stats.none : clockText(st.bestMs)) : null,
            );
          }),
        ),
      );

      const site = SUDOKU.links.site;
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
          ...thisGame,
          h('h3', {}, s.play),
          ...play,
          h('h3', {}, s.look),
          ...look,
          installPart,
          reset,
          resetNote,
          h('h2', {}, d.stats.title),
          statsTable,
          h('h2', {}, d.about.title),
          h('p', {}, d.about.rules),
          h('p', {}, content.tip),
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
