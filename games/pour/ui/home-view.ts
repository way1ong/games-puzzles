// The start screen (docs/pour/SPEC.md, "Екрани"; decision of 27.11: the player chooses the way): levels in a row (the
// level reached), free play by difficulty, the level of the day and the streak of days.
import { h } from '../../../shared/ui/dom.ts';
import { DIFFICULTIES, POUR, type Difficulty } from '../config.ts';
import { stageOf } from '../core/level.ts';
import { fmt, plural, type Dict } from './i18n.ts';
import { checkSign } from './icons.ts';

export type DayState = 'new' | 'started' | 'done';

export interface HomeData {
  /** The level to play next, and whether it is begun. */
  reached: number;
  levelBegun: boolean;
  /** For each difficulty: a free game begun. */
  begun: Record<Difficulty, boolean>;
  daily: DayState;
  /** Today, in words of the language. */
  date: string;
  streak: number;
}

/** The screens' addresses: levels in a row, a difficulty of free play, the day. */
export const ROUTES = ['level', ...DIFFICULTIES, 'daily'] as const;
export type Route = (typeof ROUTES)[number];

export function homeView(data: HomeData, d: Dict, lang: string, open: (route: Route) => void): HTMLElement {
  const colours = (n: number) => plural(lang, n, d.home.colours, { n });
  const pick = (name: string, state: (Node | string)[], info: string, route: Route, kind = '') => {
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
    pick(
      fmt(d.home.level, { n: data.reached }),
      [data.levelBegun ? d.home.continue : d.home.play],
      `${colours(stageOf(data.reached).colours)} · ${d.home.levelsNote}`,
      'level',
      data.levelBegun ? 'pick--resume' : '',
    ),
  );
  const free = h(
    'section',
    { class: 'home__part' },
    h('h2', {}, d.home.free),
    ...DIFFICULTIES.map((diff) =>
      pick(d.difficulty[diff], [data.begun[diff] ? d.home.continue : d.home.new], colours(POUR.difficulties[diff]), diff, data.begun[diff] ? 'pick--resume' : ''),
    ),
  );
  const states = { new: d.home.begin, started: d.home.started, done: d.home.done };
  const day = h(
    'section',
    { class: 'home__part' },
    h('h2', {}, fmt(d.home.dailyTitle, { date: data.date })),
    pick(d.game.daily, data.daily === 'done' ? [checkSign(), states.done] : [states[data.daily]], `${colours(POUR.dailyColours)} · ${d.home.dailyNote}`, 'daily', `is-${data.daily}`),
    data.streak > 0 ? h('p', { class: 'home__streak' }, plural(lang, data.streak, d.home.streak, { n: data.streak })) : null,
  );
  return h('div', { class: 'home' }, levels, free, day);
}
