// The start screen: the level to play (to start or to continue) and how many are passed; today's layout of the
// day (new, started or done) and the streak of days (docs/pairs/SPEC.md, "Екрани й керування").
import { h } from '../../../shared/ui/dom.ts';
import { fmt, plural, type Dict } from './i18n.ts';
import { checkSign } from './icons.ts';
import type { Slot } from './storage.ts';

export type DailyState = 'new' | 'started' | 'done';

export interface HomeData {
  level: number;
  /** The level's layout has moves made in it. */
  started: boolean;
  passed: number;
  daily: DailyState;
  /** Today, in words of the language. */
  date: string;
  streak: number;
}

export function homeView(data: HomeData, d: Dict, lang: string, open: (slot: Slot) => void): HTMLElement {
  const level = h(
    'button',
    { class: 'pick', type: 'button' },
    h('span', { class: 'pick__name' }, fmt(d.game.level, { n: data.level })),
    h('span', { class: 'pick__state' }, data.started ? d.home.continue : d.home.start),
    h('span', { class: 'pick__info' }, data.passed > 0 ? plural(lang, data.passed, d.home.passed, { n: data.passed }) : d.home.first),
  );
  level.addEventListener('click', () => open('level'));

  const state = { new: d.home.start, started: d.home.continue, done: d.home.done }[data.daily];
  const daily = h(
    'button',
    { class: `pick is-${data.daily}`, type: 'button' },
    h('span', { class: 'pick__name' }, d.game.daily),
    h('span', { class: 'pick__state' }, data.daily === 'done' ? checkSign() : null, state),
    h('span', { class: 'pick__info' }, d.home.dailyNote),
  );
  daily.addEventListener('click', () => open('daily'));

  return h(
    'div',
    { class: 'home' },
    h('section', { class: 'home__part' }, h('h2', {}, d.home.play), level),
    h(
      'section',
      { class: 'home__part' },
      h('h2', {}, fmt(d.home.dailyTitle, { date: data.date })),
      daily,
      data.streak > 0 ? h('p', { class: 'home__streak' }, plural(lang, data.streak, d.home.streak, { n: data.streak })) : null,
    ),
  );
}
