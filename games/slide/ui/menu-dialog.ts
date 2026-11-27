// Menu (docs/slide/SPEC.md, "Налаштування"): language; the fifteen's tiles — numbers, picture, or both (decision of
// 27.11: both in the menu); the time, vibration; the look; installing; clearing progress; statistics of both modes;
// about the game and the "Made by way1ong" line.
import { h } from '../../../shared/ui/dom.ts';
import { install, installWay } from '../../../shared/ui/install.ts';
import { updateLine } from '../../../shared/ui/update-view.ts';
import { DIFFICULTIES, SLIDE, type Face } from '../config.ts';
import type { SlideStats } from '../core/stats.ts';
import { dict, fmt, LANGS, num, plural, type Dict } from './i18n.ts';
import type { Look, Settings } from './storage.ts';

export interface MenuActions {
  setLang(lang: string): void;
  set(patch: Partial<Settings>): void;
  clearProgress(): void;
}

export interface MenuContent {
  d: Dict;
  lang: string;
  settings: Settings;
  stats: SlideStats;
  /** The longest runs of days with each mode's puzzle of the day solved. */
  longest: { fifteen: number; unblock: number };
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
        ...choices<Face>(
          s.faces,
          [
            { value: 'numbers', text: s.facesNumbers },
            { value: 'picture', text: s.facesPicture },
            { value: 'both', text: s.facesBoth },
          ],
          settings.faces,
          (faces) => actions.set({ faces }),
        ),
        h('p', { class: 'dialog__note' }, s.facesNote),
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

      const st = d.stats;
      const value = (n: number | null) => (n === null ? st.none : num(lang, n));
      /** A table of statistics that fits a phone; were the text so large that it does not, it scrolls, and then the
       * keys reach it too. */
      const table = (name: string, heads: string[], rows: (string | number | null)[][]) => {
        const t = h(
          'table',
          { class: 'stats' },
          h('thead', {}, h('tr', {}, ...heads.map((x) => h('th', { scope: 'col' }, x)))),
          h('tbody', {}, ...rows.map(([first, ...rest]) => h('tr', {}, h('th', { scope: 'row' }, String(first)), ...rest.map((x) => h('td', {}, typeof x === 'string' ? x : value(x)))))),
        );
        const wrap = h('div', { class: 'stats-wrap' }, t);
        new ResizeObserver(() => {
          if (wrap.scrollWidth > wrap.clientWidth + 1) {
            wrap.tabIndex = 0;
            wrap.setAttribute('role', 'region');
            wrap.setAttribute('aria-label', name);
          } else {
            wrap.removeAttribute('tabindex');
            wrap.removeAttribute('role');
            wrap.removeAttribute('aria-label');
          }
        }).observe(wrap);
        return wrap;
      };
      const fifteenTable = table(
        d.mode.fifteen,
        [st.size, st.played, st.won, st.clean, st.best],
        DIFFICULTIES.map((diff) => {
          const x = stats.fifteen[diff];
          return [fmt(d.home.size, { n: SLIDE.fifteen.sizes[diff] }), x.played, x.won, x.clean, x.bestMoves];
        }),
      );
      const unblockTable = table(
        d.mode.unblock,
        [st.difficulty, st.played, st.won, st.clean, st.perfect],
        DIFFICULTIES.map((diff) => {
          const x = stats.unblock.free[diff];
          return [d.difficulty[diff], x.played, x.won, x.clean, x.perfect];
        }),
      );
      const levels = stats.unblock.levels;
      const longest = (title: string, n: number) => h('p', {}, plural(lang, n, st.longest, { n, title }));

      const site = SLIDE.links.site;
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
          h('h2', {}, st.title),
          h('h3', {}, d.mode.fifteen),
          fifteenTable,
          h('p', { class: 'dialog__note' }, st.noteFifteen),
          longest(d.home.dailyFifteen, content.longest.fifteen),
          h('h3', {}, d.mode.unblock),
          h('p', {}, fmt(st.levels, { won: num(lang, levels.won), clean: num(lang, levels.clean), perfect: num(lang, levels.perfect) })),
          unblockTable,
          h('p', { class: 'dialog__note' }, st.noteUnblock),
          longest(d.home.dailyUnblock, content.longest.unblock),
          h('h2', {}, d.about.title),
          h('p', {}, d.about.fifteen),
          h('p', {}, d.about.unblock),
          h('p', {}, d.about.text),
          h('p', { class: 'dialog__note' }, d.about.keysFifteen),
          h('p', { class: 'dialog__note' }, d.about.keysUnblock),
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
