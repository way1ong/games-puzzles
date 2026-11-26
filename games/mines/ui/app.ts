// The game screen: which screen is open (the start, a field of a level, a field of the day), the field in play, the
// hint shown; turns taps, holds and keys into moves and draws the result (docs/mines/SPEC.md). The rules themselves
// are in ../core (pure functions).
import { localDateKey, streak } from '../../../shared/core/dates.ts';
import type { ShareText } from '../../../shared/ui/copy.ts';
import { h } from '../../../shared/ui/dom.ts';
import { offerUpdates } from '../../../shared/ui/update-view.ts';
import { LEVELS, MINES, type Level } from '../config.ts';
import { mineMap, numbers, type Field } from '../core/field.ts';
import { applyHint, findHint, type MinesHint } from '../core/hint.ts';
import { dailySeed, makeField } from '../core/make.ts';
import {
  CLOSED_CELL,
  FLAG,
  OPEN,
  addTime,
  afterMine,
  aroundNumber,
  countHint,
  minesLeft,
  newPlay,
  openAround,
  openCell,
  playing,
  started,
  startOver,
  toggleFlag,
  withField,
  type MinesPlay,
} from '../core/play.ts';
import { longestStreak, recordPlayed, recordWon } from '../core/stats.ts';
import { artSymbols } from './art.ts';
import { createBoardView, type BoardShow } from './board-view.ts';
import { createEndDialog } from './end-dialog.ts';
import { dailyRoute, homeView, levelRoute, sizeText, type DayState } from './home-view.ts';
import { dict, fmt, pickLang, plural, type Dict } from './i18n.ts';
import { backSign } from './icons.ts';
import { randomSeed, runSoon } from './maker.ts';
import { createMenuDialog } from './menu-dialog.ts';
import { closeRoute, currentRoute, openRoute, restoreRoute, watchRoute } from './route.ts';
import * as store from './storage.ts';
import type { Settings } from './storage.ts';
import { clockText } from './time.ts';
import { createToolsView, type Mode } from './tools-view.ts';
import { cellLabel, hintText } from './words.ts';

/** How often the shown time is updated, ms. */
const TICK_MS = 1000;
/** "Preparing the field…" shows only when making one takes longer than this, ms (most take a few). */
const MAKING_SAID_MS = 200;

type Screen = { kind: 'home' } | { kind: 'field'; level: Level; daily: boolean };

/** A latin letter key whatever the keyboard layout (H, F, N; Z with Ctrl). */
function letterOf(event: KeyboardEvent): string {
  return event.code.startsWith('Key') ? event.code.slice(3).toLowerCase() : '';
}

const ARROWS: Record<string, [number, number]> = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] };

interface NoteAction {
  label: string;
  run: () => void;
  quiet?: boolean;
}

/** The field screen open, and its address. */
interface Open {
  level: Level;
  daily: boolean;
  route: string;
}

export function startApp(root: HTMLElement): void {
  let settings: Settings = store.loadSettings();
  let lang = pickLang(settings.lang, navigator.languages ?? [navigator.language]);
  let d: Dict = dict(lang);
  let today = localDateKey(new Date());

  let open: Open | null = null;
  let game: MinesPlay | null = null;
  /** A field is being made (null — none); `said` — long enough to say so. */
  let making: { stop: () => void; said: boolean } | null = null;
  let hint: MinesHint | null = null;
  /** The game the hint was found for: a second press does it only while nothing has changed. */
  let hintFor: MinesPlay | null = null;
  /** A short word about the last action, shown until the next move. */
  let message: string | null = null;
  /** "New field" was tapped once while a field was begun: the second tap takes a new one. */
  let armedNew = false;
  let mode: Mode = store.loadMode();
  let tipDone = store.loadTipDone();
  let zoomTipDone = store.loadZoomTipDone();
  /** When the current stretch of play started (performance.now()); null — the clock stands. */
  let clockFrom: number | null = null;
  let numbersCache: { field: Field; nums: Uint8Array; mines: Uint8Array } | null = null;

  // ---------- elements ----------
  const title = h('h1', { class: 'top__name', tabindex: -1 });
  const backBtn = h('button', { class: 'icon-btn', type: 'button' }, backSign());
  const menuBtn = h('button', { class: 'icon-btn', type: 'button' }, h('span', { class: 'icon-menu', 'aria-hidden': 'true' }));
  const content = h('div', { class: 'content' });
  const live = h('p', { class: 'visually-hidden', 'aria-live': 'polite' });
  const menuDialog = createMenuDialog();
  const endDialog = createEndDialog();

  const infoText = h('span', { class: 'info__text' });
  const leftEl = h('span', { class: 'info__left' });
  const timeEl = h('span', { class: 'info__time', role: 'timer' });
  const info = h('p', { class: 'info' }, infoText, leftEl, timeEl);
  const noteText = h('span', { class: 'note__text' });
  const noteActions = h('span', { class: 'note__actions' });
  const note = h('div', { class: 'note' }, noteText, noteActions);
  const board = createBoardView({ tap: onTap, hold: onHold, viewChanged, measured: render });
  const stage = h('div', { class: 'stage' }, board.el);
  const tools = createToolsView({ mode: setMode, hint: askHint, fresh: () => newField(), whole: toggleWhole, restart: restartField, undo: undoBoom });
  const playView = h('div', { class: 'play' }, info, stage, note, tools.el);

  backBtn.addEventListener('click', goBack);
  menuBtn.addEventListener('click', openMenu);
  // A new version: asked on the start screen only, never over a field.
  const updates = offerUpdates(
    () => screenOf(currentRoute()).kind === 'home',
    () => d.update,
  );

  /** A note longer than its place scrolls by itself: then the keys reach it. */
  function noteByKeys(): void {
    if (note.scrollHeight > note.clientHeight + 1) note.tabIndex = 0;
    else note.removeAttribute('tabindex');
  }
  new ResizeObserver(noteByKeys).observe(note);

  root.replaceChildren(
    h('main', { class: 'app' }, h('header', { class: 'top' }, backBtn, title, menuBtn), content, live, menuDialog.el, endDialog.el),
    artSymbols(),
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

  const t = () => d.themes[settings.field];

  // ---------- screens ----------
  function screenOf(route: string): Screen {
    for (const level of LEVELS) {
      if (route === levelRoute(level)) return { kind: 'field', level, daily: false };
      if (route === dailyRoute(level)) return { kind: 'field', level, daily: true };
    }
    return { kind: 'home' };
  }

  function goBack(): void {
    closeRoute('');
  }

  function show(): void {
    const route = currentRoute();
    const screen = screenOf(route);
    store.saveLast(screen.kind === 'home' ? '' : route);
    if (screen.kind === 'field') {
      if (!open || open.route !== route || (open.daily && game !== null && game.daily !== today)) openField(screen.level, screen.daily, route);
      else renderGame();
      return;
    }
    leaveField();
    renderHome();
  }

  function stopMaking(): void {
    making?.stop();
    making = null;
  }

  function leaveField(): void {
    stopClock();
    stopMaking();
    open = null;
    game = null;
    hint = null;
    hintFor = null;
    message = null;
    armedNew = false;
  }

  function openField(level: Level, daily: boolean, route: string): void {
    leaveField();
    open = { level, daily, route };
    const rule = MINES.levels[level];
    const whole = store.loadWhole()[level] ?? false;
    const saved = store.loadPlay(level, daily ? today : null);
    if (saved) {
      game = saved;
      board.setField(rule.width, rule.height, whole, saved.field?.start ?? null);
      startClock();
      renderGame();
      title.focus();
      return;
    }
    board.setField(rule.width, rule.height, whole, null);
    const seed = daily ? dailySeed(today, level) : randomSeed();
    if (!daily && settings.start === 'player') {
      game = newPlay(level, seed, 'player', null);
      store.savePlay(game);
      renderGame();
      title.focus();
      return;
    }
    make(level, seed, null, (field) => {
      game = newPlay(level, seed, 'game', field, daily ? today : null);
      store.savePlay(game);
      board.setField(rule.width, rule.height, whole, field.start);
      startClock();
    });
    renderGame();
    title.focus();
  }

  /** Makes a field in slices; "Preparing the field…" if it takes long. */
  function make(level: Level, seed: number, start: number | null, done: (field: Field) => void): void {
    stopMaking();
    const forOpen = open;
    const timer = window.setTimeout(() => {
      if (making) {
        making.said = true;
        render();
      }
    }, MAKING_SAID_MS);
    const stop = runSoon(makeField(level, seed, start), (field) => {
      window.clearTimeout(timer);
      making = null;
      if (open !== forOpen) return;
      done(field);
      render();
    });
    making = {
      stop: () => {
        window.clearTimeout(timer);
        stop();
      },
      said: false,
    };
  }

  // ---------- time ----------
  function startClock(): void {
    if (game?.field && playing(game) && document.visibilityState === 'visible' && clockFrom === null) clockFrom = performance.now();
  }

  function stopClock(): void {
    if (clockFrom === null || !game) return;
    game = addTime(game, performance.now() - clockFrom);
    clockFrom = null;
    store.savePlay(game);
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

  // ---------- the start screen ----------
  function renderHome(): void {
    applyLook();
    backBtn.hidden = true;
    title.textContent = d.app.name;
    const days = store.loadDays();
    const startedOf = (play: MinesPlay | null) => !!play && !play.done && (started(play) || play.boom !== null);
    const begun = Object.fromEntries(LEVELS.map((level) => [level, startedOf(store.loadPlay(level, null))])) as Record<Level, boolean>;
    const daily = Object.fromEntries(
      LEVELS.map((level) => {
        const play = store.loadPlay(level, today);
        const state: DayState = days[today]?.[level] || play?.done ? 'done' : startedOf(play) ? 'started' : 'new';
        return [level, state];
      }),
    ) as Record<Level, DayState>;
    content.replaceChildren(homeView({ started: begun, daily, date: dateText(today, 'long'), streak: streak(Object.keys(days), today) }, d, lang, openRoute));
    updates.check();
  }

  // ---------- the field ----------
  function renderGame(): void {
    applyLook();
    backBtn.hidden = false;
    if (content.firstChild !== playView) content.replaceChildren(playView);
    render();
  }

  function fieldNumbers(field: Field): { nums: Uint8Array; mines: Uint8Array } {
    if (numbersCache?.field !== field) numbersCache = { field, nums: numbers(field), mines: mineMap(field) };
    return numbersCache;
  }

  /** What the line under the field says now, and what it offers to do there. */
  function noteNow(): { text: string; actions: NoteAction[] } | null {
    if (!open) return null;
    if (making?.said || (!game && making)) return making?.said ? { text: d.game.making, actions: [] } : null;
    if (!game) return null;
    if (game.done) return { text: d.game.won, actions: endActions() };
    // after a mine, what follows it stands in the tools' place
    if (game.boom !== null) return { text: settings.afterMine === 'undo' ? t().boomUndo : open.daily ? t().boomDaily : t().boomRestart, actions: [] };
    if (hint) return { text: hintText(hint, (cell) => (game?.field ? fieldNumbers(game.field).nums[cell]! : 0), settings.field, lang, d), actions: [] };
    if (message) return { text: message, actions: [] };
    if (!game.field) return { text: d.game.tipPlayer, actions: [] };
    if (board.zoomable() && board.isWhole() && board.el.classList.contains('is-tiny')) return { text: d.game.tiny, actions: [] };
    if (!tipDone) return { text: t().tip, actions: [] };
    if (board.zoomable() && !board.isWhole() && !zoomTipDone) return { text: d.game.tipZoom, actions: [] };
    return null;
  }

  /** Draws the field's screen from the state. */
  function render(): void {
    if (!open) return;
    const o = open;
    const rule = MINES.levels[o.level];
    const g = game;
    title.textContent = o.daily ? d.game.daily : d.levels[o.level];
    infoText.textContent = o.daily ? fmt(d.game.dailyInfo, { level: d.levels[o.level], date: dateText(today, 'long') }) : sizeText(o.level, d, lang);
    leftEl.textContent = fmt(t().left, { n: g ? minesLeft(g, rule.mines) : rule.mines });
    renderTime();
    const cells = g?.cells ?? CLOSED_CELL.repeat(rule.width * rule.height);
    const field = g?.field ?? null;
    const known = field ? fieldNumbers(field) : null;
    const lost = !!g && g.boom !== null;
    const hidden = new Set<number>(lost && field ? field.mines : []);
    const wrong = new Set<number>();
    if (field && known && (lost || (settings.wrongFlags && g && playing(g)))) {
      for (let c = 0; c < cells.length; c++) if (cells[c] === FLAG && !known.mines[c]) wrong.add(c);
    }
    const hintSafe = new Set<number>();
    const hintMine = new Set<number>();
    const hintFrom = new Set<number>();
    if (hint?.kind === 'step') {
      hint.step.safe.forEach((c) => hintSafe.add(c));
      hint.step.mines.forEach((c) => hintMine.add(c));
      hint.step.from.forEach((c) => hintFrom.add(c));
    } else if (hint?.kind === 'wrongFlags') hint.cells.forEach((c) => wrong.add(c));
    else if (hint?.kind === 'safe') hintSafe.add(hint.cell);
    const show: BoardShow = { numbers: known?.nums ?? null, hidden, boom: g?.boom ?? null, wrong, hintSafe, hintMine, hintFrom, done: !!g?.done, theme: settings.field };
    board.el.setAttribute('aria-label', fmt(d.game.field, { width: rule.width, height: rule.height }));
    board.render(cells, show, (cell) => {
      const state = cells[cell]!;
      const extra: string[] = [];
      if (g?.boom === cell) extra.push(d.cell.boom);
      if (wrong.has(cell)) extra.push(t().wrongFlag);
      if (hintSafe.has(cell)) extra.push(d.cell.hintSafe);
      if (hintMine.has(cell)) extra.push(t().hintMine);
      if (hintFrom.has(cell)) extra.push(d.cell.hintFrom);
      const shownMine = hidden.has(cell) && state !== FLAG;
      const n = state === OPEN && known && !shownMine ? known.nums[cell]! : null;
      return cellLabel(cell, rule.width, shownMine ? OPEN : state, n, extra, settings.field, lang, d);
    });
    const now = noteNow();
    noteText.textContent = now?.text ?? '';
    noteActions.replaceChildren(
      ...(now?.actions ?? []).map((a) => {
        const b = h('button', { class: a.quiet ? 'btn btn--ghost' : 'btn btn--primary', type: 'button' }, a.label);
        b.addEventListener('click', a.run);
        return b;
      }),
    );
    note.classList.toggle('is-empty', !now);
    playView.classList.toggle('is-done', !!g?.done);
    tools.el.hidden = !!g?.done;
    tools.render(
      {
        mode,
        fresh: !o.daily,
        zoomable: board.zoomable(),
        whole: board.isWhole(),
        hintReady: !!hint && hintFor === g && hint.kind !== 'choose',
        boom: g && g.boom !== null ? settings.afterMine : null,
      },
      d,
    );
    noteByKeys();
  }

  // ---------- moves ----------
  /** Words for a move: cells opened, a flag put or taken off. */
  function moveWords(before: MinesPlay, after: MinesPlay): string {
    let opened = 0;
    let flagsOn = 0;
    let flagsOff = 0;
    for (let c = 0; c < after.cells.length; c++) {
      if (after.cells[c] === OPEN && before.cells[c] !== OPEN) opened++;
      if (after.cells[c] === FLAG && before.cells[c] !== FLAG) flagsOn++;
      if (before.cells[c] === FLAG && after.cells[c] !== FLAG) flagsOff++;
    }
    const parts: string[] = [];
    if (opened) parts.push(plural(lang, opened, d.game.opened, { n: opened }));
    if (flagsOn && !after.done) parts.push(d.game.flagOn);
    if (flagsOff) parts.push(d.game.flagOff);
    return parts.join('. ');
  }

  function commit(next: MinesPlay, words: string | null = null): void {
    if (!game || !open || next === game) {
      render();
      return;
    }
    const before = game;
    // The move that ends the field (cleared, or a mine) stops the clock: its last stretch counts.
    if ((next.done || next.boom !== null) && clockFrom !== null) {
      next = { ...next, ms: next.ms + (performance.now() - clockFrom) };
      clockFrom = null;
    }
    game = next;
    hint = null;
    hintFor = null;
    message = null;
    armedNew = false;
    store.savePlay(game);
    if (game.boom !== null && before.boom === null) {
      // a mine: start over counts the field as played (lost); undoing the move counts a mistake later
      if (settings.afterMine === 'restart') store.saveStats(recordPlayed(store.loadStats(), game.level));
      announce(noteNow()?.text ?? '');
      render();
      return;
    }
    announce(words ?? moveWords(before, game));
    if (settings.vibration && 'vibrate' in navigator && [...game.cells].some((c, i) => c === FLAG && before.cells[i] !== FLAG) && !game.done) {
      navigator.vibrate(MINES.vibrateMs);
    }
    if (game.done) {
      finish();
      return;
    }
    startClock();
    render();
  }

  function say(text: string): void {
    message = text;
    hint = null;
    hintFor = null;
    announce(text);
    render();
  }

  /** The player's first place: the field is made around it, then it opens. */
  function startAround(cell: number): void {
    if (!game || !open || game.field || making) return;
    const forGame = game;
    make(open.level, game.seed, cell, (field) => {
      if (game !== forGame) return;
      commit(withField(forGame, field));
    });
    render();
  }

  /** A tap or a hold on an open number: its other neighbours open when its flags are all there. */
  function aroundOf(cell: number): void {
    if (!game || !settings.chord) return;
    const next = openAround(game, cell);
    if (next !== game) {
      commit(next);
      return;
    }
    const a = aroundNumber(game, cell);
    if (a && a.number > 0 && a.closed.length > 0 && a.flags !== a.number) say(d.game.nothing);
  }

  function act(what: Mode, cell: number): void {
    if (!game || !open || making || !playing(game)) return;
    if (!game.field) {
      if (what === 'open') startAround(cell);
      return;
    }
    const state = game.cells[cell];
    if (state === OPEN) {
      aroundOf(cell);
      return;
    }
    if (what === 'flag') commit(toggleFlag(game, cell));
    else if (state === CLOSED_CELL) commit(openCell(game, cell));
  }

  function onTap(cell: number): void {
    act(mode, cell);
  }

  function onHold(cell: number): void {
    // before the first place a hold chooses it too: only opening makes sense then
    if (game && !game.field) act('open', cell);
    else act(mode === 'open' ? 'flag' : 'open', cell);
  }

  function setMode(next: Mode): void {
    mode = next;
    store.saveMode(next);
    render();
  }

  function restartField(): void {
    if (!game || !game.field) return;
    commit(startOver(game), d.game.restarted);
  }

  function undoBoom(): void {
    if (!game || game.boom === null) return;
    commit(afterMine(game, 'undo'), d.game.undone);
  }

  /** A new ordinary field; one begun counts as played (a second tap confirms). */
  function newField(sure = false): void {
    if (!open || open.daily || !game) return;
    const begun = game.field !== null && !game.done && game.boom === null && started(game);
    if (begun && !sure && !armedNew) {
      armedNew = true;
      say(d.game.newSure);
      return;
    }
    if (begun) store.saveStats(recordPlayed(store.loadStats(), game.level));
    const { level, route } = open;
    store.dropPlay(level, false);
    openField(level, false, route);
  }

  // ---------- zoom ----------
  function viewChanged(): void {
    if (!open) return;
    store.saveWhole(open.level, board.isWhole());
    if (!zoomTipDone && !board.isWhole()) {
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
    if (!game || !open || making || !playing(game)) return;
    // A second press does what the hint shows.
    if (hint && hintFor === game && hint.kind !== 'choose') {
      commit(applyHint(game, hint));
      return;
    }
    const found = findHint(game);
    if (!found) return;
    if (found.kind !== 'choose') {
      game = countHint(game);
      store.savePlay(game);
    }
    hint = found;
    hintFor = game;
    message = null;
    const first = found.kind === 'step' ? (found.step.safe[0] ?? found.step.mines[0]) : found.kind === 'safe' ? found.cell : found.kind === 'wrongFlags' ? found.cells[0] : undefined;
    if (first !== undefined) board.reveal(first);
    render();
    announce(noteText.textContent ?? '');
  }

  // ---------- the end ----------
  function endActions(): NoteAction[] {
    if (!open) return [];
    if (open.daily) return [{ label: d.end.home, run: () => closeRoute('') }];
    return [{ label: d.end.new, run: () => newField(true) }];
  }

  function finish(): void {
    if (!game || !open) return;
    stopClock();
    const g = game;
    const o = open;
    store.saveStats(recordWon(store.loadStats(), g));
    if (o.daily) store.saveDayResult(today, o.level, { hints: g.hints, mistakes: g.mistakes, ms: g.ms });
    if (!tipDone) {
      tipDone = true;
      store.saveTipDone();
    }
    hint = null;
    render();
    const lines: string[] = [];
    if (!g.hints && !g.mistakes) lines.push(d.end.clean);
    else {
      if (g.mistakes) lines.push(fmt(d.end.mistakes, { n: g.mistakes }));
      if (g.hints) lines.push(fmt(d.end.hints, { n: g.hints }));
    }
    if (settings.time) lines.push(fmt(d.end.time, { time: clockText(g.ms) }));
    let share: ShareText | null = null;
    if (o.daily) {
      const n = streak(Object.keys(store.loadDays()), today);
      lines.push(plural(lang, n, d.end.streak, { n }));
      const params = { name: MINES.name, date: dateText(today, 'medium'), level: d.levels[o.level], hints: g.hints, mistakes: g.mistakes };
      const text = g.hints || g.mistakes ? fmt(d.end.share, params) : fmt(d.end.shareClean, params);
      share = { label: d.end.copy, done: d.end.copied, text: MINES.links.game ? `${text}\n${MINES.links.game}` : text };
    }
    endDialog.open({
      title: d.end.title,
      highlight: o.daily ? fmt(d.game.dailyInfo, { level: d.levels[o.level], date: dateText(today, 'long') }) : d.levels[o.level],
      lines,
      share,
      secondary: o.daily ? null : { label: d.end.home, action: () => closeRoute('') },
      primary: o.daily ? { label: d.end.home, action: () => closeRoute('') } : { label: d.end.new, action: () => newField(true) },
    });
  }

  // ---------- menu ----------
  function openMenu(): void {
    const won = Object.entries(store.loadDays())
      .filter(([, byLevel]) => Object.keys(byLevel).length > 0)
      .map(([date]) => date);
    menuDialog.open(
      { d, lang, settings, stats: store.loadStats(), longest: longestStreak(won) },
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
            const { level, daily, route } = open;
            open = null;
            openField(level, daily, route);
          } else show();
        },
      },
    );
  }

  function redraw(): void {
    if (open) renderGame();
    else renderHome();
  }

  // ---------- keys ----------
  document.addEventListener('keydown', (event) => {
    if (!open || menuDialog.el.open || endDialog.el.open) return;
    const ctrl = event.ctrlKey || event.metaKey;
    const letter = letterOf(event);
    if (ctrl && letter === 'z') {
      if (game?.boom !== null && settings.afterMine === 'undo') {
        event.preventDefault();
        undoBoom();
      }
      return;
    }
    if (ctrl || event.altKey) return;
    if (event.key === 'Escape') {
      if (hint || message) {
        hint = null;
        hintFor = null;
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
    if (letter === 'f') act('flag', board.active());
    else if (letter === 'h') askHint();
    else if (letter === 'n') newField();
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

  // Open where the player stopped: the field open last time (with the start screen behind it), else the start.
  const last = store.loadLast();
  if (!currentRoute() && screenOf(last).kind === 'field') restoreRoute('', last);
  else show();
}
