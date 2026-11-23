// The first screen: the case of the day, the story cases, free search.
import { h } from '../../../shared/ui/dom.ts';
import type { CaseDef, StoryId, Time } from '../core/cases.ts';
import type { Stage } from '../core/game.ts';
import type { RoomId } from '../core/rooms.ts';
import type { Dict } from './i18n.ts';
import { moonSign, sunSign } from './icons.ts';

export type Status = 'new' | 'started' | 'solved';

export function statusOf(stage: Stage | null): Status {
  return stage === null || stage === 'intro' ? 'new' : stage === 'solved' ? 'solved' : 'started';
}

export interface HomeEntry {
  route: string;
  title: string;
  /** A second line: the room and the time of day, a date. */
  line: string;
  time: Time;
  status: Status | null;
}

export interface HomeContent {
  daily: HomeEntry & { note: string; streak: string | null };
  stories: HomeEntry[];
  search: HomeEntry[];
}

export function storyTitle(d: Dict, def: CaseDef): string {
  return def.story ? d.stories[def.story as StoryId].title : d.home.search;
}

export function roomLine(d: Dict, room: RoomId, time: Time): string {
  return `${d.rooms[room]} · ${d.home[time]}`;
}

function card(d: Dict, entry: HomeEntry, open: (route: string) => void, extra: (Node | null)[] = []): HTMLButtonElement {
  const badge = entry.status ? h('span', { class: `badge badge--${entry.status}` }, d.home[entry.status]) : null;
  const button = h(
    'button',
    { class: `case-card case-card--${entry.time}`, type: 'button' },
    h('span', { class: 'case-card__time' }, entry.time === 'day' ? sunSign() : moonSign()),
    h('span', { class: 'case-card__text' }, h('span', { class: 'case-card__title' }, entry.title), h('span', { class: 'case-card__line' }, entry.line), ...extra),
    badge,
  );
  button.addEventListener('click', () => open(entry.route));
  return button;
}

export function homeView(d: Dict, content: HomeContent, open: (route: string) => void): HTMLElement {
  const { daily } = content;
  const list = (entries: HomeEntry[]) => {
    const ul = h('ul', { class: 'cases' });
    for (const entry of entries) ul.append(h('li', { class: 'case-slot' }, card(d, entry, open)));
    return ul;
  };
  return h(
    'div',
    { class: 'home' },
    h(
      'section',
      { class: 'home__part', 'aria-labelledby': 'home-daily' },
      h('h2', { id: 'home-daily' }, d.home.daily),
      h('div', { class: 'case-slot' }, card(d, daily, open, [h('span', { class: 'case-card__note' }, daily.note)])),
      daily.streak ? h('p', { class: 'home__streak' }, daily.streak) : null,
    ),
    h('section', { class: 'home__part', 'aria-labelledby': 'home-cases' }, h('h2', { id: 'home-cases' }, d.home.cases), list(content.stories)),
    h(
      'section',
      { class: 'home__part', 'aria-labelledby': 'home-search' },
      h('h2', { id: 'home-search' }, d.home.search),
      h('p', { class: 'home__note' }, d.home.searchNote),
      list(content.search),
    ),
  );
}
