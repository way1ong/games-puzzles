// The start screen: Klondike (a new deal, or the unfinished one to continue) with the way the stock turns; today's
// deal of the day (new, started or done) and the streak of days (docs/solitaire/SPEC.md, "Екрани й керування").
import { h } from '../../../shared/ui/dom.ts';
import { fmt, plural, type Dict } from './i18n.ts';
import { checkSign } from './icons.ts';

export type DailyState = 'new' | 'started' | 'done';

export interface HomeData {
  /** An unfinished ordinary deal waits. */
  started: boolean;
  /** One card a turn (else three). */
  drawOne: boolean;
  daily: DailyState;
  /** Today, in words of the language. */
  date: string;
  streak: number;
}

export function homeView(data: HomeData, d: Dict, lang: string, open: (daily: boolean) => void): HTMLElement {
  const play = h(
    'button',
    { class: 'pick', type: 'button' },
    h('span', { class: 'pick__name' }, d.home.game),
    h('span', { class: 'pick__state' }, data.started ? d.home.continue : d.home.start),
    h('span', { class: 'pick__info' }, data.drawOne ? d.home.drawOne : d.home.drawThree),
  );
  play.addEventListener('click', () => open(false));

  const state = { new: d.home.begin, started: d.home.continue, done: d.home.done }[data.daily];
  const daily = h(
    'button',
    { class: `pick is-${data.daily}`, type: 'button' },
    h('span', { class: 'pick__name' }, d.game.daily),
    h('span', { class: 'pick__state' }, data.daily === 'done' ? checkSign() : null, state),
    h('span', { class: 'pick__info' }, d.home.dailyNote),
  );
  daily.addEventListener('click', () => open(true));

  return h(
    'div',
    { class: 'home' },
    h('section', { class: 'home__part' }, h('h2', {}, d.home.play), play),
    h(
      'section',
      { class: 'home__part' },
      h('h2', {}, fmt(d.home.dailyTitle, { date: data.date })),
      daily,
      data.streak > 0 ? h('p', { class: 'home__streak' }, plural(lang, data.streak, d.home.streak, { n: data.streak })) : null,
    ),
  );
}
