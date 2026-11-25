// The start screen: the two modes — the Wheel and the Word Field (decision of 25.11) — each with the next level
// of the chosen language, today's daily puzzle and the streak of days.
import { h } from '../../../shared/ui/dom.ts';
import { fmt, plural, type Dict } from './i18n.ts';
import { checkSign } from './icons.ts';

export interface ModeData {
  /** Which mode (the buttons carry it, for the screen's tests too). */
  mode: 'wheel' | 'field';
  title: string;
  note: string;
  /** The next level to play. */
  level: number;
  /** Levels done in this language. */
  levelsDone: number;
  daily: 'new' | 'started' | 'solved';
  streak: number;
  /** The daily puzzle's button, in words of the language. */
  dailyLabel: string;
  play(): void;
  openDaily(): void;
}

export function homeView(modes: readonly ModeData[], d: Dict, lang: string): HTMLElement {
  const part = (m: ModeData) => {
    const play = h(
      'button',
      { class: 'home__main', type: 'button', 'data-mode': m.mode },
      h('span', { class: 'home__main-label' }, m.levelsDone ? d.home.continue : d.home.play),
      h('span', { class: 'home__main-level' }, fmt(d.home.level, { n: m.level })),
    );
    play.addEventListener('click', m.play);
    const daily = h(
      'button',
      { class: `home__daily is-${m.daily}`, type: 'button', 'data-mode': m.mode },
      h('span', {}, m.dailyLabel),
      m.daily === 'solved' ? checkSign() : null,
      m.daily === 'new' ? null : h('span', { class: 'visually-hidden' }, ` ${m.daily === 'solved' ? d.home.solved : d.home.started}`),
    );
    daily.addEventListener('click', m.openDaily);
    return h(
      'section',
      { class: 'home__part', 'aria-labelledby': `home-${m.mode}` },
      h('h2', { id: `home-${m.mode}` }, m.title),
      h('p', { class: 'home__note' }, m.note),
      play,
      m.levelsDone ? h('p', { class: 'home__note' }, plural(lang, m.levelsDone, d.home.levelsDone, { n: m.levelsDone })) : null,
      daily,
      h('p', { class: 'home__note' }, d.home.dailyNote),
      m.streak > 0 ? h('p', { class: 'home__note' }, plural(lang, m.streak, d.home.streak, { n: m.streak })) : null,
    );
  };
  return h('div', { class: 'home' }, ...modes.map(part));
}
