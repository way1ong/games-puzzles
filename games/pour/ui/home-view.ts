// The start screen (docs/pour/SPEC.md, "Екрани"; decision of 27.11: the player chooses the way): levels in a row (the
// level reached), free play by difficulty and of the player's own size (its last size; "Choose" opens the choice of
// it), the level of the day and the streak of days.
import { h } from '../../../shared/ui/dom.ts';
import { DIFFICULTIES, KINDS, POUR, type Kind } from '../config.ts';
import type { CustomSize } from '../core/custom.ts';
import { stageOf } from '../core/level.ts';
import { fmt, plural, type Dict } from './i18n.ts';
import { checkSign } from './icons.ts';

export type DayState = 'new' | 'started' | 'done';

export interface HomeData {
  /** The level to play next, and whether it is begun. */
  reached: number;
  levelBegun: boolean;
  /** For each difficulty and the player's own size: a free game begun. */
  begun: Record<Kind, boolean>;
  /** The player's own size: of the game begun, else the one chosen last. */
  custom: CustomSize;
  daily: DayState;
  /** Today, in words of the language. */
  date: string;
  streak: number;
}

/** The screens of a game: levels in a row, a kind of free play, the day. */
export const ROUTES = ['level', ...KINDS, 'daily'] as const;
export type Route = (typeof ROUTES)[number];
/** The choice of the player's own size. */
export const CUSTOM_SIZE_ROUTE = 'custom-size';

/** "8 colours · 2 empty bottles": the size of the player's own deal. */
export function sizeText(size: CustomSize, d: Dict, lang: string): string {
  return `${plural(lang, size.colours, d.home.colours, { n: size.colours })} · ${plural(lang, size.empty, d.home.empty, { n: size.empty })}`;
}

export function homeView(data: HomeData, d: Dict, lang: string, open: (route: string) => void): HTMLElement {
  const colours = (n: number) => plural(lang, n, d.home.colours, { n });
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
    // the player's own size: a game begun goes on; else its size is chosen first
    data.begun.custom
      ? pick(d.difficulty.custom, [d.home.continue], sizeText(data.custom, d, lang), 'custom', 'pick--resume')
      : pick(d.difficulty.custom, [d.home.choose], sizeText(data.custom, d, lang), CUSTOM_SIZE_ROUTE),
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
