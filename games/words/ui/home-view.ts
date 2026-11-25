// The start screen: the next level of the chosen language, today's daily puzzle and the streak of days.
import { h } from '../../../shared/ui/dom.ts';
import { fmt, plural, type Dict } from './i18n.ts';
import { checkSign } from './icons.ts';

export interface HomeData {
  /** The next level to play. */
  level: number;
  /** Levels done in this language. */
  levelsDone: number;
  daily: 'new' | 'started' | 'solved';
  /** Today, in words of the language. */
  date: string;
  streak: number;
}

export interface HomeActions {
  level(): void;
  daily(): void;
}

export function homeView(data: HomeData, d: Dict, lang: string, actions: HomeActions): HTMLElement {
  const play = h(
    'button',
    { class: 'home__main', type: 'button' },
    h('span', { class: 'home__main-label' }, data.levelsDone ? d.home.continue : d.home.play),
    h('span', { class: 'home__main-level' }, fmt(d.home.level, { n: data.level })),
  );
  play.addEventListener('click', actions.level);

  const daily = h(
    'button',
    { class: `home__daily is-${data.daily}`, type: 'button' },
    h('span', {}, fmt(d.game.dailyTitle, { date: data.date })),
    data.daily === 'solved' ? checkSign() : null,
    data.daily === 'new' ? null : h('span', { class: 'visually-hidden' }, ` ${data.daily === 'solved' ? d.home.solved : d.home.started}`),
  );
  daily.addEventListener('click', actions.daily);

  return h(
    'div',
    { class: 'home' },
    h(
      'section',
      { class: 'home__part' },
      play,
      data.levelsDone ? h('p', { class: 'home__note' }, plural(lang, data.levelsDone, d.home.levelsDone, { n: data.levelsDone })) : null,
    ),
    h(
      'section',
      { class: 'home__part' },
      h('h2', {}, d.home.daily),
      h('p', { class: 'home__note' }, d.home.dailyNote),
      daily,
      data.streak > 0 ? h('p', { class: 'home__note' }, plural(lang, data.streak, d.home.streak, { n: data.streak })) : null,
    ),
  );
}
