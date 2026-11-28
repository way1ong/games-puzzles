// The game screen (docs/jigsaw/SPEC.md): which screen is open (the start; the choice of a picture; a puzzle of a size
// or of the day), the puzzle in play — its cut, its picture drawn into an image, the tray — the piece taken or
// carried, the hint, the picture shown whole, the time, the end, the menu, the keys. The rules are the core's; this
// module only shows them and passes the player's actions on.
import { localDateKey, streak } from '../../../shared/core/dates.ts';
import type { ShareText } from '../../../shared/ui/copy.ts';
import { h } from '../../../shared/ui/dom.ts';
import { offerUpdates } from '../../../shared/ui/update-view.ts';
import { pictureSvg } from '../art/picture.ts';
import { pieceSvg } from '../art/pieces.ts';
import { DIFFICULTIES, JIGSAW, PICTURES, type Difficulty } from '../config.ts';
import { makeCut } from '../core/cut.ts';
import { outlineOf } from '../core/outline.ts';
import { clean, countHint, drop, hintOf, nearHome, newPlay, piecesOf, place, started, trayOf, addTime, gridOf, turn, turnOf, type JigsawPlay } from '../core/play.ts';
import { dailyPictureCount, dailySeed, partSeed, pictureOf } from '../core/seeds.ts';
import { longestStreak, recordLeft, recordWon } from '../core/stats.ts';
import { trayOrder } from '../core/tray.ts';
import { chooseView } from './choose-view.ts';
import { createBoardView } from './board-view.ts';
import { createDrag } from './drag.ts';
import { createEndDialog } from './end-dialog.ts';
import { homeView, type DayState } from './home-view.ts';
import { dict, fmt, pickLang, plural, type Dict } from './i18n.ts';
import { backSign } from './icons.ts';
import { createMenuDialog } from './menu-dialog.ts';
import { rasterize, release } from './raster.ts';
import { closeRoute, currentRoute, openRoute, replaceRoute, restoreRoute, watchRoute } from './route.ts';
import { randomSeed } from './seed.ts';
import * as store from './storage.ts';
import { isSlot, slotOf, type Settings, type Slot } from './storage.ts';
import { clockText } from './time.ts';
import { createToolsView } from './tools-view.ts';
import { createTrayView } from './tray-view.ts';
import { pictureName, pieceLabel, placeLabel } from './words.ts';

/** How often the shown time is updated, ms. */
const TICK_MS = 1000;
/** The whole picture is seen a moment before the end's window opens, ms (at once with "reduce motion"). */
const END_PAUSE_MS = 900;

/** The screen of the choice of a picture for a size of free play: "choose-<size>". */
const CHOOSE = new RegExp(`^choose-(${DIFFICULTIES.join('|')})$`);

/** A latin letter key whatever the keyboard layout (H). */
function letterOf(event: KeyboardEvent): string {
  return event.code.startsWith('Key') ? event.code.slice(3).toLowerCase() : '';
}

interface NoteAction {
  label: string;
  run: () => void;
}

/** A puzzle's own parts, made once when it opens: its cut and outlines, its tray's numbers, its picture. */
interface Puzzle {
  key: string;
  cols: number;
  rows: number;
  outlines: string[];
  /** Each piece's number in the tray's order (for screen readers: it says nothing about the piece's place). */
  numbers: number[];
  /** The picture as an image address: the drawing first, its image once drawn. */
  href: string;
}

const puzzleKey = (g: JigsawPlay) => `${g.seed}|${g.difficulty}|${g.picture}`;

export function startApp(root: HTMLElement): void {
  let settings: Settings = store.loadSettings();
  let lang = pickLang(settings.lang, navigator.languages ?? [navigator.language]);
  let d: Dict = dict(lang);
  let today = localDateKey(new Date());

  /** The puzzle open (null — the start or the choice of a picture). */
  let open: Slot | null = null;
  let game: JigsawPlay | null = null;
  let puzzle: Puzzle | null = null;
  /** The piece taken by a tap or the keys, to be put by a tap on its place. */
  let taken: number | null = null;
  /** The hint's piece, for the game it was found for: a second press puts it while nothing has changed. */
  let hint: number | null = null;
  let hintFor: JigsawPlay | null = null;
  /** The whole picture over the board. */
  let whole = false;
  /** A short word about the last action, shown until the next one. */
  let message: string | null = null;
  /** "New" was tapped once on a puzzle begun: the second tap leaves it. */
  let armedNew = false;
  let tipDone = store.loadTipDone();
  /** When the current stretch of play started (performance.now()); null — the clock stands. */
  let clockFrom: number | null = null;
  let endTimer = 0;
  /** A puzzle just made after the choice of its picture: it opens even where the browser keeps nothing. */
  let fresh: JigsawPlay | null = null;

  // ---------- elements ----------
  const title = h('h1', { class: 'top__name', tabindex: -1 });
  const backBtn = h('button', { class: 'icon-btn', type: 'button' }, backSign());
  const menuBtn = h('button', { class: 'icon-btn', type: 'button' }, h('span', { class: 'icon-menu', 'aria-hidden': 'true' }));
  const content = h('div', { class: 'content' });
  const live = h('p', { class: 'visually-hidden', 'aria-live': 'polite' });
  const menuDialog = createMenuDialog();
  const endDialog = createEndDialog();
  // A new version: asked on the start screen only, never in play (shared/ui/update-view.ts).
  const updates = offerUpdates(
    () => !isSlot(currentRoute()),
    () => d.update,
  );

  const whereEl = h('span', { class: 'info__text' });
  const info = h('p', { class: 'info' }, whereEl);
  // how many pieces are in place, and the time when it is shown: in the top line, by the name
  const countEl = h('span', { class: 'top__count' });
  const timeEl = h('span', { class: 'top__time', role: 'timer' });
  const status = h('p', { class: 'top__status', hidden: true }, countEl, timeEl);
  const noteText = h('span', { class: 'note__text' });
  const noteActions = h('span', { class: 'note__actions' });
  const note = h('div', { class: 'note' }, noteText, noteActions);
  const board = createBoardView({ tap: onBoardTap, key: onPlaceKey, escape: giveBack, viewChanged });
  const tray = createTrayView({ tap: onTrayTap, lift: onLift });
  const tools = createToolsView({ hint: askHint, picture: togglePicture, zoom: toggleZoom, fresh: newPuzzle });
  const drag = createDrag({
    cellPx: () => board.cellPx(),
    boardPoint: (x, y) => board.boardPoint(x, y),
    over: (piece, at) => board.setShadow(puzzle?.outlines[piece] ?? null, piece, at),
    drop: dropCarried,
    back: (piece) => tray.slotRect(piece),
    ended: () => tray.setCarried(null),
    art: (piece) => artOf(piece, 'jigsaw-lift'),
  });
  const playView = h('div', { class: 'play' }, info, board.el, note, tray.el, tools.el);

  backBtn.addEventListener('click', () => closeRoute(''));
  menuBtn.addEventListener('click', openMenu);

  /** A note longer than its place scrolls by itself: then the keys reach it. */
  function noteByKeys(): void {
    if (note.scrollHeight > note.clientHeight + 1) note.tabIndex = 0;
    else note.removeAttribute('tabindex');
  }
  new ResizeObserver(noteByKeys).observe(note);

  root.replaceChildren(h('main', { class: 'app' }, h('header', { class: 'top' }, backBtn, title, status, menuBtn), content, live, drag.layer, menuDialog.el, endDialog.el));

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

  const piecesText = (diff: Difficulty) => {
    const { cols, rows } = JIGSAW.sizes[diff];
    return plural(lang, cols * rows, d.home.pieces, { n: cols * rows });
  };

  function announce(text: string): void {
    live.textContent = text;
  }

  function vibrate(): void {
    if (settings.vibration && 'vibrate' in navigator) navigator.vibrate(JIGSAW.vibrateMs);
  }

  // ---------- screens ----------
  function show(): void {
    const route = currentRoute();
    if (isSlot(route)) {
      store.saveLast(route);
      if (open !== route || !game || (game.way === 'daily' && game.daily !== today)) openGame(route);
      else render();
      return;
    }
    store.saveLast('');
    leaveGame();
    const choose = CHOOSE.exec(route);
    if (choose) renderChoose(choose[1] as Difficulty);
    else renderHome();
  }

  function leaveGame(): void {
    stopClock();
    window.clearTimeout(endTimer);
    open = null;
    game = null;
    clearTurn();
  }

  /** Forgets what belongs to one moment of a game: the piece taken, the hint, the picture shown, the word. */
  function clearTurn(): void {
    taken = null;
    hint = null;
    hintFor = null;
    whole = false;
    message = null;
    armedNew = false;
  }

  function dayGame(): JigsawPlay {
    const seed = dailySeed(today);
    return newPlay('daily', JIGSAW.daily, seed, pictureOf(seed, dailyPictureCount(today)), today);
  }

  function openGame(slot: Slot): void {
    stopClock();
    window.clearTimeout(endTimer);
    clearTurn();
    const made = fresh && slotOf(fresh) === slot ? fresh : null;
    fresh = null;
    const saved = store.loadPlay(slot, today) ?? made;
    const next = saved ?? (slot === 'day' ? dayGame() : null);
    if (!next) {
      // no puzzle of this size begun: its picture is chosen first
      open = null;
      game = null;
      replaceRoute(`choose-${slot}`);
      return;
    }
    open = slot;
    game = next;
    prepare(next);
    if (next.done) message = d.game.done;
    render();
    startClock();
    title.focus();
  }

  /** Makes the parts of a puzzle when another one opens: the cut, the outlines, the tray's numbers, the picture. */
  function prepare(g: JigsawPlay): void {
    const key = puzzleKey(g);
    if (puzzle?.key === key) return;
    const { cols, rows } = gridOf(g);
    const cut = makeCut(cols, rows, partSeed(g.seed, 'cut'));
    const outlines = Array.from({ length: cols * rows }, (_, i) => outlineOf(cut, i));
    const numbers: number[] = [];
    trayOrder(cols, rows, partSeed(g.seed, 'tray')).forEach((piece, i) => (numbers[piece] = i + 1));
    const svgText = pictureSvg(g.picture, g.seed);
    const before = puzzle;
    puzzle = { key, cols, rows, outlines, numbers, href: `data:image/svg+xml,${encodeURIComponent(svgText)}` };
    if (before) release(before.href);
    board.setBoard(cols, rows);
    tray.reset();
    // the picture drawn into an image once (quicker to zoom and to cut); the drawing serves until then
    void rasterize(svgText).then((url) => {
      if (puzzle?.key !== key) {
        release(url);
        return;
      }
      puzzle.href = url;
      if (open) render();
    });
  }

  // ---------- time ----------
  function startClock(): void {
    if (game && !game.done && document.visibilityState === 'visible' && clockFrom === null) clockFrom = performance.now();
  }

  function stopClock(): void {
    if (clockFrom === null || !game) return;
    game = addTime(game, performance.now() - clockFrom);
    clockFrom = null;
    if (started(game)) store.savePlay(game);
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

  // ---------- the start screen and the choice of a picture ----------
  const begun = (slot: Slot): boolean => {
    const p = store.loadPlay(slot, today);
    return !!p && !p.done && started(p);
  };

  function renderHome(): void {
    applyLook();
    backBtn.hidden = true;
    status.hidden = true;
    title.textContent = d.app.name;
    const day = store.loadPlay('day', today);
    const dayState: DayState = store.loadDays()[today] || day?.done ? 'done' : day && started(day) ? 'started' : 'new';
    content.replaceChildren(
      homeView(
        {
          begun: Object.fromEntries(DIFFICULTIES.map((diff) => [diff, begun(diff)])) as Record<Difficulty, boolean>,
          day: dayState,
          streak: streak(Object.keys(store.loadDays()), today),
          date: dateText(today, 'long'),
        },
        d,
        lang,
        (slot) => openRoute(slot === 'day' || begun(slot) ? slot : `choose-${slot}`),
      ),
    );
    updates.check();
  }

  function renderChoose(size: Difficulty): void {
    applyLook();
    backBtn.hidden = false;
    status.hidden = true;
    title.textContent = d.choose.title;
    content.replaceChildren(chooseView(`${d.difficulty[size]} · ${piecesText(size)}`, d, (picture) => startFree(size, picture)));
  }

  /** A new puzzle of free play with the picture chosen (null — any), in the choice's place. */
  function startFree(size: Difficulty, picture: number | null): void {
    const seed = randomSeed();
    fresh = newPlay('free', size, seed, picture ?? pictureOf(seed, PICTURES.length));
    store.savePlay(fresh);
    replaceRoute(size);
  }

  // ---------- the puzzle ----------
  function artOf(piece: number, id: string): string {
    const p = puzzle!;
    return pieceSvg(p.cols, p.rows, piece, p.outlines[piece]!, p.href, id);
  }

  function noteContent(g: JigsawPlay): { text: string; actions: NoteAction[] } {
    if (g.done) return { text: d.game.done, actions: endActions() };
    if (message) return { text: message, actions: [] };
    if (taken !== null) return { text: settings.turning ? d.game.takenTurn : d.game.taken, actions: [] };
    if (!tipDone) return { text: d.game.tip, actions: [] };
    return { text: '', actions: [] };
  }

  const shownHint = () => (hint !== null && hintFor === game ? hint : null);

  /** A piece's name for screen readers: its number and kind, how it lies (with turning on), taken, the hint. */
  function trayLabel(piece: number): string {
    if (!game || !puzzle) return '';
    const p = puzzle;
    const q = turnOf(game, piece, settings.turning);
    const marks = [q ? d.piece.turn[`q${q}` as 'q1' | 'q2' | 'q3'] : '', taken === piece ? d.piece.taken : '', shownHint() === piece ? d.piece.hint : ''];
    return pieceLabel(p.numbers[piece]!, p.cols, p.rows, piece, d, marks.filter(Boolean));
  }

  function render(): void {
    if (!game || !open || !puzzle) return;
    applyLook();
    backBtn.hidden = false;
    status.hidden = false;
    const g = game;
    const p = puzzle;
    title.textContent = g.way === 'daily' ? d.game.daily : d.difficulty[g.difficulty];
    if (!content.contains(playView)) content.replaceChildren(playView);
    whereEl.textContent = g.way === 'daily' ? `${dateText(today, 'long')} · ${pictureName(PICTURES[g.picture]!, d)}` : pictureName(PICTURES[g.picture]!, d);
    countEl.textContent = fmt(d.game.count, { n: g.placed.length, total: piecesOf(g) });
    renderTime();
    const shown = shownHint();
    const placed = new Set(g.placed);
    board.render({
      boardLabel: d.board.label,
      picture: p.href,
      outlines: p.outlines,
      placed: g.placed,
      ghost: settings.ghost,
      hint: shown,
      whole,
      done: g.done,
      label: (i) => placeLabel(i, p.cols, d, [placed.has(i) ? d.board.full : '', shown === i ? d.board.hint : ''].filter(Boolean)),
      pictureLabel: d.board.picture,
    });
    tray.setBoardCell(board.cellPx());
    tray.render({
      pieces: trayOf(g),
      taken,
      hint: shown,
      art: (piece) => artOf(piece, `jigsaw-tray-${piece}`),
      turn: (piece) => turnOf(g, piece, settings.turning),
      label: (piece) => trayLabel(piece),
      texts: { label: d.tray.label, prev: d.tray.prev, next: d.tray.next, page: (n, total) => fmt(d.tray.page, { n, total }) },
    });
    renderTools();
    tray.el.hidden = g.done;
    tools.el.hidden = g.done;
    const n = noteContent(g);
    noteText.textContent = n.text;
    note.classList.toggle('is-empty', !n.text);
    noteActions.replaceChildren(
      ...n.actions.map((a) => {
        const b = h('button', { class: 'btn btn--ghost note__btn', type: 'button' }, a.label);
        b.addEventListener('click', a.run);
        return b;
      }),
    );
    playView.classList.toggle('is-done', g.done);
    noteByKeys();
  }

  function renderTools(): void {
    if (!game) return;
    tools.render(d, { hintReady: shownHint() !== null, picture: whole, whole: board.zoomable() ? board.isWhole() : null, fresh: game.way === 'free', armed: armedNew });
  }

  /** The board was zoomed, moved or measured: the tray's pieces follow its size, the zoom button its state. */
  function viewChanged(): void {
    if (!game || !open) return;
    tray.setBoardCell(board.cellPx());
    renderTools();
  }

  function save(): void {
    if (game && started(game)) store.savePlay(game);
  }

  /** A piece went into its place: the hint shown is forgotten, then the end or a redraw. */
  function placed(next: JigsawPlay): void {
    game = next;
    taken = null;
    hint = null;
    hintFor = null;
    armedNew = false;
    message = null;
    announce(d.game.placed);
    save();
    if (next.done) {
      finish();
      return;
    }
    render();
  }

  /**
   * Not near its place — or near it but lying turned: the piece stays where it was (taken, or back in the tray), and
   * the game says which.
   */
  function notHere(turned = false): void {
    armedNew = false;
    message = turned ? d.game.turnFirst : d.game.notHere;
    announce(message);
    render();
  }

  /** Let go at (x, y) near its own place, but lying turned (turning on). */
  function turnedNearHome(piece: number, x: number, y: number): boolean {
    return !!game && !!puzzle && nearHome(puzzle.cols, piece, x, y) && turnOf(game, piece, settings.turning) !== 0;
  }

  /** A piece in the tray turns a quarter clockwise (a tap on the piece taken, or R). */
  function turnPiece(piece: number): void {
    if (!game || !puzzle || !settings.turning) return;
    const next = turn(game, piece);
    if (!next) return;
    game = next;
    message = null;
    save();
    render();
    announce(trayLabel(piece));
  }

  function onTrayTap(piece: number, keys: boolean): void {
    if (!game || game.done) return;
    armedNew = false;
    whole = false;
    // with turning on, a tap on the piece taken turns it a quarter (Esc or another piece gives it back)
    if (settings.turning && taken === piece && !keys) {
      turnPiece(piece);
      return;
    }
    taken = taken === piece ? null : piece;
    message = null;
    if (taken !== null && puzzle) announce(`${pieceLabel(puzzle.numbers[piece]!, puzzle.cols, puzzle.rows, piece, d, [d.piece.taken])}. ${d.game.taken}`);
    render();
    // with the keys, the board's places come next
    if (keys && taken !== null) board.focus();
  }

  function onLift(piece: number, event: PointerEvent): void {
    if (!game || game.done || !puzzle) return;
    taken = null;
    whole = false;
    armedNew = false;
    message = null;
    render();
    tray.setCarried(piece);
    drag.start(piece, event, puzzle.cols, turnOf(game, piece, settings.turning));
  }

  /** A carried piece let go on the board: into its place — its drawing box there for the glide; else back. */
  function dropCarried(piece: number, x: number, y: number): DOMRect | null {
    if (!game || game.done) return null;
    const next = drop(game, piece, x, y, settings.turning);
    if (!next) {
      notHere(turnedNearHome(piece, x, y));
      return null;
    }
    const square = board.placeRect(piece);
    const m = square.width * JIGSAW.margin;
    placed(next);
    return new DOMRect(square.left - m, square.top - m, square.width + 2 * m, square.height + 2 * m);
  }

  function tryPut(piece: number, x: number, y: number, keys: boolean): void {
    if (!game || game.done) return;
    const next = drop(game, piece, x, y, settings.turning);
    if (!next) {
      notHere(turnedNearHome(piece, x, y));
      if (keys) board.focus();
      return;
    }
    placed(next);
    if (keys && !next.done) tray.focus();
  }

  function onBoardTap(x: number, y: number): void {
    if (!game || game.done) return;
    // a tap on the picture shown whole puts it away
    if (whole) {
      whole = false;
      render();
      return;
    }
    if (taken === null) {
      message = d.game.pickFirst;
      announce(message);
      render();
      return;
    }
    tryPut(taken, x, y, false);
  }

  function onPlaceKey(at: number): void {
    if (!game || game.done || !puzzle) return;
    if (taken === null) {
      message = d.game.pickFirst;
      announce(message);
      render();
      return;
    }
    tryPut(taken, (at % puzzle.cols) + 0.5, Math.floor(at / puzzle.cols) + 0.5, true);
  }

  /** Esc: the piece taken goes back to the tray (the keys return there with it). */
  function giveBack(): void {
    if (taken === null) return;
    const piece = taken;
    taken = null;
    message = null;
    render();
    tray.focus(piece);
  }

  function askHint(): void {
    if (!game || game.done || !puzzle) return;
    armedNew = false;
    const shown = shownHint();
    // a second press puts the piece shown, while nothing has changed
    if (shown !== null) {
      const next = place(game, shown);
      if (next) placed(next);
      return;
    }
    const piece = hintOf(game);
    if (piece === null) return;
    game = countHint(game);
    hint = piece;
    hintFor = game;
    taken = null;
    whole = false;
    message = fmt(d.game.hint, { r: Math.floor(piece / puzzle.cols) + 1, c: (piece % puzzle.cols) + 1 });
    save();
    tray.showPiece(piece);
    board.reveal(piece);
    announce(message);
    render();
  }

  /** The whole picture over the board, until pressed again. */
  function togglePicture(): void {
    if (!game) return;
    whole = !whole;
    armedNew = false;
    announce(whole ? d.board.picture : '');
    render();
  }

  function toggleZoom(): void {
    if (!game || !board.zoomable()) return;
    board.setWhole(!board.isWhole());
    render();
  }

  /** Free play: another puzzle of this size — the choice of a picture; a begun one is left only on a second tap. */
  function newPuzzle(): void {
    if (!game || game.way !== 'free' || !open) return;
    const slot = open;
    if (!game.done && started(game) && !armedNew) {
      armedNew = true;
      message = d.game.newSure;
      announce(message);
      render();
      return;
    }
    stopClock();
    if (!game.done && started(game)) store.saveStats(recordLeft(store.loadStats(), game));
    store.dropPlay(slot);
    leaveGame();
    replaceRoute(`choose-${slot}`);
  }

  // ---------- the end ----------
  function endActions(): NoteAction[] {
    if (!game) return [];
    if (game.way === 'free') return [{ label: d.end.new, run: newPuzzle }];
    return [{ label: d.end.home, run: () => closeRoute('') }];
  }

  function finish(): void {
    if (!game || !open) return;
    stopClock();
    const g = game;
    store.saveStats(recordWon(store.loadStats(), g));
    if (g.way === 'daily') {
      store.saveDayResult(today, { ms: Math.round(g.ms), clean: clean(g) });
      store.savePlay(g);
    } else store.dropPlay(slotOf(g));
    if (!tipDone) {
      tipDone = true;
      store.saveTipDone();
    }
    vibrate();
    hint = null;
    taken = null;
    whole = false;
    message = null;
    render();
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    endTimer = window.setTimeout(() => {
      if (game === g) endWindow(g);
    }, still ? 0 : END_PAUSE_MS);
  }

  function endWindow(g: JigsawPlay): void {
    const name = pictureName(PICTURES[g.picture]!, d);
    const pieces = piecesText(g.difficulty);
    const lines = [g.hints ? plural(lang, g.hints, d.end.hints, { n: g.hints }) : d.end.clean];
    if (settings.time) lines.push(fmt(d.end.time, { time: clockText(g.ms) }));
    let share: ShareText | null = null;
    if (g.way === 'daily') {
      const days = streak(Object.keys(store.loadDays()), today);
      lines.push(plural(lang, days, d.end.streak, { n: days, title: d.home.daily }));
      let text = fmt(clean(g) ? d.end.shareClean : d.end.share, { name: JIGSAW.name, date: dateText(today, 'medium'), pieces });
      if (settings.time) text = fmt(d.end.shareTime, { text, time: clockText(g.ms) });
      share = { label: d.end.copy, done: d.end.copied, text: JIGSAW.links.game ? `${text}\n${JIGSAW.links.game}` : text };
    }
    const home = { label: d.end.home, action: () => closeRoute('') };
    endDialog.open({
      title: d.end.done,
      highlight: g.way === 'daily' ? `${d.home.daily} · ${dateText(today, 'long')} · ${name}` : `${name} · ${d.difficulty[g.difficulty]} · ${pieces}`,
      lines,
      share,
      secondary: g.way === 'daily' ? null : home,
      primary: g.way === 'free' ? { label: d.end.new, action: newPuzzle } : home,
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
          if (open) openGame(open);
          else show();
        },
      },
    );
  }

  function redraw(): void {
    if (open) render();
    else show();
  }

  // ---------- keys ----------
  document.addEventListener('keydown', (event) => {
    if (!open || !game || document.querySelector('dialog[open]')) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const letter = letterOf(event);
    if (letter === 'h') askHint();
    // R turns the piece taken, else the tray's piece with the focus (turning on)
    if (letter === 'r' && settings.turning) {
      const slot = document.activeElement instanceof HTMLElement ? document.activeElement.closest<HTMLElement>('.slot') : null;
      const piece = taken ?? (slot ? Number(slot.dataset.piece) : null);
      if (piece !== null && Number.isInteger(piece)) turnPiece(piece);
    }
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

  // Open where the player stopped: the puzzle open last time (with the start screen behind it), else the start.
  const last = store.loadLast();
  if (!currentRoute() && isSlot(last)) restoreRoute('', last);
  else show();
}
