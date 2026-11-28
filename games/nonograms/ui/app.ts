// The game screen: which screen is open (the start, a chapter of the album or of its colour section, a picture of the
// album — black and white or in colour — or of the day), the picture in play, the stroke under the finger, the hint
// shown; turns strokes, taps and keys into moves and draws the result. The rules themselves are in ../core (pure
// functions), reached through the picture's rules (ui/rules.ts: black and white or in colour, one face).
import { localDateKey, streak } from '../../../shared/core/dates.ts';
import type { ShareText } from '../../../shared/ui/copy.ts';
import { h } from '../../../shared/ui/dom.ts';
import { offerUpdates } from '../../../shared/ui/update-view.ts';
import { COLOUR_PICTURES } from '../art/colour.ts';
import { PICTURES } from '../art/pictures.ts';
import { NONOGRAMS, SIZES, type Size } from '../config.ts';
import { chapterOf, dailyPicture, nextUnsolved } from '../core/album.ts';
import { allLines } from '../core/clues.ts';
import type { Picture } from '../core/picture.ts';
import { BLANK, CROSS, FILL, type Mark, type Mode } from '../core/play.ts';
import { longestStreak, recordSolved } from '../core/stats.ts';
import { albumView, type AlbumItem } from './album-view.ts';
import { createBoardView, type BoardShow } from './board-view.ts';
import { colourRules } from './colour-rules.ts';
import { createEndDialog } from './end-dialog.ts';
import { homeView, type Chapter, type DayState } from './home-view.ts';
import { dict, fmt, pickLang, plural, type Dict } from './i18n.ts';
import { backSign } from './icons.ts';
import { createMenuDialog } from './menu-dialog.ts';
import { plainRules } from './plain-rules.ts';
import { closeRoute, currentRoute, openRoute, replaceRoute, restoreRoute, watchRoute } from './route.ts';
import type { AnyHint, AnyPlay, PictureRules, StrokeChoice } from './rules.ts';
import * as store from './storage.ts';
import type { Settings } from './storage.ts';
import { pictureSvg } from './thumb.ts';
import { clockText } from './time.ts';
import { createToolsView } from './tools-view.ts';
import { colourSizeText, lineName, paintName, pictureName, pictureTitle, sizeText } from './words.ts';

/** How often the shown time is updated, ms. */
const TICK_MS = 1000;
/** Lines a move finishes that are named aloud for a screen reader, at most. */
const LINES_SAID = 3;

/** A screen; `colour` — of the colour section (its chapters and pictures). */
type Screen = { kind: 'home' } | { kind: 'album'; size: Size; colour: boolean } | { kind: 'picture'; picture: Picture; daily: boolean; colour: boolean };

const albumRoute = (size: Size) => `album-${size}`;
const pictureRoute = (picture: Picture) => `p-${picture.id}`;
/** The colour section's own screens: its chapters and its pictures (C). */
const colourAlbumRoute = (size: Size) => `colour-${size}`;
const colourPictureRoute = (picture: Picture) => `c-${picture.id}`;
const chapterRoute = (size: Size, colour: boolean) => (colour ? colourAlbumRoute(size) : albumRoute(size));
const routeOf = (picture: Picture, colour: boolean) => (colour ? colourPictureRoute(picture) : pictureRoute(picture));

/** A latin digit key 1–9 whatever the keyboard layout (the paints of a colour picture); null — another key. */
function digitOf(event: KeyboardEvent): number | null {
  const m = /^(?:Digit|Numpad)([1-9])$/.exec(event.code);
  return m ? Number(m[1]) : null;
}

/** A latin letter key whatever the keyboard layout (H, X, F; Z with Ctrl). */
function letterOf(event: KeyboardEvent): string {
  return event.code.startsWith('Key') ? event.code.slice(3).toLowerCase() : '';
}

const ARROWS: Record<string, [number, number]> = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] };

interface NoteAction {
  label: string;
  run: () => void;
}

/** The picture in play and its rules. */
interface Open {
  picture: Picture;
  rules: PictureRules;
  daily: boolean;
  /** The day it was opened for (a picture of the day), else null. */
  day: string | null;
  route: string;
}

export function startApp(root: HTMLElement): void {
  let settings: Settings = store.loadSettings();
  let lang = pickLang(settings.lang, navigator.languages ?? [navigator.language]);
  let d: Dict = dict(lang);
  let today = localDateKey(new Date());

  let open: Open | null = null;
  let game: AnyPlay | null = null;
  /** The play as it would be with the stroke under the finger (shown, not saved). */
  let preview: AnyPlay | null = null;
  let mode: Mode = 'fill';
  /** The paint chosen in a colour picture (from 1): what a tap puts while the mode is paint. */
  let paint = 1;
  let hint: AnyHint | null = null;
  /** A short word about the last action (nothing to undo), shown until the next move. */
  let message: string | null = null;
  let tipDone = store.loadTipDone();
  let colourTipDone = store.loadColourTipDone();
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
  const tools = createToolsView({ mode: setMode, paint: setPaint, undo: takeBack, hint: askHint, whole: toggleWhole });
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
    if (route === 'daily') return { kind: 'picture', picture: dailyPicture(PICTURES, today), daily: true, colour: false };
    const size = SIZES.find((s) => route === albumRoute(s));
    if (size) return { kind: 'album', size, colour: false };
    const colourSize = SIZES.find((s) => route === colourAlbumRoute(s));
    if (colourSize) return { kind: 'album', size: colourSize, colour: true };
    const picture = PICTURES.find((p) => route === pictureRoute(p));
    if (picture) return { kind: 'picture', picture, daily: false, colour: false };
    const inColour = COLOUR_PICTURES.find((p) => route === colourPictureRoute(p));
    if (inColour) return { kind: 'picture', picture: inColour, daily: false, colour: true };
    return { kind: 'home' };
  }

  /** Where Back leads when the page was opened straight on a screen. */
  const parentOf = (screen: Screen): string => (screen.kind === 'picture' && !screen.daily ? chapterRoute(screen.picture.size, screen.colour) : '');

  /** A picture's rules: in colour, or black and white (of today, for the picture of the day). */
  const rulesOf = (picture: Picture, daily: boolean, colour: boolean): PictureRules =>
    colour ? colourRules(picture) : plainRules(picture, daily ? today : null);

  function goBack(): void {
    closeRoute(parentOf(screenOf(currentRoute())));
  }

  function show(): void {
    const route = currentRoute();
    const screen = screenOf(route);
    store.saveLast(screen.kind === 'home' ? '' : route);
    if (screen.kind === 'picture') {
      if (!open || open.route !== route || (open.daily && open.day !== today)) openPicture(screen.picture, screen.daily, screen.colour, route);
      else renderGame();
      return;
    }
    leavePicture();
    if (screen.kind === 'album') renderAlbum(screen.size, screen.colour);
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

  function openPicture(picture: Picture, daily: boolean, colour: boolean, route: string): void {
    leavePicture();
    const rules = rulesOf(picture, daily, colour);
    open = { picture, rules, daily, day: daily ? today : null, route };
    const saved = rules.load();
    game = saved ?? rules.fresh();
    // A new one is kept at once: a new day's picture takes the place of yesterday's.
    if (!saved) rules.save(game);
    store.saveResume(route);
    mode = 'fill';
    paint = 1;
    board.setPuzzle(picture.size, rules.clues, store.loadWhole()[picture.size] ?? false, rules.colour);
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
    game = open.rules.addTime(game, performance.now() - clockFrom);
    clockFrom = null;
    open.rules.save(game);
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
  function playOf(picture: Picture, daily: boolean, colour: boolean): AnyPlay | null {
    return rulesOf(picture, daily, colour).load();
  }

  /** The chapters of the album, or of its colour section, with how many of their pictures are solved. */
  function chaptersOf(colour: boolean): Chapter[] {
    const solved = colour ? store.loadColourSolved() : store.loadSolved();
    return SIZES.flatMap((size) => {
      const chapter = chapterOf(colour ? COLOUR_PICTURES : PICTURES, size);
      return chapter.length ? [{ size, solved: chapter.filter((p) => solved.has(p.id)).length, total: chapter.length, route: chapterRoute(size, colour) }] : [];
    });
  }

  function renderHome(): void {
    applyLook();
    backBtn.hidden = true;
    title.textContent = d.app.name;
    const days = store.loadDays();
    const dayPlay = playOf(dailyPicture(PICTURES, today), true, false);
    const daily: DayState = days[today] || dayPlay?.done ? 'done' : dayPlay && dayPlay.history.length > 0 ? 'started' : 'new';
    // The picture played last, when it is begun and not solved.
    let resume = null;
    const route = store.loadResume();
    const screen = screenOf(route);
    if (screen.kind === 'picture') {
      const rules = rulesOf(screen.picture, screen.daily, screen.colour);
      const p = rules.load();
      if (p && !p.done && p.history.length > 0) {
        resume = {
          title: screen.daily ? d.game.daily : pictureTitle(screen.picture, d, settings.nameFirst, rules.number),
          info: screen.daily ? dateText(today, 'long') : screen.colour ? colourSizeText(screen.picture.size, d) : sizeText(screen.picture.size, d),
          route,
        };
      }
    }
    content.replaceChildren(
      homeView(
        {
          resume,
          chapters: chaptersOf(false),
          colourChapters: chaptersOf(true),
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

  function renderAlbum(size: Size, colour: boolean): void {
    applyLook();
    backBtn.hidden = false;
    title.textContent = colour ? colourSizeText(size, d) : sizeText(size, d);
    const solved = colour ? store.loadColourSolved() : store.loadSolved();
    const items: AlbumItem[] = chapterOf(colour ? COLOUR_PICTURES : PICTURES, size).map((picture) => {
      const rules = rulesOf(picture, false, colour);
      const play = rules.load();
      const done = solved.has(picture.id) || !!play?.done;
      const started = !done && !!play && play.history.length > 0;
      const item: AlbumItem = {
        picture,
        state: done ? 'done' : started ? 'started' : 'new',
        marks: started ? rules.board(play!).marks : null,
        title: pictureTitle(picture, d, settings.nameFirst || done, rules.number),
      };
      // A picture in colour: solved — in its colours (whatever the setting), begun — the player's cells in their paints.
      if (rules.colour) item.look = done ? { kind: 'colour' } : started ? { kind: 'paints', marks: play!.marks, paints: rules.colour.paints } : { kind: 'blank' };
      return item;
    });
    content.replaceChildren(albumView(items, d, settings.colour, (picture) => openRoute(routeOf(picture, colour))));
  }

  // ---------- the picture ----------
  function renderGame(): void {
    applyLook();
    backBtn.hidden = false;
    if (content.firstChild !== playView) content.replaceChildren(playView);
    playView.classList.toggle('is-colour', !!open?.rules.colour);
    render();
  }

  /** The mark a hint or a mistake adds to a cell's name. */
  function cellExtra(cell: number, show: BoardShow): string | null {
    if (show.bad.has(cell) || show.hintCell === cell) return d.cell.bad;
    const hintPaint = show.hintPaints?.get(cell);
    const paints = open?.rules.colour?.paints;
    if (hintPaint && paints) return fmt(d.cell.hintPaint, { colour: paintName(paints[hintPaint - 1]!, d) });
    if (show.hintFill.has(cell)) return d.cell.hintFill;
    if (show.hintCross.has(cell)) return d.cell.hintCross;
    return null;
  }

  /** What the line under the grid says now, and what it offers to do there. */
  function noteNow(g: AnyPlay): { text: string; actions: NoteAction[] } | null {
    if (!open) return null;
    if (g.done) return { text: fmt(d.game.solved, { name: pictureName(open.picture, d) }), actions: endActions() };
    if (hint) return { text: open.rules.hintText(hint, lang, d), actions: [] };
    if (message) return { text: message, actions: [] };
    if (open.rules.fullButWrong(g)) return { text: d.game.fullWrong, actions: [] };
    // How to play: until a picture is solved; for the pictures in colour, until one of them is
    if (open.rules.colour ? !colourTipDone : !tipDone) return { text: open.rules.colour ? d.game.tipColour : d.game.tip, actions: [] };
    if (board.zoomable() && !board.isWhole() && !zoomTipDone) return { text: d.game.tipZoom, actions: [] };
    return null;
  }

  /** Draws the picture's screen from the state. */
  function render(): void {
    if (!open || !game) return;
    const o = open;
    const r = o.rules;
    const g = preview ?? game;
    const named = settings.nameFirst || game.done;
    const number = fmt(d.album.picture, { n: r.number });
    const chapter = r.colour ? colourSizeText(o.picture.size, d) : sizeText(o.picture.size, d);
    title.textContent = o.daily ? d.game.daily : pictureTitle(o.picture, d, named, r.number);
    infoText.textContent = o.daily
      ? named
        ? `${dateText(today, 'long')} · ${pictureName(o.picture, d)}`
        : dateText(today, 'long')
      : named
        ? `${chapter} · ${number}`
        : chapter;
    renderTime();
    const shown = hint ? r.hintMarks(hint) : null;
    const cells = r.board(g);
    const show: BoardShow = {
      bad: new Set(settings.mistakes && !g.done ? r.mistakes(g) : []),
      hintLine: shown?.line ?? null,
      hintFill: new Set(shown?.fill ?? []),
      hintCross: new Set(shown?.cross ?? []),
      hintCell: shown?.cell ?? null,
      faded: settings.fade ? r.fitting(g) : new Set(),
      highlight: settings.highlight,
      done: g.done,
      colours: g.done ? r.doneColours(settings.colour) : null,
      paints: cells.paints,
      hintPaints: shown?.paints ?? null,
    };
    board.el.setAttribute('aria-label', fmt(d.game.grid, { size: o.picture.size }));
    board.render(cells.marks, show, (cell) => r.cellLabel(g, cell, cellExtra(cell, show), d));
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
    tools.render(
      {
        mode,
        paints: r.colour ? { looks: r.colour.looks, names: r.colour.paints.map((c) => paintName(c, d)) } : null,
        paint,
        canUndo: game.history.length > 0,
        zoomable: board.zoomable(),
        whole: board.isWhole(),
      },
      d,
    );
    noteByKeys();
  }

  // ---------- moves ----------
  const options = (over: Partial<{ mode: Mode }> = {}): StrokeChoice => ({ mode: over.mode ?? mode, paint, secondTap: settings.secondTap, autoCross: settings.autoCross });

  /** Words for a move: how many cells changed and how (a cell painted anew counts as painted), and the lines it made fit their numbers. */
  function moveWords(before: AnyPlay, after: AnyPlay): string {
    if (!open) return '';
    const r = open.rules;
    const changed = after.history[after.history.length - 1]?.cells ?? [];
    const was = r.board(before);
    const is = r.board(after);
    const by = (m: Mark) =>
      changed.filter((c) => is.marks[c] === m && (was.marks[c] !== m || (m === FILL && is.paints?.[c] !== was.paints?.[c]))).length;
    const parts: string[] = [];
    const filled = by(FILL);
    const crossed = by(CROSS);
    const cleared = by(BLANK);
    if (filled) parts.push(plural(lang, filled, d.game.filled, { n: filled }));
    if (crossed) parts.push(plural(lang, crossed, d.game.crossed, { n: crossed }));
    if (cleared) parts.push(plural(lang, cleared, d.game.cleared, { n: cleared }));
    const fitted = r.fitting(before);
    const now = r.fitting(after);
    const done = allLines(open.picture.size).filter((l) => now.has(`${l.axis}${l.index}`) && !fitted.has(`${l.axis}${l.index}`));
    for (const l of done.slice(0, LINES_SAID)) parts.push(fmt(d.game.lineDone, { line: lineName(l.axis, l.index, d) }));
    return parts.join('. ');
  }

  function commit(next: AnyPlay, words: string | null = null): void {
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
    open.rules.save(game);
    announce(words ?? moveWords(before, game));
    if (settings.vibration && 'vibrate' in navigator) {
      const was = open.rules.board(before).marks;
      if (open.rules.board(game).marks.some((m, c) => m === FILL && was[c] !== FILL)) navigator.vibrate(NONOGRAMS.vibrateMs);
    }
    if (game.done) {
      finish();
      return;
    }
    render();
  }

  function onPreview(cells: number[] | null): void {
    if (!game || !open || game.done) return;
    const next = cells ? open.rules.stroke(game, cells, options()) : null;
    preview = next === game ? null : next;
    render();
  }

  function onCommit(cells: number[]): void {
    if (!game || !open || game.done) return;
    commit(open.rules.stroke(game, cells, options()));
  }

  function onTap(cell: number): void {
    if (!game || !open || game.done) return;
    commit(open.rules.stroke(game, [cell], options()));
  }

  function crossAt(cell: number): void {
    if (!game || !open || game.done) return;
    commit(open.rules.stroke(game, [cell], options({ mode: 'cross' })));
  }

  function clearAt(cell: number): void {
    if (!game || !open || game.done) return;
    commit(open.rules.clear(game, [cell], settings.autoCross));
  }

  function setMode(next: Mode): void {
    mode = next;
    render();
  }

  /** A paint of a colour picture chosen (from 1): taps put it. */
  function setPaint(next: number): void {
    mode = 'fill';
    paint = next;
    render();
  }

  /** A paint chosen by its key (1–9): said aloud, as the button's state is not seen. */
  function paintByKey(next: number): void {
    const paints = open?.rules.colour?.paints;
    if (!paints || next > paints.length) return;
    setPaint(next);
    announce(fmt(d.tools.paint, { colour: paintName(paints[next - 1]!, d) }));
  }

  function say(text: string): void {
    message = text;
    hint = null;
    announce(text);
    render();
  }

  function takeBack(): void {
    if (!game || !open || game.done) return;
    const next = open.rules.undo(game);
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
    // A second press puts what the hint shows (or fixes the mistake).
    if (hint) {
      commit(open.rules.putHint(game, hint, settings.autoCross));
      return;
    }
    const found = open.rules.hint(game);
    if (!found) return;
    game = open.rules.countHint(game);
    open.rules.save(game);
    hint = found;
    message = null;
    const where = open.rules.hintMarks(found);
    board.reveal(where.cell ?? where.fill[0] ?? where.cross[0] ?? 0);
    render();
    announce(noteText.textContent ?? '');
  }

  // ---------- the end ----------
  function nextPicture(): Picture | null {
    if (!open || open.daily) return null;
    if (open.rules.colour) return nextUnsolved(chapterOf(COLOUR_PICTURES, open.picture.size), store.loadColourSolved(), open.picture.id);
    return nextUnsolved(chapterOf(PICTURES, open.picture.size), store.loadSolved(), open.picture.id);
  }

  function endActions(): NoteAction[] {
    if (!open) return [];
    if (open.daily) return [{ label: d.end.home, run: () => closeRoute('') }];
    const next = nextPicture();
    const colour = open.rules.colour !== null;
    return next ? [{ label: d.end.next, run: () => replaceRoute(routeOf(next, colour)) }] : [{ label: d.end.album, run: goBack }];
  }

  function finish(): void {
    if (!game || !open) return;
    stopClock();
    const g = game;
    const o = open;
    const colour = o.rules.colour !== null;
    // The pictures in colour: solved and counted apart from the black-and-white ones.
    if (colour) {
      store.addColourSolved(o.picture.id);
      store.saveColourStats(recordSolved(store.loadColourStats(), g));
      if (!colourTipDone) {
        colourTipDone = true;
        store.saveColourTipDone();
      }
    } else {
      store.addSolved(o.picture.id);
      store.saveStats(recordSolved(store.loadStats(), g));
    }
    if (o.daily) store.saveDayResult(today, { hints: g.hints, ms: g.ms });
    if (!colour && !tipDone) {
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
    if (!o.daily && !next) lines.push(colour ? d.end.allDoneColour : d.end.allDone);
    const toAlbum = { label: d.end.album, action: goBack };
    endDialog.open({
      title: d.end.title,
      highlight: name,
      // a picture in colour ends in its colours whatever the setting (that one is for the black-and-white pictures)
      picture: pictureSvg(o.picture, colour || settings.colour ? { kind: 'colour' } : { kind: 'ink' }),
      lines,
      share,
      secondary: o.daily || !next ? null : toAlbum,
      primary: o.daily ? { label: d.end.home, action: () => closeRoute('') } : next ? { label: d.end.next, action: () => replaceRoute(routeOf(next, colour)) } : toAlbum,
    });
  }

  // ---------- menu ----------
  function openMenu(): void {
    menuDialog.open(
      { d, lang, settings, stats: store.loadStats(), colourStats: store.loadColourStats(), longest: longestStreak(Object.keys(store.loadDays())) },
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
          colourTipDone = false;
          zoomTipDone = false;
          if (open) {
            const { picture, daily, route } = open;
            const colour = open.rules.colour !== null;
            open = null;
            openPicture(picture, daily, colour, route);
          } else show();
        },
      },
    );
  }

  function redraw(): void {
    const screen = screenOf(currentRoute());
    if (screen.kind === 'picture' && open) renderGame();
    else if (screen.kind === 'album') renderAlbum(screen.size, screen.colour);
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
    const digit = digitOf(event);
    if (event.key === 'Backspace' || event.key === 'Delete') {
      if (!inGrid) return;
      event.preventDefault();
      clearAt(board.active());
    } else if (letter === 'x') {
      crossAt(board.active());
    } else if (letter === 'h') askHint();
    else if (letter === 'f') toggleWhole();
    else if (digit !== null) paintByKey(digit);
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
