// The start screen (docs/jigsaw/SPEC.md, "Екрани"): the puzzle of the day (its size, the date, how far it went) with
// its streak, and free play — Easy 24, Medium 54, Hard 96 pieces ("Continue" for one begun).
import { h } from '../../../shared/ui/dom.ts';
import { DIFFICULTIES, JIGSAW, type Difficulty } from '../config.ts';
import { fmt, plural, type Dict } from './i18n.ts';
import { checkSign } from './icons.ts';
import type { Slot } from './storage.ts';

export type DayState = 'new' | 'started' | 'done';

export interface HomeData {
  begun: Record<Difficulty, boolean>;
  day: DayState;
  streak: number;
  /** Today, in words of the language. */
  date: string;
}

export function homeView(data: HomeData, d: Dict, lang: string, open: (slot: Slot) => void): HTMLElement {
  const pick = (name: string, state: (Node | string)[], info: string, slot: Slot, kind = '') => {
    const b = h(
      'button',
      { class: `pick ${kind}`.trim(), type: 'button' },
      h('span', { class: 'pick__name' }, name),
      h('span', { class: 'pick__state' }, ...state),
      h('span', { class: 'pick__info' }, info),
    );
    b.addEventListener('click', () => open(slot));
    return b;
  };
  const pieces = (diff: Difficulty) => {
    const { cols, rows } = JIGSAW.sizes[diff];
    return plural(lang, cols * rows, d.home.pieces, { n: cols * rows });
  };
  const states = { new: d.home.begin, started: d.home.started, done: d.home.done };
  const dayState = data.day === 'done' ? [checkSign(), states.done] : [states[data.day]];

  const day = h(
    'section',
    { class: 'home__part' },
    pick(d.home.daily, dayState, `${pieces(JIGSAW.daily)} · ${fmt(d.home.dailyOn, { date: data.date })}`, 'day', `pick--day is-${data.day}`),
    data.streak > 0 ? h('p', { class: 'home__streak' }, plural(lang, data.streak, d.home.streak, { n: data.streak })) : null,
  );
  const free = h(
    'section',
    { class: 'home__part' },
    h('h2', {}, d.home.free),
    h('p', { class: 'home__note' }, d.home.freeNote),
    ...DIFFICULTIES.map((diff) => {
      const begun = data.begun[diff];
      return pick(d.difficulty[diff], [begun ? d.home.continue : d.home.play], pieces(diff), diff, begun ? 'pick--resume' : '');
    }),
  );
  return h('div', { class: 'home' }, day, free);
}
