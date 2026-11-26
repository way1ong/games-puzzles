// The game screen: which screen is open (the start, a chapter of the album, a picture of the album or of the day), the
// picture in play, the stroke under the finger, the hint shown; turns strokes, taps and keys into moves and draws the
// result. The rules themselves are in ../core (pure functions).
import { localDateKey, streak } from '../../../shared/core/dates.ts';
import type { ShareText } from '../../../shared/ui/copy.ts';
import { h } from '../../../shared/ui/dom.ts';
import { offerUpdates } from '../../../shared/ui/update-view.ts';
import { PALETTE, PAPER, type Colour } from '../art/palette.ts';
import { PICTURES } from '../art/pictures.ts';
import { NONOGRAMS, SIZES, type Size } from '../config.ts';
import { chapterOf, dailyPicture, nextUnsolved } from '../core/album.ts';
import { allLines, cluesOf, type Clues } from '../core/clues.ts';
import { hintFor, type Hint } from '../core/hint.ts';
import { EMPTY_PIXEL, pixelsOf, solutionOf, type Picture } from '../core/picture.ts';
import {
  BLANK,
  CROSS,
  FILL,
  addTime,
  clear,
  countHint,
  fittingLines,
  fullButWrong,
  mistakes,
  newPlay,
  put,
  stroke,
  undo,
  type Mark,
  type Mode,
  type Play,
} from '../core/play.ts';
import { longestStreak, recordSolved } from '../core/stats.ts';
import { albumView, type AlbumItem } from './album-view.ts';
import { createBoardView, type BoardShow } from './board-view.ts';
import { createEndDialog } from './end-dialog.ts';
import { homeView, type DayState } from './home-view.ts';
import { dict, fmt, pickLang, plural, type Dict } from './i18n.ts';
import { backSign } from './icons.ts';
import { createMenuDialog } from './menu-dialog.ts';
import { closeRoute, currentRoute, openRoute, replaceRoute, restoreRoute, watchRoute } from './route.ts';
import * as store from './storage.ts';
import type { Settings } from './storage.ts';
import { pictureSvg } from './thumb.ts';
import { clockText } from './time.ts';
import { createToolsView } from './tools-view.ts';
import { cellLabel, hintText, lineName, pictureName, pictureNumber, pictureTitle, sizeText } from './words.ts';

/** How often the shown time is updated, ms. */
const TICK_MS = 1000;
/** Lines a move finishes that are named aloud for a screen reader, at most. */
const LINES_SAID = 3;

type Screen = { kind: 'home' } | { kind: 'album'; size: Size } | { kind: 'picture'; picture: Picture; daily: boolean };

const albumRoute = (size: Size) => `album-${size}`;
const pictureRoute = (picture: Picture) => `p-${picture.id}`;

/** A latin letter key whatever the keyboard layout (H, X, F; Z with Ctrl). */
function letterOf(event: KeyboardEvent): string {
  return event.code.startsWith('Key') ? event.code.slice(3).toLowerCase() : '';
}

const ARROWS: Record<string, [number, number]> = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] };

interface NoteAction {
  label: string;
  run: () => void;
}

/** The picture in play and what follows from it. */
interface Open {
  picture: Picture;
  clues: Clues;
  solution: boolean[];
  daily: boolean;
  route: string;
}

export function startApp(root: HTMLElement): void {
  let settings: Settings = store.loadSettings();
  let lang = pickLang(settings.lang, navigator.languages ?? [navigator.language]);
  let d: Dict = dict(lang);
  let today = localDateKey(new Date());

  let open: Open | null = null;
  let game: Play | null = null;
  /** The play as it would be with the stroke under the finger (shown, not saved). */
  let preview: Play | null = null;
  let mode: Mode = 'fill';
  let hint: Hint | null = null;
  /** A short word about the last action (nothing to undo), shown until the next move. */
  let message: string | null = null;
  let tipDone = store.loadTipDone();
  let zoomTipDone = store.loadZoomTipDone();
  /** When the current stretch of play started (performance.now()); null — the clock stands. */
  let clockFrom: number | null = null;

  // ---------- elements ----------
  const title = h('h1', { class: 'top__name', tabindex: -1 });
  const backBtn = h('button', { class: 'icon-btn', type: 'button' }, backSign());
  const menuBtn = h('button', { class: 'icon-btn', type: 'button' }, h('span', { class: 'icon-menu', 'aria-hidden': 'true' }));
  const content = h('div', { class: 'content' });
  const live = h('p', { class: 'visually-hidden', 'aria-live': 'polite' });
  const menuDialog = createMenuDialog();
  // A new version: asked on the start screen only, never in play (shared/ui/update-view.ts).
  const updates = offerUpdates(() => screenOf(currentRoute()).kind === 'home', () => d.update);
  const endDialog = createEndDialog();

  const infoText = h('span', { class: 'info__text' });
  const timeEl = h('span', { class: 'info__time', role: 'timer' });
  const info = h('p', { class: 'info' }, infoText, timeEl);
  const noteText = h('span', { class: 'note__text' });
  const noteActions = h('span', { class: 'note__actions' });
  const note = h('div', { class: 'note' }, noteText, noteActions);
  const board = createBoardView({ preview: onPreview, commit: onCommit, tap: onTap, viewChanged, measured: render });
  const stage = h('div', { class: 'stage' }, board.el);
  const tools = createToolsView({ mode: setMode, undo: takeBack, hint: askHint, whole: toggleWhole });
  const playView = h('div', { class: 'play' }, info, stage, note, tools.el);

  backBtn.addEventListener('click', goBack);
  menuBtn.addEventListener('click', openMenu);

  /** A note longer than its place scrolls by itself: then the keys reach it. */
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
    html.classList.toggle('left-hand', settings.leftHand);
    if (settings.theme === 'system') delete html.dataset.theme;
    else html.dataset.theme = settings.theme;
    document.title = d.meta.title;
    document.querySelector('meta[name="description"]')?.setAttribute('content', d.meta.description);
    const bg = getComputedStyle(document.body).backgroundColor;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg);
    backBtn.setAttribute('aria-label', d.app.back);
    menuBtn.setAttribute('aria-label', d.app.menu);
  }

  const dateText = (dateKey: string, style: 'long' | 'medium') =>
    new Intl.DateTimeFormat(lang, style === 'long' ? { day: 'numeric', month: 'long' } : { dateStyle: 'medium' }).format(new Date(`${dateKey}T12:00:00`));

  function announce(text: string): void {
    live.textContent = text;
  }

  // ---------- screens ----------
  function screenOf(route: string): Screen {
    if (route === 'daily') return { kind: 'picture', picture: dailyPicture(PICTURES, today), daily: true };
    const size = SIZES.find((s) => route === albumRoute(s));
    if (size) return { kind: 'album', size };
    const picture = PICTURES.find((p) => route === pictureRoute(p));
    if (picture) return { kind: 'picture', picture, daily: false };
    return { kind: 'home' };
  }

  /** Where Back leads when the page was opened straight on a screen. */
  const parentOf = (screen: Screen): string => (screen.kind === 'picture' && !screen.daily ? albumRoute(screen.picture.size) : '');

  function goBack(): void {
    closeRoute(parentOf(screenOf(currentRoute())));
  }

  function show(): void {
    const route = currentRoute();
    const screen = screenOf(route);
    store.saveLast(screen.kind === 'home' ? '' : route);
    if (screen.kind === 'picture') {
      if (!open || open.route !== route || (open.daily && game?.daily !== today)) openPicture(screen.picture, screen.daily, route);
      else renderGame();
      return;
    }
    leavePicture();
    if (screen.kind === 'album') renderAlbum(screen.size);
    else renderHome();
  }

  function leavePicture(): void {
    stopClock();
    open = null;
    game = null;
    preview = null;
    hint = null;
    message = null;
  }

  function openPicture(picture: Picture, daily: boolean, route: string): void {
    leavePicture();
    const solution = solutionOf(picture);
    const clues = cluesOf(solution, picture.size);
    const day = daily ? today : null;
    open = { picture, clues, solution, daily, route };
    const saved = store.loadPlay(picture, clues, day);
    game = saved ?? newPlay(picture, day);
    // A new one is kept at once: a new day's picture takes the place of yesterday's.
    if (!saved) store.savePlay(game, picture);
    store.saveResume(route);
    mode = 'fill';
    board.setPuzzle(picture.size, clues, store.loadWhole()[picture.size] ?? false);
    startClock();
    renderGame();
    title.focus();
  }

  // ---------- time ----------
  function startClock(): void {
    if (game && !game.done && document.visibilityState === 'visible' && clockFrom === null) clockFrom = performance.now();
  }

  function stopClock(): void {
    if (clockFrom === null || !game || !open) return;
    game = addTime(game, performance.now() - clockFrom);
    clockFrom = null;
    store.savePlay(game, open.picture);
  }

  function playedMs(): number {
    if (!game) return 0;
    return game.ms + (clockFrom === null ? 0 : performance.now() - clockFrom);
  }

  function renderTime(): void {
    timeEl.hidden = !settings.time || !game;
    if (!timeEl.hidden) timeEl.textContent = clockText(playedMs());
  }

  window.setInterval(() => {
    if (open && settings.time) renderTime();
  }, TICK_MS);

  // ---------- the start screen and the album ----------
  function playOf(picture: Picture, daily: boolean): Play | null {
    return store.loadPlay(picture, cluesOf(solutionOf(picture), picture.size), daily ? today : null);
  }

  function renderHome(): void {
    applyLook();
    backBtn.hidden = true;
    title.textContent = d.app.name;
    const solved = store.loadSolved();
    const days = store.loadDays();
    const dayPlay = playOf(dailyPicture(PICTURES, today), true);
    const daily: DayState = days[today] || dayPlay?.done ? 'done' : dayPlay && dayPlay.history.length > 0 ? 'started' : 'new';
    // The picture played last, when it is begun and not solved.
    let resume = null;
    const route = store.loadResume();
    const screen = screenOf(route);
    if (screen.kind === 'picture') {
      const p = playOf(screen.picture, screen.daily);
      if (p && !p.done && p.history.length > 0) {
        resume = {
          title: screen.daily ? d.game.daily : pictureTitle(screen.picture, d, settings.nameFirst),
          info: screen.daily ? dateText(today, 'long') : sizeText(screen.picture.size, d),
          route,
        };
      }
    }
    content.replaceChildren(
      homeView(
        {
          resume,
          chapters: SIZES.map((size) => {
            const chapter = chapterOf(PICTURES, size);
            return { size, solved: chapter.filter((p) => solved.has(p.id)).length, total: chapter.length, route: albumRoute(size) };
          }),
          daily,
          date: dateText(today, 'long'),
          streak: streak(Object.keys(days), today),
        },
        d,
        lang,
        openRoute,
      ),
    );
    updates.check();
  }

  function renderAlbum(size: Size): void {
    applyLook();
    backBtn.hidden = false;
    title.textContent = sizeText(size, d);
    const solved = store.loadSolved();
    const items: AlbumItem[] = chapterOf(PICTURES, size).map((picture) => {
      const play = playOf(picture, false);
      const done = solved.has(picture.id) || !!play?.done;
      const started = !done && !!play && play.history.length > 0;
      return {
        picture,
        state: done ? 'done' : started ? 'started' : 'new',
        marks: started ? play!.marks : null,
        title: pictureTitle(picture, d, settings.nameFirst || done),
      };
    });
    content.replaceChildren(albumView(items, d, settings.colour, (picture) => openRoute(pictureRoute(picture))));
  }

  // ---------- the picture ----------
  function renderGame(): void {
    applyLook();
    backBtn.hidden = false;
    if (content.firstChild !== playView) content.replaceChildren(playView);
    render();
  }

  /** The mark a hint or a mistake adds to a cell's name. */
  function cellExtra(cell: number, show: BoardShow): string | null {
    if (show.bad.has(cell) || show.hintCell === cell) return d.cell.bad;
    if (show.hintFill.has(cell)) return d.cell.hintFill;
    if (show.hintCross.has(cell)) return d.cell.hintCross;
    return null;
  }

  /** What the line under the grid says now, and what it offers to do there. */
  function noteNow(g: Play): { text: string; actions: NoteAction[] } | null {
    if (!open) return null;
    if (g.done) return { text: fmt(d.game.solved, { name: pictureName(open.picture, d) }), actions: endActions() };
    if (hint) return { text: hintText(hint, open.clues, lang, d), actions: [] };
    if (message) return { text: message, actions: [] };
    if (fullButWrong(g, open.clues)) return { text: d.game.fullWrong, actions: [] };
    if (board.zoomable() && board.isWhole() && board.el.classList.contains('is-tiny')) return { text: d.game.tiny, actions: [] };
    if (!tipDone) return { text: d.game.tip, actions: [] };
    if (board.zoomable() && !board.isWhole() && !zoomTipDone) return { text: d.game.tipZoom, actions: [] };
    return null;
  }

  /** Draws the picture's screen from the state. */
  function render(): void {
    if (!open || !game) return;
    const o = open;
    const g = preview ?? game;
    const named = settings.nameFirst || game.done;
    const number = fmt(d.album.picture, { n: pictureNumber(o.picture) });
    title.textContent = o.daily ? d.game.daily : pictureTitle(o.picture, d, named);
    infoText.textContent = o.daily
      ? named
        ? `${dateText(today, 'long')} · ${pictureName(o.picture, d)}`
        : dateText(today, 'long')
      : named
        ? `${sizeText(o.picture.size, d)} · ${number}`
        : sizeText(o.picture.size, d);
    renderTime();
    const pixels = pixelsOf(o.picture);
    const show: BoardShow = {
      bad: new Set(settings.mistakes && !g.done ? mistakes(g.marks, o.solution) : []),
      hintLine: hint?.kind === 'line' ? { axis: hint.axis, index: hint.index } : null,
      hintFill: new Set(hint?.kind === 'line' ? hint.fill : []),
      hintCross: new Set(hint?.kind === 'line' ? hint.cross : []),
      hintCell: hint?.kind === 'mistake' ? hint.cell : null,
      faded: settings.fade ? fittingLines(g.marks, o.clues) : new Set(),
      highlight: settings.highlight,
      done: g.done,
      colours: g.done && settings.colour ? pixels.map((p) => (p === EMPTY_PIXEL ? PAPER : PALETTE[p as Colour])) : null,
    };
    board.el.setAttribute('aria-label', fmt(d.game.grid, { size: o.picture.size }));
    board.render(g.marks, show, (cell) => cellLabel(cell, o.clues, g.marks[cell] as Mark, cellExtra(cell, show), d));
    const now = noteNow(g);
    noteText.textContent = now?.text ?? '';
    noteActions.replaceChildren(
      ...(now?.actions ?? []).map((a) => {
        const b = h('button', { class: 'btn btn--primary', type: 'button' }, a.label);
        b.addEventListener('click', a.run);
        return b;
      }),
    );
    note.classList.toggle('is-empty', !now);
    tools.el.hidden = g.done;
    tools.render({ mode, canUndo: game.history.length > 0, zoomable: board.zoomable(), whole: board.isWhole() }, d);
    noteByKeys();
  }

  // ---------- moves ----------
  const options = (over: Partial<{ mode: Mode }> = {}) => ({ mode: over.mode ?? mode, secondTap: settings.secondTap, autoCross: settings.autoCross });

  /** Words for a move: how many cells changed and how, and the lines it made fit their numbers. */
  function moveWords(before: Play, after: Play): string {
    if (!open) return '';
    const changed = after.history.at(-1)?.cells ?? [];
    const by = (m: Mark) => changed.filter((c) => after.marks[c] === m && before.marks[c] !== m).length;
    const parts: string[] = [];
    const filled = by(FILL);
    const crossed = by(CROSS);
    const cleared = by(BLANK);
    if (filled) parts.push(plural(lang, filled, d.game.filled, { n: filled }));
    if (crossed) parts.push(plural(lang, crossed, d.game.crossed, { n: crossed }));
    if (cleared) parts.push(plural(lang, cleared, d.game.cleared, { n: cleared }));
    const was = fittingLines(before.marks, open.clues);
    const now = fittingLines(after.marks, open.clues);
    const done = allLines(open.clues.size).filter((l) => now.has(`${l.axis}${l.index}`) && !was.has(`${l.axis}${l.index}`));
    for (const l of done.slice(0, LINES_SAID)) parts.push(fmt(d.game.lineDone, { line: lineName(l.axis, l.index, d) }));
    return parts.join('. ');
  }

  function commit(next: Play, words: string | null = null): void {
    preview = null;
    if (!game || !open || next === game) {
      render();
      return;
    }
    // The move that solves the picture stops the clock: its last stretch counts.
    if (next.done && clockFrom !== null) {
      next = { ...next, ms: next.ms + (performance.now() - clockFrom) };
      clockFrom = null;
    }
    const before = game;
    game = next;
    hint = null;
    message = null;
    store.savePlay(game, open.picture);
    announce(words ?? moveWords(before, game));
    if (settings.vibration && 'vibrate' in navigator && game.marks.some((m, c) => m === FILL && before.marks[c] !== FILL)) {
      navigator.vibrate(NONOGRAMS.vibrateMs);
    }
    if (game.done) {
      finish();
      return;
    }
    render();
  }

  function onPreview(cells: number[] | null): void {
    if (!game || !open || game.done) return;
    const next = cells ? stroke(game, open.clues, cells, options()) : null;
    preview = next === game ? null : next;
    render();
  }

  function onCommit(cells: number[]): void {
    if (!game || !open || game.done) return;
    commit(stroke(game, open.clues, cells, options()));
  }

  function onTap(cell: number): void {
    if (!game || !open || game.done) return;
    commit(stroke(game, open.clues, [cell], options()));
  }

  function crossAt(cell: number): void {
    if (!game || !open || game.done) return;
    commit(stroke(game, open.clues, [cell], options({ mode: 'cross' })));
  }

  function clearAt(cell: number): void {
    if (!game || !open || game.done) return;
    commit(clear(game, open.clues, [cell], settings.autoCross));
  }

  function setMode(next: Mode): void {
    mode = next;
    render();
  }

  function say(text: string): void {
    message = text;
    hint = null;
    announce(text);
    render();
  }

  function takeBack(): void {
    if (!game || game.done) return;
    const next = undo(game);
    if (next === game) {
      say(d.game.nothingToUndo);
      return;
    }
    commit(next, d.game.undone);
  }

  // ---------- zoom ----------
  function viewChanged(): void {
    if (!open) return;
    store.saveWhole(open.picture.size, board.isWhole());
    if (!zoomTipDone) {
      zoomTipDone = true;
      store.saveZoomTipDone();
    }
    render();
  }

  function toggleWhole(): void {
    if (!open || !board.zoomable()) return;
    board.setWhole(!board.isWhole());
    viewChanged();
  }

  // ---------- hints ----------
  function askHint(): void {
    if (!game || !open || game.done) return;
    // A second press puts what the hint shows.
    if (hint?.kind === 'line') {
      commit(put(game, open.clues, hint.fill, hint.cross, settings.autoCross));
      return;
    }
    if (hint?.kind === 'mistake') {
      const cell = hint.cell;
      commit(hint.should === 'fill' ? put(game, open.clues, [cell], [], settings.autoCross) : put(game, open.clues, [], [cell], settings.autoCross));
      return;
    }
    const found = hintFor(game, open.picture, open.clues);
    if (found.kind === 'none') return;
    game = countHint(game);
    store.savePlay(game, open.picture);
    hint = found;
    message = null;
    board.reveal(found.kind === 'mistake' ? found.cell : (found.fill[0] ?? found.cross[0] ?? 0));
    render();
    announce(noteText.textContent ?? '');
  }

  // ---------- the end ----------
  function nextPicture(): Picture | null {
    if (!open || open.daily) return null;
    return nextUnsolved(chapterOf(PICTURES, open.picture.size), store.loadSolved(), open.picture.id);
  }

  function endActions(): NoteAction[] {
    if (!open) return [];
    if (open.daily) return [{ label: d.end.home, run: () => closeRoute('') }];
    const next = nextPicture();
    return next ? [{ label: d.end.next, run: () => replaceRoute(pictureRoute(next)) }] : [{ label: d.end.album, run: goBack }];
  }

  function finish(): void {
    if (!game || !open) return;
    stopClock();
    const g = game;
    const o = open;
    store.addSolved(o.picture.id);
    store.saveStats(recordSolved(store.loadStats(), g));
    if (o.daily) store.saveDayResult(today, { hints: g.hints, ms: g.ms });
    if (!tipDone) {
      tipDone = true;
      store.saveTipDone();
    }
    hint = null;
    render();
    const name = pictureName(o.picture, d);
    const lines = [g.hints ? fmt(d.end.hints, { n: g.hints }) : d.end.clean];
    if (settings.time) lines.push(fmt(d.end.time, { time: clockText(g.ms) }));
    let share: ShareText | null = null;
    if (o.daily) {
      const n = streak(Object.keys(store.loadDays()), today);
      lines.push(plural(lang, n, d.end.streak, { n }));
      const params = { name: NONOGRAMS.name, date: dateText(today, 'medium'), hints: g.hints };
      const text = g.hints ? fmt(d.end.share, params) : fmt(d.end.shareClean, params);
      share = { label: d.end.copy, done: d.end.copied, text: NONOGRAMS.links.game ? `${text}\n${NONOGRAMS.links.game}` : text };
    }
    const next = nextPicture();
    if (!o.daily && !next) lines.push(d.end.allDone);
    const toAlbum = { label: d.end.album, action: goBack };
    endDialog.open({
      title: d.end.title,
      highlight: name,
      picture: pictureSvg(o.picture, settings.colour ? { kind: 'colour' } : { kind: 'ink' }),
      lines,
      share,
      secondary: o.daily || !next ? null : toAlbum,
      primary: o.daily ? { label: d.end.home, action: () => closeRoute('') } : next ? { label: d.end.next, action: () => replaceRoute(pictureRoute(next)) } : toAlbum,
    });
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
          zoomTipDone = false;
          if (open) {
            const { picture, daily, route } = open;
            open = null;
            openPicture(picture, daily, route);
          } else show();
        },
      },
    );
  }

  function redraw(): void {
    const screen = screenOf(currentRoute());
    if (screen.kind === 'picture' && open) renderGame();
    else if (screen.kind === 'album') renderAlbum(screen.size);
    else renderHome();
  }

  // ---------- keys ----------
  document.addEventListener('keydown', (event) => {
    if (!open || !game || menuDialog.el.open || endDialog.el.open) return;
    const ctrl = event.ctrlKey || event.metaKey;
    const letter = letterOf(event);
    if (ctrl && letter === 'z') {
      event.preventDefault();
      takeBack();
      return;
    }
    if (ctrl || event.altKey) return;
    if (event.key === 'Escape') {
      if (hint || message) {
        hint = null;
        message = null;
        render();
      }
      return;
    }
    const arrow = ARROWS[event.key];
    if (arrow) {
      event.preventDefault();
      board.step(arrow[0], arrow[1]);
      return;
    }
    const inGrid = (event.target as HTMLElement | null)?.closest?.('.grid') !== null;
    if (event.key === 'Backspace' || event.key === 'Delete') {
      if (!inGrid) return;
      event.preventDefault();
      clearAt(board.active());
    } else if (letter === 'x') {
      crossAt(board.active());
    } else if (letter === 'h') askHint();
    else if (letter === 'f') toggleWhole();
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
      show();
      return;
    }
    startClock();
  });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyLook);
  watchRoute(show);

  // Open where the player stopped: the screen open last time (a picture with its chapter behind it), else the start.
  const last = store.loadLast();
  const lastScreen = screenOf(last);
  if (!currentRoute() && lastScreen.kind !== 'home') restoreRoute(parentOf(lastScreen), last);
  else show();
}
