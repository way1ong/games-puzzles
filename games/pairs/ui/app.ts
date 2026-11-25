// The game screen: which screen is open (the start, the level, the layout of the day), the layout in play, the
// chosen tile, the hint shown; turns taps and keys into moves and draws the result. The rules themselves are in
// ../core (pure functions).
import { localDateKey, streak } from '../../../shared/core/dates.ts';
import type { ShareText } from '../../../shared/ui/copy.ts';
import { h } from '../../../shared/ui/dom.ts';
import { PAIRS, PICTURES } from '../config.ts';
import { makeDaily, makeLevel } from '../core/level.ts';
import { nearest, type Direction } from '../core/nearest.ts';
import { addTime, countHint, hintFor, shuffle, standing, tableFor, take, undo, type Hint, type PairsPlay } from '../core/play.ts';
import { isClean, longestStreak, recordDone } from '../core/stats.ts';
import { freePlaces, isFree } from '../core/table.ts';
import { createBoardView } from './board-view.ts';
import { createEndDialog } from './end-dialog.ts';
import { homeView, type DailyState } from './home-view.ts';
import { dict, fmt, pickLang, plural, type Dict } from './i18n.ts';
import { backSign } from './icons.ts';
import { createMenuDialog } from './menu-dialog.ts';
import { closeRoute, currentRoute, openRoute, watchRoute } from './route.ts';
import * as store from './storage.ts';
import type { Settings, Slot } from './storage.ts';
import { clockText } from './time.ts';
import { createToolsView } from './tools-view.ts';

/** How often the shown time is updated, ms. */
const TICK_MS = 1000;

const isSlot = (route: string): route is Slot => route === 'level' || route === 'daily';

/** A latin letter key whatever the keyboard layout (H for hint, S for shuffle, Z for undo). */
function letterOf(event: KeyboardEvent): string {
  return event.code.startsWith('Key') ? event.code.slice(3).toLowerCase() : '';
}

const ARROWS: Record<string, Direction> = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };

interface NoteAction {
  label: string;
  run: () => void;
}

export function startApp(root: HTMLElement): void {
  let settings: Settings = store.loadSettings();
  let lang = pickLang(settings.lang, navigator.languages ?? [navigator.language]);
  let d: Dict = dict(lang);
  let today = localDateKey(new Date());

  /** The open layout's place; null — the start screen. */
  let slot: Slot | null = null;
  let play: PairsPlay | null = null;
  let selected: number | null = null;
  /** The tile the keys stand on: the table's one stop for the Tab key. */
  let cursor: number | null = null;
  let hint: Hint | null = null;
  /** A short word about the last tap (a blocked tile, nothing to undo), shown until the next move. */
  let message: string | null = null;
  let tipDone = store.loadTipDone();
  /** When the current stretch of play started (performance.now()); null — the clock stands. */
  let clockFrom: number | null = null;

  // ---------- elements ----------
  const title = h('h1', { class: 'top__name', tabindex: -1 });
  const backBtn = h('button', { class: 'icon-btn', type: 'button' }, backSign());
  const menuBtn = h('button', { class: 'icon-btn', type: 'button' }, h('span', { class: 'icon-menu', 'aria-hidden': 'true' }));
  const content = h('div', { class: 'content' });
  const live = h('p', { class: 'visually-hidden', 'aria-live': 'polite' });
  const menuDialog = createMenuDialog();
  const endDialog = createEndDialog();

  const infoText = h('span', { class: 'info__text' });
  const timeEl = h('span', { class: 'info__time', role: 'timer' });
  const info = h('p', { class: 'info' }, infoText, timeEl);
  // Above the table, so that the table (low, by the thumb) stays where it is when a note comes and goes.
  const noteText = h('span', { class: 'note__text' });
  const noteActions = h('span', { class: 'note__actions' });
  const note = h('div', { class: 'note' }, noteText, noteActions);
  const board = createBoardView(onTile);
  const stage = h('div', { class: 'stage' }, board.el);
  const tools = createToolsView({ hint: askHint, undo: takeBack, shuffle: mix });
  const playView = h('div', { class: 'play' }, info, note, stage, tools.el);

  backBtn.addEventListener('click', closeRoute);
  menuBtn.addEventListener('click', openMenu);

  /** A note longer than its place (large letters on the lowest screens) scrolls by itself: then the keys reach it. */
  function noteByKeys(): void {
    if (note.scrollHeight > note.clientHeight + 1) note.tabIndex = 0;
    else note.removeAttribute('tabindex');
  }
  new ResizeObserver(noteByKeys).observe(note);

  root.replaceChildren(
    h('main', { class: 'app' }, h('header', { class: 'top' }, backBtn, title, menuBtn), content, live, menuDialog.el, endDialog.el),
  );

  // ---------- look ----------
  function applyLook(): void {
    const html = document.documentElement;
    html.lang = lang;
    html.classList.toggle('big', settings.big);
    if (settings.theme === 'system') delete html.dataset.theme;
    else html.dataset.theme = settings.theme;
    document.title = d.meta.title;
    document.querySelector('meta[name="description"]')?.setAttribute('content', d.meta.description);
    const bg = getComputedStyle(document.body).backgroundColor;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg);
    backBtn.setAttribute('aria-label', d.app.back);
    menuBtn.setAttribute('aria-label', d.app.menu);
    board.el.setAttribute('aria-label', d.game.board);
  }

  const dateText = (dateKey: string, style: 'long' | 'medium') =>
    new Intl.DateTimeFormat(lang, style === 'long' ? { day: 'numeric', month: 'long' } : { dateStyle: 'medium' }).format(
      new Date(`${dateKey}T12:00:00`),
    );

  const pictureName = (kind: number): string => d.pictures[PICTURES[kind]!];

  function announce(text: string): void {
    live.textContent = text;
  }

  // ---------- screens ----------
  function show(): void {
    const route = currentRoute();
    if (!isSlot(route)) {
      leaveGame();
      store.saveLast(null);
      renderHome();
      return;
    }
    if (slot !== route || !play) openSlot(route);
    else render();
  }

  function leaveGame(): void {
    stopClock();
    slot = null;
    play = null;
    hint = null;
  }

  function openSlot(next: Slot): void {
    leaveGame();
    slot = next;
    store.saveLast(next);
    selected = null;
    cursor = null;
    message = null;
    const level = store.loadLevel();
    const saved = store.loadPlay(next, level, today);
    // A level passed opens the next one; today's layout of the day stays as it ended.
    const fresh = () => (next === 'level' ? makeLevel(level) : makeDaily(today));
    begin(saved && !(next === 'level' && saved.done) ? saved : fresh());
  }

  function begin(p: PairsPlay): void {
    play = p;
    if (slot) store.savePlay(slot, p);
    board.lay(tableFor(p.layout));
    startClock();
    renderGame();
    title.focus();
  }

  // ---------- time ----------
  function startClock(): void {
    if (play && !play.done && document.visibilityState === 'visible' && clockFrom === null) clockFrom = performance.now();
  }

  function stopClock(): void {
    if (clockFrom === null || !play || !slot) return;
    play = addTime(play, performance.now() - clockFrom);
    clockFrom = null;
    store.savePlay(slot, play);
  }

  function playedMs(): number {
    if (!play) return 0;
    return play.ms + (clockFrom === null ? 0 : performance.now() - clockFrom);
  }

  function renderTime(): void {
    timeEl.hidden = !settings.time || !play;
    if (!timeEl.hidden) timeEl.textContent = clockText(playedMs());
  }

  window.setInterval(() => {
    if (slot && settings.time) renderTime();
  }, TICK_MS);

  // ---------- drawing ----------
  function renderHome(): void {
    applyLook();
    backBtn.hidden = true;
    title.textContent = d.app.name;
    const level = store.loadLevel();
    const saved = store.loadPlay('level', level, today);
    const day = store.loadPlay('daily', level, today);
    const days = store.loadDays();
    const daily: DailyState = days[today] || day?.done ? 'done' : day && day.history.length > 0 ? 'started' : 'new';
    content.replaceChildren(
      homeView(
        {
          level,
          started: !!saved && !saved.done && saved.history.length > 0,
          passed: level - 1,
          daily,
          date: dateText(today, 'long'),
          streak: streak(Object.keys(days), today),
        },
        d,
        lang,
        (s) => openRoute(s),
      ),
    );
  }

  function renderGame(): void {
    applyLook();
    backBtn.hidden = false;
    if (!slot || !play) return;
    title.textContent = slot === 'daily' ? d.game.daily : fmt(d.game.level, { n: play.number ?? 0 });
    if (content.firstChild !== playView) content.replaceChildren(playView);
    render();
  }

  /** Tiles left and pairs to take, as the line above the table says it. */
  function standingText(p: PairsPlay): string {
    const { left, pairs } = standing(p);
    const parts = [fmt(d.game.left, { n: left })];
    if (settings.pairs && left > 0) parts.push(pairs ? fmt(d.game.pairs, { n: pairs }) : d.game.noPairs);
    return parts.join(' · ');
  }

  /** The tiles a hint shows. */
  function hintTiles(): number[] {
    if (hint?.kind === 'pair') return [...hint.pair];
    if (hint?.kind === 'unknown' && hint.pair) return [...hint.pair];
    return [];
  }

  /**
   * What the line above the table says now, and what it offers to do there. Shuffling is offered by the tool
   * under the table, which then stands out (`shuffle`): the line keeps only what no tool does (undo N moves).
   */
  function noteNow(p: PairsPlay, pairs: number): { text: string; actions: NoteAction[]; shuffle: boolean } | null {
    if (p.done) {
      const action = slot === 'level' ? { label: d.end.next, run: nextLevel } : { label: d.end.home, run: closeRoute };
      return { text: d.end.title, actions: [action], shuffle: false };
    }
    if (hint?.kind === 'pair') return { text: fmt(d.hint.pair, { picture: pictureName(p.kinds[hint.pair[0]]!) }), actions: [], shuffle: false };
    if (hint?.kind === 'unknown' && hint.pair) {
      return { text: fmt(d.hint.any, { picture: pictureName(p.kinds[hint.pair[0]]!) }), actions: [], shuffle: false };
    }
    if (hint?.kind === 'stuck') {
      const back = hint.back;
      if (back === null) return { text: d.hint.stuckFar, actions: [], shuffle: true };
      const undoMoves = { label: plural(lang, back, d.hint.undoMoves, { n: back }), run: () => takeBackMany(back) };
      return { text: plural(lang, back, d.hint.stuck, { n: back }), actions: [undoMoves], shuffle: true };
    }
    if (message) return { text: message, actions: [], shuffle: pairs === 0 };
    if (pairs === 0) return { text: d.game.stuck, actions: [], shuffle: true };
    if (!tipDone) return { text: d.game.tip, actions: [], shuffle: false };
    return null;
  }

  function tileLabel(p: PairsPlay, i: number, free: boolean, hinted: boolean): string {
    const picture = pictureName(p.kinds[i]!);
    if (!free) return fmt(d.game.tileBlocked, { picture });
    return fmt(hinted ? d.game.tileHint : d.game.tileFree, { picture });
  }

  /** Draws the layout screen from the state. */
  function render(): void {
    if (!slot || !play) return;
    const p = play;
    const table = tableFor(p.layout);
    const free = p.present.map((_, i) => isFree(table, p.present, i));
    const { pairs } = standing(p);
    infoText.textContent = standingText(p);
    renderTime();

    // The keys stand on a free tile: the one chosen, else the one they stood on, else the first one.
    if (cursor === null || !free[cursor]) cursor = selected ?? free.indexOf(true);
    if (cursor === -1) cursor = p.present.indexOf(true);
    const shown = hintTiles();
    board.render(p.kinds, p.present, { free, selected, hint: shown, focus: cursor === -1 ? null : cursor, dim: settings.dim }, (i) =>
      tileLabel(p, i, free[i] === true, shown.includes(i)),
    );

    const now = noteNow(p, pairs);
    note.hidden = !now;
    noteText.textContent = now?.text ?? '';
    noteActions.replaceChildren(
      ...(now?.actions ?? []).map((a) => {
        const b = h('button', { class: 'btn btn--primary', type: 'button' }, a.label);
        b.addEventListener('click', a.run);
        return b;
      }),
    );
    tools.el.hidden = p.done;
    tools.render({ canUndo: p.history.length > 0, suggestShuffle: now?.shuffle ?? false }, d);
    noteByKeys();
  }

  // ---------- moves ----------
  function commit(next: PairsPlay): void {
    if (!play || !slot) return;
    // The move that empties the table stops the clock: its last stretch counts.
    if (next.done && clockFrom !== null) {
      next = { ...next, ms: next.ms + (performance.now() - clockFrom) };
      clockFrom = null;
    }
    play = next;
    hint = null;
    message = null;
    store.savePlay(slot, play);
    if (play.done) {
      finish();
      return;
    }
    render();
  }

  function onTile(i: number): void {
    if (!play || play.done || !play.present[i]) return;
    const p = play;
    const table = tableFor(p.layout);
    const picture = pictureName(p.kinds[i]!);
    cursor = i;
    if (!isFree(table, p.present, i)) {
      // Not chosen: the game says why, in words and by a short shake.
      const covered = table.above[i]!.some((j) => p.present[j]);
      message = fmt(covered ? d.game.covered : d.game.sides, { picture });
      announce(message);
      board.refuse(i);
      render();
      return;
    }
    message = null;
    if (selected === i) {
      selected = null;
      announce(d.game.unchosen);
      render();
      return;
    }
    if (selected === null) {
      selected = i;
      announce(fmt(d.game.chosen, { picture }));
      render();
      return;
    }
    const { play: next, verdict } = take(p, selected, i);
    if (verdict !== 'taken') {
      // Another picture: the choice moves to the tile tapped.
      selected = i;
      announce(fmt(d.game.chosen, { picture }));
      render();
      return;
    }
    const keyboard = board.hasFocus();
    selected = null;
    if (!tipDone) {
      tipDone = true;
      store.saveTipDone();
    }
    // The keys go on from the free tile nearest to the pair taken.
    cursor = nearestTo(i, freePlaces(table, next.present));
    commit(next);
    if (!play || play.done) return;
    if (keyboard && cursor !== null) board.focus(cursor);
    const stuck = standing(play).pairs === 0 ? ` ${d.game.stuck}` : '';
    announce(`${fmt(d.game.taken, { picture })} ${standingText(play)}.${stuck}`);
  }

  /** The candidate nearest to a place (the place itself is gone). */
  function nearestTo(from: number, candidates: readonly number[]): number | null {
    if (!play) return null;
    const slots = tableFor(play.layout).slots;
    const a = slots[from]!;
    let best: number | null = null;
    let bestDistance = Infinity;
    for (const i of candidates) {
      const b = slots[i]!;
      const distance = Math.hypot(b.x - a.x, b.y - a.y);
      if (distance < bestDistance) {
        best = i;
        bestDistance = distance;
      }
    }
    return best;
  }

  function takeBack(): void {
    if (!play || play.done) return;
    const next = undo(play);
    if (next === play) {
      message = d.game.nothingToUndo;
      announce(message);
      render();
      return;
    }
    selected = null;
    commit(next);
    announce(`${d.game.undone} ${standingText(next)}.`);
  }

  function takeBackMany(steps: number): void {
    if (!play || play.done) return;
    let next = play;
    for (let k = 0; k < steps; k++) next = undo(next);
    selected = null;
    commit(next);
    announce(`${plural(lang, steps, d.game.undoneMany, { n: steps })} ${standingText(next)}.`);
  }

  function mix(): void {
    if (!play || play.done) return;
    const next = shuffle(play);
    if (next === play) {
      message = d.game.shuffleFailed;
      announce(message);
      render();
      return;
    }
    selected = null;
    commit(next);
    announce(`${d.game.shuffled} ${standingText(next)}.`);
  }

  function askHint(): void {
    if (!play || !slot || play.done) return;
    const found = hintFor(play);
    if (found.kind === 'done') return;
    play = countHint(play);
    store.savePlay(slot, play);
    hint = found;
    selected = null;
    message = null;
    render();
    announce(noteText.textContent ?? '');
    // Keyboard players land on the first tile of the pair the hint shows.
    const tiles = hintTiles();
    if (tiles.length && board.hasFocus()) {
      cursor = tiles[0]!;
      render();
      board.focus(cursor);
    }
  }

  // ---------- the end ----------
  function finish(): void {
    if (!play || !slot) return;
    stopClock();
    const p = play;
    const s = slot;
    store.saveStats(recordDone(store.loadStats(), p));
    if (s === 'daily') store.saveDayResult(today, { hints: p.hints, shuffles: p.shuffles, ms: p.ms });
    else {
      store.saveLevel((p.number ?? 0) + 1);
      store.dropPlay('level');
    }
    selected = null;
    render();
    const lines = isClean(p) ? [d.end.clean] : [fmt(d.end.hints, { n: p.hints }), fmt(d.end.shuffles, { n: p.shuffles })];
    if (settings.time) lines.push(fmt(d.end.time, { time: clockText(p.ms) }));
    let share: ShareText | null = null;
    if (s === 'daily') {
      const n = streak(Object.keys(store.loadDays()), today);
      lines.push(plural(lang, n, d.end.streak, { n }));
      const params = { name: PAIRS.name, date: dateText(today, 'medium'), hints: p.hints, shuffles: p.shuffles };
      const text = isClean(p) ? fmt(d.end.shareClean, params) : fmt(d.end.share, params);
      share = { label: d.end.copy, done: d.end.copied, text: PAIRS.links.game ? `${text}\n${PAIRS.links.game}` : text };
    }
    const home = { label: d.end.home, action: closeRoute };
    endDialog.open({
      title: d.end.title,
      highlight: s === 'daily' ? fmt(d.home.dailyTitle, { date: dateText(today, 'long') }) : fmt(d.game.level, { n: p.number ?? 0 }),
      lines,
      share,
      secondary: s === 'daily' ? null : home,
      primary: s === 'daily' ? home : { label: d.end.next, action: nextLevel },
    });
  }

  function nextLevel(): void {
    endDialog.el.close();
    if (slot === 'level') {
      slot = null;
      openSlot('level');
    } else openRoute('level');
  }

  // ---------- menu ----------
  function openMenu(): void {
    menuDialog.open(
      { d, lang, settings, stats: store.loadStats(), longest: longestStreak(Object.keys(store.loadDays())) },
      {
        setLang(code) {
          lang = code;
          d = dict(lang);
          settings = { ...settings, lang: code };
          store.saveSettings(settings);
          menuDialog.el.close();
          redraw();
          openMenu();
        },
        set(patch) {
          settings = { ...settings, ...patch };
          store.saveSettings(settings);
          redraw();
        },
        clearProgress() {
          store.clearAll();
          tipDone = false;
          if (slot) {
            const s = slot;
            slot = null;
            openSlot(s);
          } else renderHome();
        },
      },
    );
  }

  function redraw(): void {
    if (slot) renderGame();
    else renderHome();
  }

  // ---------- keys ----------
  document.addEventListener('keydown', (event) => {
    if (!play || !slot || menuDialog.el.open || endDialog.el.open) return;
    const ctrl = event.ctrlKey || event.metaKey;
    const letter = letterOf(event);
    if (ctrl && letter === 'z') {
      event.preventDefault();
      takeBack();
      return;
    }
    if (ctrl || event.altKey) return;
    if (event.key === 'Escape') {
      if (selected !== null || hint || message) {
        selected = null;
        hint = null;
        message = null;
        announce(d.game.unchosen);
        render();
      }
      return;
    }
    const dir = ARROWS[event.key];
    if (dir) {
      event.preventDefault();
      if (play.done) return;
      const table = tableFor(play.layout);
      const free = freePlaces(table, play.present);
      if (!free.length) return;
      // The first arrow brings the keys onto the table; the next ones go from tile to tile.
      const next = !board.hasFocus() || cursor === null ? (cursor ?? free[0]!) : (nearest(table.slots, cursor, free, dir) ?? cursor);
      cursor = next;
      render();
      board.focus(next);
      return;
    }
    if (letter === 'h') askHint();
    else if (letter === 's') mix();
  });

  // ---------- the page around ----------
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      stopClock();
      return;
    }
    const now = localDateKey(new Date());
    if (now !== today) {
      today = now;
      if (slot === 'daily') {
        slot = null;
        openSlot('daily');
        return;
      }
      if (!slot) renderHome();
    }
    startClock();
  });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyLook);
  watchRoute(show);

  // Open where the player stopped: the layout open last time, else the start screen.
  const last = store.loadLast();
  if (!isSlot(currentRoute()) && last) openRoute(last);
  else show();
}
