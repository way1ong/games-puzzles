// The start screen: the four levels (each says what it asks and whether a game waits), today's daily puzzle
// for each level, and the streak of days.
import { h } from '../../../shared/ui/dom.ts';
import { LEVELS, type Level } from '../config.ts';
import { fmt, plural, type Dict } from './i18n.ts';
import { checkSign } from './icons.ts';
import type { Slot } from './storage.ts';

export type DailyState = 'new' | 'started' | 'solved';

export interface HomeData {
  /** Levels with an unfinished ordinary game. */
  started: ReadonlySet<Level>;
  daily: Readonly<Record<Level, DailyState>>;
  /** Today, in words of the language. */
  date: string;
  streak: number;
}

export function homeView(data: HomeData, d: Dict, lang: string, open: (slot: Slot) => void): HTMLElement {
  const levels = h(
    'ul',
    { class: 'levels' },
    ...LEVELS.map((level) => {
      const button = h(
        'button',
        { class: 'level', type: 'button' },
        h('span', { class: 'level__name' }, d.levels[level]),
        h('span', { class: 'level__info' }, d.levelInfo[level]),
        h('span', { class: 'level__state' }, data.started.has(level) ? d.home.continue : d.home.newPuzzle),
      );
      button.addEventListener('click', () => open({ daily: false, level }));
      return h('li', {}, button);
    }),
  );

  const daily = h(
    'div',
    { class: 'daily', role: 'group', 'aria-label': d.home.daily },
    ...LEVELS.map((level) => {
      const state = data.daily[level];
      const button = h(
        'button',
        { class: `daily__btn is-${state}`, type: 'button' },
        h('span', {}, d.levels[level]),
        state === 'solved' ? checkSign() : null,
        state === 'new' ? null : h('span', { class: 'visually-hidden' }, ` ${state === 'solved' ? d.home.solved : d.home.started}`),
      );
      button.addEventListener('click', () => open({ daily: true, level }));
      return button;
    }),
  );

  return h(
    'div',
    { class: 'home' },
    h('section', { class: 'home__part' }, h('h2', {}, d.home.play), levels),
    h(
      'section',
      { class: 'home__part' },
      h('h2', {}, fmt(d.game.dailyTitle, { date: data.date })),
      h('p', { class: 'home__note' }, d.home.dailyNote),
      daily,
      data.streak > 0 ? h('p', { class: 'home__streak' }, plural(lang, data.streak, d.home.streak, { n: data.streak })) : null,
    ),
  );
}
