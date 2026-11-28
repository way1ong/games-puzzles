// The start screen (docs/nonograms/SPEC.md, "Екрани"): the picture begun last, to continue; the album's three
// chapters with how many of their pictures are solved, and under them the colour section's chapters ("Кольорові
// малюнки"); today's picture of the day (new, begun or solved) and the streak of days.
import { h } from '../../../shared/ui/dom.ts';
import type { Size } from '../config.ts';
import { fmt, plural, type Dict } from './i18n.ts';
import { checkSign } from './icons.ts';
import { sizeText } from './words.ts';

export type DayState = 'new' | 'started' | 'done';

/** A chapter: its size, how many of its pictures are solved, its screen. */
export interface Chapter {
  size: Size;
  solved: number;
  total: number;
  route: string;
}

export interface HomeData {
  /** The picture begun last and not solved: what it is called, a word about it, its screen. */
  resume: { title: string; info: string; route: string } | null;
  chapters: Chapter[];
  /** The chapters of the colour section (a size without pictures in colour has none). */
  colourChapters: Chapter[];
  daily: DayState;
  /** Today, in words of the language. */
  date: string;
  streak: number;
}

export function homeView(data: HomeData, d: Dict, lang: string, open: (route: string) => void): HTMLElement {
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

  const chapter = (c: Chapter) =>
    pick(sizeText(c.size, d), c.solved === c.total ? [checkSign()] : [], fmt(d.home.progress, { n: c.solved, total: c.total }), c.route, c.solved === c.total ? 'is-done' : '');

  const parts: HTMLElement[] = [];
  if (data.resume) {
    parts.push(h('section', { class: 'home__part' }, pick(data.resume.title, [d.home.continue], data.resume.info, data.resume.route, 'pick--resume')));
  }
  parts.push(h('section', { class: 'home__part' }, h('h2', {}, d.home.album), ...data.chapters.map(chapter)));
  if (data.colourChapters.length) parts.push(h('section', { class: 'home__part' }, h('h2', {}, d.home.colour), ...data.colourChapters.map(chapter)));
  const state = { new: d.home.begin, started: d.home.started, done: d.home.done }[data.daily];
  parts.push(
    h(
      'section',
      { class: 'home__part' },
      h('h2', {}, fmt(d.home.dailyTitle, { date: data.date })),
      pick(d.game.daily, data.daily === 'done' ? [checkSign(), state] : [state], d.home.dailyNote, 'daily', `is-${data.daily}`),
      data.streak > 0 ? h('p', { class: 'home__streak' }, plural(lang, data.streak, d.home.streak, { n: data.streak })) : null,
    ),
  );
  return h('div', { class: 'home' }, ...parts);
}
