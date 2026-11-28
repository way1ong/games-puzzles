// The start screen (docs/mines/SPEC.md, "Екрани"): the three levels — their size and mines, and "Continue" when a field
// of the level is begun — and the player's own size (its last size; "Choose" opens the choice of it); the fields of the
// day of the three levels (new, begun or cleared) and the streak of days.
import { h } from '../../../shared/ui/dom.ts';
import { LEVELS, type Kind, type Level, type LevelRule } from '../config.ts';
import { ruleOf, type CustomSize } from '../core/custom.ts';
import { fmt, plural, type Dict } from './i18n.ts';
import { checkSign } from './icons.ts';

export type DayState = 'new' | 'started' | 'done';

export interface HomeData {
  /** For each level and the player's own size: an ordinary field begun and not cleared. */
  started: Record<Kind, boolean>;
  /** The player's own size: of the field begun, else the one chosen last. */
  custom: CustomSize;
  daily: Record<Level, DayState>;
  /** Today, in words of the language. */
  date: string;
  streak: number;
}

export const levelRoute = (level: Kind): string => level;
export const dailyRoute = (level: Level): string => `daily-${level}`;
/** The choice of the player's own size. */
export const CUSTOM_SIZE_ROUTE = 'custom-size';

/** "16 × 16, 40 mines": a rule's size and mines. */
export function sizeText(rule: Pick<LevelRule, 'width' | 'height' | 'mines'>, d: Dict, lang: string): string {
  const { width, height, mines } = rule;
  return plural(lang, mines, d.home.size, { width, height, mines });
}

export function homeView(data: HomeData, d: Dict, lang: string, open: (route: string) => void): HTMLElement {
  const pick = (name: string, state: (Node | string)[], info: string, route: string, kind = '') => {
    const b = h(
      'button',
      { class: `pick ${kind}`.trim(), type: 'button' },
      h('span', { class: 'pick__name' }, name),
      h('span', { class: 'pick__state' }, ...state),
      h('span', { class: 'pick__info' }, info),
    );
    b.addEventListener('click', () => open(route));
    return b;
  };
  const levels = h(
    'section',
    { class: 'home__part' },
    h('h2', {}, d.home.levels),
    ...LEVELS.map((level) =>
      pick(d.levels[level], [data.started[level] ? d.home.continue : d.home.start], sizeText(ruleOf(level, null), d, lang), levelRoute(level), data.started[level] ? 'pick--resume' : ''),
    ),
    // the player's own size: a field begun goes on; else its size is chosen first
    data.started.custom
      ? pick(d.levels.custom, [d.home.continue], sizeText(data.custom, d, lang), levelRoute('custom'), 'pick--resume')
      : pick(d.levels.custom, [d.home.choose], sizeText(data.custom, d, lang), CUSTOM_SIZE_ROUTE),
  );
  const states = { new: d.home.begin, started: d.home.started, done: d.home.done };
  const days = h(
    'section',
    { class: 'home__part' },
    h('h2', {}, fmt(d.home.dailyTitle, { date: data.date })),
    ...LEVELS.map((level) => {
      const s = data.daily[level];
      return pick(d.levels[level], s === 'done' ? [checkSign(), states[s]] : [states[s]], d.home.dailyNote, dailyRoute(level), `is-${s}`);
    }),
    data.streak > 0 ? h('p', { class: 'home__streak' }, plural(lang, data.streak, d.home.streak, { n: data.streak })) : null,
  );
  return h('div', { class: 'home' }, levels, days);
}
