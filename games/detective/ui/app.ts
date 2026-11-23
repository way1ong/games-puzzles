// The game screen: which case is open and how far the player is in it; draws the screen of the current
// stage and turns touches and presses into moves. The rules themselves are in ../core (pure functions).
import { localDateKey, streak } from '../../../shared/core/dates.ts';
import { h } from '../../../shared/ui/dom.ts';
import { DETECTIVE } from '../config.ts';
import { STORIES, STORY_IDS, type CaseDef, type StoryId, type Time } from '../core/cases.ts';
import { dailyCase, searchCase } from '../core/daily.ts';
import { accuse, allFound, begin, hint, newProgress, regionOf, toSuspects, toggleRuledOut, touch, tries, type Progress } from '../core/game.ts';
import { ROOM_IDS, type RoomId } from '../core/rooms.ts';
import { sizeOf } from '../core/things.ts';
import { isClue } from '../core/traits.ts';
import { homeView, roomLine, statusOf, storyTitle, type HomeEntry } from './home-view.ts';
import { dict, fmt, pickLang, plural, type Dict } from './i18n.ts';
import { backSign } from './icons.ts';
import { introView } from './intro-view.ts';
import { thingList } from './list-view.ts';
import { createMenuDialog } from './menu-dialog.ts';
import { createPersonDialog } from './person-dialog.ts';
import { hintsLine, resultView, triesLine, type ResultExtras } from './result-view.ts';
import { createRoomView, type RoomTouch, type RoomView } from './room-view.ts';
import { closeRoute, currentRoute, openRoute, watchRoute } from './route.ts';
import * as store from './storage.ts';
import { suspectsView, whereFound } from './suspects-view.ts';

const TIMES: readonly Time[] = ['day', 'night'];
const DAILY = 'daily';
const searchRoute = (room: RoomId, time: Time) => `search-${room}-${time}`;

function randomSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] ?? Date.now() >>> 0;
}

export function startApp(root: HTMLElement): void {
  let settings = store.loadSettings();
  let lang = pickLang(settings.lang, navigator.languages ?? [navigator.language]);
  let d: Dict = dict(lang);
  let today = localDateKey(new Date());
  /** The case on the screen and how far the player is in it; null — the list of cases. */
  let def: CaseDef | null = null;
  let progress: Progress | null = null;
  let room: RoomView | null = null;
  /** The suspect whose card is open, to return the focus to. */
  let lastPerson = 0;

  // ---------- elements that live through redraws ----------
  const title = h('h1', { class: 'top__name', tabindex: -1 });
  const backBtn = h('button', { class: 'icon-btn', type: 'button' }, backSign());
  const menuBtn = h('button', { class: 'icon-btn', type: 'button' }, h('span', { class: 'icon-menu', 'aria-hidden': 'true' }));
  const content = h('div', { class: 'content' });
  /** What has just happened, in words: read aloud and shown. */
  const status = h('p', { class: 'status', role: 'status' });
  const personDialog = createPersonDialog();
  const menuDialog = createMenuDialog();
  const main = h('main', { class: 'app' }, h('header', { class: 'top' }, backBtn, title, menuBtn), content, personDialog.el, menuDialog.el);

  backBtn.addEventListener('click', closeRoute);
  menuBtn.addEventListener('click', openMenu);
  personDialog.el.addEventListener('close', () => {
    content.querySelectorAll<HTMLButtonElement>('.person')[lastPerson]?.focus();
  });

  const say = (text: string) => {
    status.textContent = text;
  };

  const dateText = (dateKey: string) => new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'long' }).format(new Date(`${dateKey}T12:00:00`));

  // ---------- which case ----------
  function caseOf(route: string): { def: CaseDef; seed: number | null } | null {
    if ((STORY_IDS as readonly string[]).includes(route)) return { def: STORIES[route as StoryId], seed: null };
    if (route === DAILY) return { def: dailyCase(today), seed: null };
    for (const roomId of ROOM_IDS) {
      for (const time of TIMES) {
        if (route !== searchRoute(roomId, time)) continue;
        const seed = store.loadSearchSeed(`search:${roomId}:${time}`) ?? randomSeed();
        return { def: searchCase(roomId, time, seed), seed };
      }
    }
    return null;
  }

  function load(): void {
    const opened = caseOf(currentRoute());
    def = opened?.def ?? null;
    progress = opened ? (store.loadProgress(opened.def) ?? newProgress(opened.def, opened.seed)) : null;
  }

  const save = () => {
    if (progress) store.saveProgress(progress);
  };

  // ---------- drawing ----------
  function build(): void {
    document.documentElement.lang = lang;
    document.title = d.meta.title;
    document.querySelector('meta[name="description"]')?.setAttribute('content', d.meta.description);
    document.documentElement.classList.toggle('big', settings.big);
    backBtn.setAttribute('aria-label', d.app.back);
    menuBtn.setAttribute('aria-label', d.app.menu);
    if (!main.isConnected) root.replaceChildren(main);
    updateThemeColor();
    show(false);
  }

  /** Draws the screen of the current case and stage. `moved` — the player has just changed the screen. */
  function show(moved = true): void {
    room?.destroy();
    room = null;
    say('');
    backBtn.hidden = !def;
    title.textContent = def ? storyTitle(d, def) : d.app.name;
    if (!def || !progress) {
      main.className = 'app app--home';
      content.replaceChildren(home());
    } else if (progress.stage === 'intro') {
      main.className = 'app app--page';
      content.replaceChildren(introView(d, lang, def, start));
    } else if (progress.stage === 'search') {
      main.className = 'app app--search';
      content.replaceChildren(search(def, progress));
    } else if (progress.stage === 'suspects') {
      main.className = 'app app--page';
      content.replaceChildren(suspectsView(d, def, progress, openPerson), status);
    } else {
      main.className = 'app app--page';
      content.replaceChildren(resultView(d, def, progress, resultExtras(def, progress)));
    }
    if (moved) {
      window.scrollTo(0, 0);
      title.focus();
    }
  }

  function updateThemeColor(): void {
    const bg = getComputedStyle(document.body).backgroundColor;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg);
  }

  // ---------- the list of cases ----------
  function home(): HTMLElement {
    const stageOf = (c: CaseDef) => store.loadProgress(c)?.stage ?? null;
    const daily = dailyCase(today);
    const days = Object.keys(store.loadDays());
    const inRow = streak(days, today);
    const stories: HomeEntry[] = STORY_IDS.map((id) => {
      const c = STORIES[id];
      return { route: id, title: storyTitle(d, c), line: roomLine(d, c.room, c.time), time: c.time, status: statusOf(stageOf(c)) };
    });
    const searches: HomeEntry[] = ROOM_IDS.flatMap((roomId) =>
      TIMES.map((time): HomeEntry => {
        const seed = store.loadSearchSeed(`search:${roomId}:${time}`);
        const stage = seed === null ? null : stageOf(searchCase(roomId, time, seed));
        return { route: searchRoute(roomId, time), title: d.rooms[roomId], line: d.home[time], time, status: stage === 'search' ? 'started' : null };
      }),
    );
    return homeView(
      d,
      {
        daily: {
          route: DAILY,
          title: storyTitle(d, daily),
          line: `${dateText(today)} · ${roomLine(d, daily.room, daily.time)}`,
          time: daily.time,
          status: statusOf(stageOf(daily)),
          note: d.home.dailyNote,
          streak: inRow > 0 ? plural(lang, inRow, d.home.streak, { n: inRow }) : null,
        },
        stories,
        search: searches,
      },
      openRoute,
    );
  }

  // ---------- the story ----------
  function start(): void {
    if (!progress) return;
    progress = begin(progress);
    save();
    show();
  }

  // ---------- the room ----------
  let panel: HTMLElement = h('div', { class: 'panel' });

  function search(c: CaseDef, p: Progress): HTMLElement {
    room = createRoomView(c, p.found, { room: d.search.room, keys: d.search.keys, zoomIn: d.search.zoomIn, zoomOut: d.search.zoomOut }, settings.big, onTouch);
    panel = h('div', { class: 'panel' });
    drawPanel();
    // until something happens, the line says what to do
    if (!allFound(c, p)) say(d.search.tip);
    return h('section', { class: 'search' }, room.el, panel);
  }

  function drawPanel(): void {
    if (!def || !progress) return;
    const done = allFound(def, progress);
    const hintBtn = h('button', { class: 'btn btn--ghost', type: 'button' }, d.search.hint);
    hintBtn.addEventListener('click', giveHint);
    room?.setCount(fmt(d.search.progress, { found: progress.found.length, total: def.things.length }));
    let end: HTMLElement | null = null;
    if (done) {
      const next = h('button', { class: 'btn btn--primary', type: 'button' }, d.search.toSuspects);
      next.addEventListener('click', () => {
        if (!def || !progress) return;
        progress = toSuspects(def, progress);
        save();
        show();
      });
      end = h('div', { class: 'panel__end' }, h('p', {}, d.search.done), next);
    }
    panel.replaceChildren(
      h('div', { class: 'panel__head' }, h('h2', { class: 'panel__title' }, d.search.list), done ? null : hintBtn),
      status,
      thingList(d, def, progress),
      ...(end ? [end] : []),
    );
  }

  function onTouch(t: RoomTouch): void {
    if (!def || !progress || !room) return;
    const result = touch(def, progress, t.x, t.y, t.tolerance);
    if (!result.found) {
      room.miss(t.x, t.y);
      if (t.byKey) say(d.announce.nothing);
      return;
    }
    progress = result.progress;
    save();
    const { thing } = result.found;
    room.remove(thing);
    const name = d.things[thing];
    const left = def.things.length - progress.found.length;
    const what = isClue(thing) ? fmt(d.announce.clue, { thing: name, where: whereFound(d, def, thing) }) : fmt(d.announce.found, { thing: name });
    if (progress.stage === 'solved') {
      // free search: the last thing ends it
      show();
      return;
    }
    drawPanel();
    say(left > 0 ? `${what} ${plural(lang, left, d.announce.left, { n: left })}` : what);
  }

  function giveHint(): void {
    if (!def || !progress || !room) return;
    const result = hint(def, progress);
    if (!result.thing) return;
    progress = result.progress;
    save();
    room.hint(result.thing);
    const { x, y, thing } = result.thing;
    say(fmt(d.announce.hint, { thing: d.things[thing], region: d.regions[regionOf(x, y - sizeOf(thing).h / 2)] }));
  }

  // ---------- who did it ----------
  function openPerson(i: number, note = ''): void {
    if (!def || !progress) return;
    const suspect = def.suspects[i];
    if (!suspect) return;
    lastPerson = i;
    personDialog.open(
      d,
      { suspect, aside: progress.ruledOut.includes(i), wrong: progress.wrong.includes(i), note },
      {
        toggleAside() {
          if (!def || !progress) return;
          progress = toggleRuledOut(progress, i);
          save();
          show(false);
          personDialog.el.close();
        },
        accuse() {
          if (!def || !progress) return;
          const verdict = accuse(def, progress, i);
          progress = verdict.progress;
          save();
          if (verdict.correct) {
            if (def.kind === 'daily') store.saveDay(today, { tries: tries(progress), hints: progress.hints });
            personDialog.el.close();
            show();
            return;
          }
          show(false);
          const name = d.people[suspect.person].name;
          openPerson(i, verdict.mismatch ? fmt(d.suspects.wrong, { name, clue: d.things[verdict.mismatch] }) : '');
        },
      },
    );
  }

  // ---------- the end ----------
  function resultExtras(c: CaseDef, p: Progress): ResultExtras {
    const back = { label: d.app.back, action: closeRoute };
    if (c.kind === 'search') {
      return {
        streak: null,
        share: null,
        secondary: {
          label: d.result.again,
          action() {
            const seed = randomSeed();
            def = searchCase(c.room, c.time, seed);
            progress = newProgress(def, seed);
            save();
            show();
          },
        },
        primary: back,
      };
    }
    if (c.kind === 'daily') {
      const inRow = streak(Object.keys(store.loadDays()), today);
      const link = DETECTIVE.links.game;
      const text = fmt(d.result.shareText, { name: DETECTIVE.name, date: dateText(today), tries: triesLine(d, p), hints: hintsLine(d, p) });
      return {
        streak: inRow > 0 ? plural(lang, inRow, d.home.streak, { n: inRow }) : null,
        share: { label: d.result.copy, done: d.result.copied, text: link ? `${text} ${link}` : text },
        secondary: null,
        primary: back,
      };
    }
    return {
      streak: null,
      share: null,
      secondary: {
        label: d.result.replay,
        action() {
          store.clearProgress(c.id);
          progress = newProgress(c);
          show();
        },
      },
      primary: back,
    };
  }

  // ---------- menu ----------
  function openMenu(): void {
    menuDialog.open(d, lang, settings, {
      setLang(code) {
        lang = code;
        d = dict(lang);
        settings = { ...settings, lang: code };
        store.saveSettings(settings);
        menuDialog.el.close();
        build();
        openMenu();
      },
      setBig(on) {
        settings = { ...settings, big: on };
        store.saveSettings(settings);
        document.documentElement.classList.toggle('big', on);
        room?.setBig(on);
      },
      clearProgress() {
        store.clearAll();
        load();
        show(false);
      },
    });
  }

  watchRoute(() => {
    if (personDialog.el.open) personDialog.el.close();
    load();
    show();
  });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', updateThemeColor);
  // A new day while the game stays open: the case of the day follows the date.
  document.addEventListener('visibilitychange', () => {
    const now = localDateKey(new Date());
    if (document.visibilityState !== 'visible' || now === today) return;
    today = now;
    store.dropOldDaily(today);
    if (!def || def.kind === 'daily') {
      load();
      show(false);
    }
  });

  store.dropOldDaily(today);
  load();
  build();
}
