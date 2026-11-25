// Menu: language (words and texts), the settings — the player's choice (decision of 24.11) — reported words,
// statistics, installing, clearing progress, about the game with the dictionaries' sources and licences, and
// the "Made by way1ong" line.
import { copyControl } from '../../../shared/ui/copy.ts';
import { h } from '../../../shared/ui/dom.ts';
import { install, installWay } from '../../../shared/ui/install.ts';
import { WORDS, WORD_LANGS, type WordLang } from '../config.ts';
import { hasLicence, loadLicence, loadNotice } from './dict-load.ts';
import { dict, fmt, num, plural, type Dict } from './i18n.ts';
import type { InputMode, Reported, Settings, Stats, Theme } from './storage.ts';

function canVibrate(): boolean {
  return 'vibrate' in navigator && window.self === window.top;
}

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
  reported: Reported[];
  /** How to make a word, as the input setting says. */
  tip: string;
}

export function createMenuDialog(): { el: HTMLDialogElement; open(content: MenuContent, actions: MenuActions): void } {
  const el = h('dialog', { class: 'dialog dialog--menu', 'aria-labelledby': 'menu-title' });
  const menu = {
    el,
    open(content: MenuContent, actions: MenuActions): void {
      const { d, lang, settings, stats } = content;
      const s = d.settings;

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
      for (const code of WORD_LANGS) {
        const b = h('button', { class: 'choices__btn', type: 'button', lang: code, 'aria-pressed': String(code === lang) }, dict(code).meta.langName);
        b.addEventListener('click', () => actions.setLang(code));
        langs.append(b);
      }

      const play = [
        ...choices<InputMode>(
          s.input,
          [
            { value: 'both', text: s.inputBoth },
            { value: 'swipe', text: s.inputSwipe },
            { value: 'tap', text: s.inputTap },
          ],
          settings.input,
          (input) => actions.set({ input }),
        ),
        toggle(s.showCells, settings.showCells, (on) => actions.set({ showCells: on })),
        toggle(s.showLeft, settings.showLeft, (on) => actions.set({ showLeft: on })),
        toggle(s.showBonus, settings.showBonus, (on) => actions.set({ showBonus: on })),
        toggle(s.time, settings.time, (on) => actions.set({ time: on })),
        toggle(s.grace, settings.grace, (on) => actions.set({ grace: on })),
        lang === 'hu' ? toggle(s.huTiles, settings.huTiles, (on) => actions.set({ huTiles: on })) : null,
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

      // Reported words: a list to copy and send by hand.
      const reported = content.reported;
      const reportedPart: (HTMLElement | null)[] = [h('h2', {}, d.reported.title)];
      if (!reported.length) reportedPart.push(h('p', { class: 'dialog__note' }, d.reported.none));
      else {
        const text = reported.map((r) => fmt(d.reported.line, { lang: r.lang, word: r.word, verdict: r.verdict })).join('\n');
        reportedPart.push(h('ul', { class: 'reported' }, ...reported.map((r) => h('li', { lang: r.lang }, r.word))));
        reportedPart.push(h('p', { class: 'dialog__note' }, d.reported.note));
        const copy = copyControl({ label: d.reported.copy, done: d.reported.copied, text });
        reportedPart.push(h('div', { class: 'dialog__actions dialog__actions--start' }, copy.button), copy.out);
      }

      const st = stats[lang as WordLang] ?? stats.en;
      const statsList = h(
        'dl',
        { class: 'stats' },
        ...(
          [
            [d.stats.levels, st.levels],
            [d.stats.words, st.words],
            [d.stats.bonus, st.bonus],
            [d.stats.hints, st.hints],
            [d.stats.dailies, st.dailies],
          ] as const
        ).flatMap(([label, value]) => [h('dt', {}, label), h('dd', {}, num(lang, value))]),
      );

      // The dictionaries' sources and licences, as written next to the lists (in English: legal texts).
      const notice = h('pre', { class: 'notice', lang: 'en', tabindex: 0 });
      void loadNotice(lang as WordLang)
        .then((t) => (notice.textContent = t))
        .catch(() => (notice.textContent = ''));
      // The full licence text some lists come with, inside the game: a link would take an installed game out
      // to the browser, and a test page cannot open one at all.
      let licence: HTMLElement | null = null;
      if (hasLicence(lang as WordLang)) {
        const full = h('pre', { class: 'notice', lang: 'en', tabindex: 0 });
        const details = h('details', { class: 'licence' }, h('summary', {}, d.about.licence), full);
        details.addEventListener('toggle', () => {
          if (!details.open || full.textContent) return;
          void loadLicence(lang as WordLang)
            .then((t) => (full.textContent = t))
            .catch(() => (full.textContent = ''));
        });
        licence = details;
      }

      const site = WORDS.links.site;
      const credit = site ? h('a', { href: site }, d.about.credit) : h('span', {}, d.about.credit);
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
          ...play,
          h('h3', {}, s.look),
          ...look,
          installPart,
          reset,
          resetNote,
          ...reportedPart,
          h('h2', {}, d.stats.title),
          statsList,
          h('h2', {}, d.about.title),
          h('p', {}, plural(lang, WORDS.minWord, d.about.rules, { n: WORDS.minWord })),
          h('p', {}, d.about.forms),
          h('p', {}, content.tip),
          h('p', {}, d.about.text),
          h('p', { class: 'dialog__note' }, d.about.keys),
          h('h3', {}, d.about.dictionaries),
          h('p', { class: 'dialog__note' }, d.about.dictionariesNote),
          notice,
          licence,
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
