// The start screen: the three games, each with a deal to play (a new one, or the unfinished one to continue) and today's
// deal of the day (new, started or done) with its streak of days — Klondike with the way the stock turns, Spider with
// its number of suits, FreeCell with its number of free cells (docs/solitaire/SPEC.md, "Екрани й керування", "Павук",
// "Вільні клітинки").
import { h } from '../../../shared/ui/dom.ts';
import { fmt, plural, type Dict } from './i18n.ts';
import { checkSign } from './icons.ts';
import type { Route } from './storage.ts';

export type DailyState = 'new' | 'started' | 'done';

export interface GameHome {
  /** An unfinished ordinary deal waits. */
  started: boolean;
  /** How the deals are: "One card a turn", "1 suit". */
  kind: string;
  daily: DailyState;
  streak: number;
}

export interface HomeData {
  klondike: GameHome;
  spider: GameHome;
  freecell: GameHome;
  /** Today, in words of the language. */
  date: string;
}

export function homeView(data: HomeData, d: Dict, lang: string, open: (route: Route) => void): HTMLElement {
  const part = (title: string, game: GameHome, play: Route, daily: Route) => {
    const deal = h(
      'button',
      { class: 'pick', type: 'button' },
      h('span', { class: 'pick__name' }, d.home.play),
      h('span', { class: 'pick__state' }, game.started ? d.home.continue : d.home.start),
      h('span', { class: 'pick__info' }, game.kind),
    );
    deal.addEventListener('click', () => open(play));
    const state = { new: d.home.begin, started: d.home.continue, done: d.home.done }[game.daily];
    const day = h(
      'button',
      { class: `pick is-${game.daily}`, type: 'button' },
      h('span', { class: 'pick__name' }, d.game.daily),
      h('span', { class: 'pick__state' }, game.daily === 'done' ? checkSign() : null, state),
      h('span', { class: 'pick__info' }, fmt(d.home.dailyOn, { date: data.date })),
    );
    day.addEventListener('click', () => open(daily));
    return h(
      'section',
      { class: 'home__part' },
      h('h2', {}, title),
      deal,
      day,
      game.streak > 0 ? h('p', { class: 'home__streak' }, plural(lang, game.streak, d.home.streak, { n: game.streak })) : null,
    );
  };
  return h(
    'div',
    { class: 'home' },
    part(d.home.game, data.klondike, 'play', 'daily'),
    part(d.spider.title, data.spider, 'spider', 'spider-daily'),
    part(d.freecell.title, data.freecell, 'freecell', 'freecell-daily'),
  );
}
