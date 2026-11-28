// Menu: language; the settings approved on 25.11 (playing and look), Spider's suits (26.11), FreeCell's free cells and
// its cards going home by themselves (28.11); full screen on its side where the browser can (26.11); installing;
// clearing progress; statistics for each way of turning the stock, each number of Spider's suits and of FreeCell's free
// cells; about the game and the "Made by way1ong" line (docs/solitaire/SPEC.md, "Налаштування").
import { h } from '../../../shared/ui/dom.ts';
import { updateLine } from '../../../shared/ui/update-view.ts';
import { install, installWay } from '../../../shared/ui/install.ts';
import { DRAWS, FREE_CELLS, SOLITAIRE, SPIDER_SUITS, type Draw, type FreeCells, type SpiderSuits } from '../config.ts';
import type { FreeCellStats } from '../core/freecell-stats.ts';
import type { SpiderStats } from '../core/spider-stats.ts';
import type { DrawStats, Stats } from '../core/stats.ts';
import { dict, LANGS, num, plural, type Dict } from './i18n.ts';
import type { Deals, Look, Settings, Theme } from './storage.ts';
import { clockText } from './time.ts';

export interface MenuActions {
  setLang(lang: string): void;
  set(patch: Partial<Settings>): void;
  clearProgress(): void;
  /** Full screen on its side, or back (only offered where the browser can). */
  fullscreen(): void;
}

export interface MenuContent {
  d: Dict;
  lang: string;
  settings: Settings;
  stats: Stats;
  /** The longest run of deals of the day, in days. */
  longest: number;
  spiderStats: SpiderStats;
  /** The longest run of Spider of the day, in days. */
  spiderLongest: number;
  freecellStats: FreeCellStats;
  /** The longest run of FreeCell of the day, in days. */
  freecellLongest: number;
  /** Full screen on its side: null — the browser cannot; else whether it is on now. */
  full: boolean | null;
}

export function createMenuDialog(): { el: HTMLDialogElement; open(content: MenuContent, actions: MenuActions): void } {
  const el = h('dialog', { class: 'dialog dialog--menu', 'aria-labelledby': 'menu-title' });
  const menu = {
    el,
    open(content: MenuContent, actions: MenuActions): void {
      const { d, lang, settings, stats } = content;
      const s = d.settings;

      /** Buttons of which one is chosen. */
      const choices = <T extends string | number>(label: string, options: readonly { value: T; text: string; lang?: string }[], current: T, choose: (value: T) => void) => {
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

      const langs = h('div', { class: 'choices', role: 'group', 'aria-label': s.language });
      for (const code of LANGS) {
        const b = h('button', { class: 'choices__btn', type: 'button', lang: code, 'aria-pressed': String(code === lang) }, dict(code).meta.langName);
        b.addEventListener('click', () => actions.setLang(code));
        langs.append(b);
      }

      const play = [
        ...choices<Draw>(
          s.draw,
          [
            { value: 1, text: s.drawOne },
            { value: 3, text: s.drawThree },
          ],
          settings.draw,
          (draw) => actions.set({ draw }),
        ),
        ...choices<Deals>(
          s.deals,
          [
            { value: 'winnable', text: s.dealsWinnable },
            { value: 'any', text: s.dealsAny },
          ],
          settings.deals,
          (deals) => actions.set({ deals }),
        ),
        ...choices<SpiderSuits>(
          d.spider.setting,
          SPIDER_SUITS.map((n) => ({ value: n, text: plural(lang, n, d.spider.suits, { n }) })),
          settings.spiderSuits,
          (spiderSuits) => actions.set({ spiderSuits }),
        ),
        h('p', { class: 'dialog__note' }, d.spider.settingNote),
        ...choices<FreeCells>(
          d.freecell.setting,
          FREE_CELLS.map((n) => ({ value: n, text: plural(lang, n, d.freecell.cells, { n }) })),
          settings.freeCells,
          (freeCells) => actions.set({ freeCells }),
        ),
        h('p', { class: 'dialog__note' }, d.freecell.settingNote),
        toggle(d.freecell.autoHome, settings.autoHome, (on) => actions.set({ autoHome: on })),
        toggle(s.time, settings.time, (on) => actions.set({ time: on })),
      ];
      let fullPart: HTMLElement | null = null;
      if (content.full !== null) {
        fullPart = h('button', { class: 'btn btn--ghost', type: 'button' }, content.full ? d.spider.fullscreenExit : d.spider.fullscreen);
        fullPart.addEventListener('click', () => {
          el.close();
          actions.fullscreen();
        });
      }
      const look = [
        ...choices<Look>(
          s.style,
          [
            { value: 'drawn', text: s.styleDrawn },
            { value: 'simple', text: s.styleSimple },
          ],
          settings.look,
          (value) => actions.set({ look: value }),
        ),
        toggle(s.leftHand, settings.leftHand, (on) => actions.set({ leftHand: on })),
        toggle(s.fourColours, settings.fourColours, (on) => actions.set({ fourColours: on })),
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

      /** A table of statistics: a row for each kind of deal. */
      const statsTable = (kind: string, rows: { name: string; st: DrawStats }[]) =>
        h(
          'table',
          { class: 'stats' },
          h(
            'thead',
            {},
            h(
              'tr',
              {},
              h('th', { scope: 'col' }, kind),
              h('th', { scope: 'col' }, d.stats.played),
              h('th', { scope: 'col' }, d.stats.won),
              h('th', { scope: 'col' }, d.stats.clean),
              settings.time ? h('th', { scope: 'col' }, d.stats.best) : null,
            ),
          ),
          h(
            'tbody',
            {},
            ...rows.map(({ name, st }) =>
              h(
                'tr',
                {},
                h('th', { scope: 'row' }, name),
                h('td', {}, num(lang, st.played)),
                h('td', {}, num(lang, st.won)),
                h('td', {}, num(lang, st.clean)),
                settings.time ? h('td', {}, st.bestMs === null ? d.stats.none : clockText(st.bestMs)) : null,
              ),
            ),
          ),
        );
      const klondikeStats = statsTable(
        d.stats.kind,
        DRAWS.map((draw) => ({ name: draw === 1 ? s.drawOne : s.drawThree, st: stats[draw] })),
      );
      const spiderStats = statsTable(
        d.spider.statsKind,
        SPIDER_SUITS.map((n) => ({ name: plural(lang, n, d.spider.suits, { n }), st: content.spiderStats[n] })),
      );
      const freecellStats = statsTable(
        d.freecell.statsKind,
        FREE_CELLS.map((n) => ({ name: plural(lang, n, d.freecell.cells, { n }), st: content.freecellStats[n] })),
      );

      const site = SOLITAIRE.links.site;
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
          fullPart,
          installPart,
          reset,
          resetNote,
          h('h2', {}, d.stats.title),
          h('h3', {}, d.home.game),
          klondikeStats,
          h('p', {}, plural(lang, content.longest, d.stats.longest, { n: content.longest })),
          h('h3', {}, d.spider.title),
          spiderStats,
          h('p', {}, plural(lang, content.spiderLongest, d.spider.longest, { n: content.spiderLongest })),
          h('h3', {}, d.freecell.title),
          freecellStats,
          h('p', {}, plural(lang, content.freecellLongest, d.freecell.longest, { n: content.freecellLongest })),
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
