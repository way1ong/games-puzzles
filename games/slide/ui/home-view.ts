// The start screen (docs/slide/SPEC.md, "Екрани"): a part for each mode, as in Solitaire. The fifteen — Easy 3x3,
// Medium 4x4, Hard 5x5 and the fifteen of the day; "Clear the way" and "The chest" — levels in a row (the level
// reached), free play by difficulty (its range of moves) and the puzzle of the day; each day with its streak.
import { h } from '../../../shared/ui/dom.ts';
import { DIFFICULTIES, SLIDE, type Difficulty } from '../config.ts';
import { fmt, plural, type Dict } from './i18n.ts';
import { checkSign } from './icons.ts';
import type { PoolMode, Slot } from './storage.ts';

export type DayState = 'new' | 'started' | 'done';

/** A mode with a set of puzzles: the level reached, which games are begun, the day and its streak. */
export interface WaysData {
  reached: number;
  levelBegun: boolean;
  begun: Record<Difficulty, boolean>;
  day: DayState;
  streak: number;
}

export interface HomeData {
  fifteen: { begun: Record<Difficulty, boolean>; day: DayState; streak: number };
  unblock: WaysData;
  box: WaysData;
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
  const range = (mode: PoolMode, diff: Difficulty) => {
    const [least, most] = SLIDE[mode].difficulties[diff];
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

  /** A mode with a set of puzzles: levels in a row, free play, the day. */
  const ways = (mode: PoolMode, u: WaysData, names: { title: string; note: string; daily: string }) => {
    const levels = resume(u.levelBegun);
    return h(
      'section',
      { class: 'home__part' },
      h('h2', {}, names.title),
      h('p', { class: 'home__note' }, names.note),
      pick(fmt(d.home.level, { n: u.reached }), levels.state, `${d.home.levels} · ${d.home.levelsNote}`, mode === 'box' ? 'box-levels' : 'levels', levels.kind),
      h('h3', {}, d.home.free),
      ...DIFFICULTIES.map((diff) => {
        const r = resume(u.begun[diff]);
        return pick(d.difficulty[diff], r.state, range(mode, diff), `${mode}-${diff}`, r.kind);
      }),
      day(names.daily, u.day, `${range(mode, SLIDE[mode].daily)} · ${dayInfo}`, `${mode}-day`),
      streak(u.streak),
    );
  };
  const unblock = ways('unblock', data.unblock, { title: d.mode.unblock, note: d.home.unblockNote, daily: d.home.dailyUnblock });
  const box = ways('box', data.box, { title: d.mode.box, note: d.home.boxNote, daily: d.home.dailyBox });
  return h('div', { class: 'home' }, fifteen, unblock, box);
}
