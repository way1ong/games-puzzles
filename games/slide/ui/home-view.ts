// The start screen (docs/slide/SPEC.md, "Екрани"): two parts, as in Solitaire. The fifteen — Easy 3x3, Medium 4x4,
// Hard 5x5 and the fifteen of the day; "Clear the way" — levels in a row (the level reached), free play by difficulty
// (its range of moves) and the level of the day; each day with its streak.
import { h } from '../../../shared/ui/dom.ts';
import { DIFFICULTIES, SLIDE, type Difficulty } from '../config.ts';
import { fmt, plural, type Dict } from './i18n.ts';
import { checkSign } from './icons.ts';
import type { Slot } from './storage.ts';

export type DayState = 'new' | 'started' | 'done';

export interface HomeData {
  fifteen: { begun: Record<Difficulty, boolean>; day: DayState; streak: number };
  unblock: { reached: number; levelBegun: boolean; begun: Record<Difficulty, boolean>; day: DayState; streak: number };
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
  const resume = (begun: boolean) => ({ state: [begun ? d.home.continue : d.home.play], kind: begun ? 'pick--resume' : '' });
  const states = { new: d.home.begin, started: d.home.started, done: d.home.done };
  const day = (name: string, state: DayState, info: string, slot: Slot) => pick(name, state === 'done' ? [checkSign(), states.done] : [states[state]], info, slot, `is-${state}`);
  const streak = (n: number) => (n > 0 ? h('p', { class: 'home__streak' }, plural(lang, n, d.home.streak, { n })) : null);
  const size = (n: number) => fmt(d.home.size, { n });
  const range = (diff: Difficulty) => {
    const [least, most] = SLIDE.unblock.difficulties[diff];
    return most === null ? plural(lang, least, d.home.rangeFrom, { n: least }) : plural(lang, most, d.home.range, { from: least, to: most });
  };
  const dayInfo = fmt(d.home.dailyOn, { date: data.date });

  const f = data.fifteen;
  const fifteen = h(
    'section',
    { class: 'home__part' },
    h('h2', {}, d.mode.fifteen),
    h('p', { class: 'home__note' }, d.home.fifteenNote),
    ...DIFFICULTIES.map((diff) => {
      const r = resume(f.begun[diff]);
      return pick(d.difficulty[diff], r.state, size(SLIDE.fifteen.sizes[diff]), `fifteen-${diff}`, r.kind);
    }),
    day(d.home.dailyFifteen, f.day, `${size(SLIDE.fifteen.dailySize)} · ${dayInfo}`, 'fifteen-day'),
    streak(f.streak),
  );

  const u = data.unblock;
  const levels = resume(u.levelBegun);
  const unblock = h(
    'section',
    { class: 'home__part' },
    h('h2', {}, d.mode.unblock),
    h('p', { class: 'home__note' }, d.home.unblockNote),
    pick(fmt(d.home.level, { n: u.reached }), levels.state, `${d.home.levels} · ${d.home.levelsNote}`, 'levels', levels.kind),
    h('h3', {}, d.home.free),
    ...DIFFICULTIES.map((diff) => {
      const r = resume(u.begun[diff]);
      return pick(d.difficulty[diff], r.state, range(diff), `unblock-${diff}`, r.kind);
    }),
    day(d.home.dailyUnblock, u.day, `${range(SLIDE.unblock.daily)} · ${dayInfo}`, 'unblock-day'),
    streak(u.streak),
  );
  return h('div', { class: 'home' }, fifteen, unblock);
}
