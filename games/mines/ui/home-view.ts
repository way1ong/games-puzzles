// The start screen (docs/mines/SPEC.md, "Екрани"): the three levels — their size and mines, and "Continue" when a field
// of the level is begun; the fields of the day of the three levels (new, begun or cleared) and the streak of days.
import { h } from '../../../shared/ui/dom.ts';
import { LEVELS, MINES, type Level } from '../config.ts';
import { fmt, plural, type Dict } from './i18n.ts';
import { checkSign } from './icons.ts';

export type DayState = 'new' | 'started' | 'done';

export interface HomeData {
  /** For each level: an ordinary field begun and not cleared. */
  started: Record<Level, boolean>;
  daily: Record<Level, DayState>;
  /** Today, in words of the language. */
  date: string;
  streak: number;
}

export const levelRoute = (level: Level): string => level;
export const dailyRoute = (level: Level): string => `daily-${level}`;

export function sizeText(level: Level, d: Dict, lang: string): string {
  const { width, height, mines } = MINES.levels[level];
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
      pick(d.levels[level], [data.started[level] ? d.home.continue : d.home.start], sizeText(level, d, lang), levelRoute(level), data.started[level] ? 'pick--resume' : ''),
    ),
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
