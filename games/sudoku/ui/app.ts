// The game screen: which screen is open (the start or a game), the game in play, the chosen cell and digit,
// the hint being shown; turns taps and keys into moves and draws the result. The rules themselves are in
// ../core (pure functions).
import { localDateKey, streak } from '../../../shared/core/dates.ts';
import { h } from '../../../shared/ui/dom.ts';
import type { ShareText } from '../../../shared/ui/copy.ts';
import { LEVELS, SUDOKU, type Level } from '../config.ts';
import { dailySeed } from '../core/daily.ts';
import {
  addTime,
  applyHint,
  askHint,
  clearCell,
  eraseCells,
  fillNotes,
  isFull,
  isGiven,
  newGame,
  placeDigit,
  redo,
  remaining,
  repeatedCells,
  toggleNote,
  undo,
  wrongCells,
  type Game,
} from '../core/game.ts';
import type { Puzzle } from '../core/generate.ts';
import { CELLS, PEERS, SIZE, UNITS, UNITS_OF, cellName, colOf, digitsOf, parseGrid, rowOf } from '../core/grid.ts';
import { nextHint, type Hint } from '../core/hint.ts';
import { recordSolved } from '../core/stats.ts';
import { createBoardView, type BoardMarks } from './board-view.ts';
import { createEndDialog } from './end-dialog.ts';
import { hintScreen, type HintAction, type HintStage } from './hint-text.ts';
import { homeView, type DailyState } from './home-view.ts';
import { dict, fmt, pickLang, plural, type Dict } from './i18n.ts';
import { backSign } from './icons.ts';
import { keepReady, makeSoon, randomSeed } from './maker.ts';
import { createMenuDialog } from './menu-dialog.ts';
import { createPadView } from './pad-view.ts';
import { closeRoute, currentRoute, openRoute, watchRoute } from './route.ts';
import { playSound, type SoundKind } from './sound.ts';
import * as store from './storage.ts';
import type { Settings, Slot } from './storage.ts';
import { clockText } from './time.ts';
import { createToolsView } from './tools-view.ts';

/** How long a finished row, column or box lights up, ms (the same value drives the CSS animation). */
const FLASH_MS = 600;
/** Vibration patterns, ms: a digit placed, a unit finished, the puzzle solved. */
const BUZZ = { place: 12, unit: [20, 40, 20], solved: [30, 60, 30, 60, 60] } as const;
/** How often the shown time is updated, ms. */
const TICK_MS = 1000;

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const routeOf = (slot: Slot): string => `${slot.daily ? 'daily' : 'play'}-${slot.level}`;

function slotOf(route: string): Slot | null {
  const [kind, level] = route.split('-');
  if ((kind !== 'play' && kind !== 'daily') || !LEVELS.includes(level as Level)) return null;
  return { daily: kind === 'daily', level: level as Level };
}

/** A latin letter key whatever the keyboard layout (N for notes, H for hint). */
function letterOf(event: KeyboardEvent): string {
  return event.code.startsWith('Key') ? event.code.slice(3).toLowerCase() : '';
}

function digitOf(event: KeyboardEvent): number | null {
  const m = /^(?:Digit|Numpad)([0-9])$/.exec(event.code);
  return m ? Number(m[1]) : null;
}

export function startApp(root: HTMLElement): void {
  let settings: Settings = store.loadSettings();
  let lang = pickLang(settings.lang, navigator.languages ?? [navigator.language]);
  let d: Dict = dict(lang);
  let today = localDateKey(new Date());

  /** The open game's place; null — the start screen. */
  let slot: Slot | null = null;
  let game: Game | null = null;
  /** Stops the puzzle being made, if one is. */
  let stopMaking: (() => void) | null = null;
  let selected: number | null = null;
  /** "Digit first": the digit that goes into every tapped cell. */
  let held: number | null = null;
  let notesMode = false;
  let hint: Hint | null = null;
  let hintStage: HintStage = 'where';
  /** The board is full with mistakes and the player asked to see them. */
  let showMistakes = false;
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
  const board = createBoardView(onCell);
  board.el.style.setProperty('--flash-ms', `${FLASH_MS}ms`);
  const preparing = h('p', { class: 'board-wait', role: 'status' });
  const boardWrap = h('div', { class: 'board-wrap' }, board.el, preparing);
  const noteText = h('span', {});
  const noteBtn = h('button', { class: 'btn btn--ghost', type: 'button' });
  /** What the button under the board does now: show the mistakes, or go on after the puzzle is solved. */
  let noteAction: (() => void) | null = null;
  noteBtn.addEventListener('click', () => noteAction?.());
  const note = h('p', { class: 'board-note' }, noteText, noteBtn);
  const tools = createToolsView({ undo: takeBack, redo: putBack, notes: switchNotes, hint: openHint, fill: fillAll });
  const pad = createPadView(onDigit, onErase);
  const hintTitle = h('h2', { class: 'hint__title', tabindex: -1 });
  const hintCounter = h('p', { class: 'hint__counter' });
  const hintText = h('p', { class: 'hint__text' });
  const hintGo = h('button', { class: 'btn btn--primary', type: 'button' });
  const hintClose = h('button', { class: 'btn btn--ghost', type: 'button' });
  const hintPanel = h(
    'section',
    { class: 'hint', 'aria-labelledby': 'hint-title' },
    h('div', { class: 'hint__head' }, hintTitle, hintCounter),
    hintText,
    h('div', { class: 'hint__actions' }, hintClose, hintGo),
  );
  hintTitle.id = 'hint-title';
  const controls = h('div', { class: 'controls' }, tools.el, pad.el, hintPanel);
  const stage = h('div', { class: 'stage' }, boardWrap);
  const playView = h('div', { class: 'play' }, info, stage, note, controls);

  backBtn.addEventListener('click', closeRoute);
  menuBtn.addEventListener('click', openMenu);
  hintClose.addEventListener('click', closeHint);
  hintGo.addEventListener('click', () => {
    const action = hintGo.dataset.action as HintAction | undefined;
    if (action) runHint(action);
  });

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
    hintClose.textContent = d.app.close;
    board.el.setAttribute('aria-label', d.game.board);
  }

  const dateText = (dateKey: string, style: 'long' | 'medium') =>
    new Intl.DateTimeFormat(lang, style === 'long' ? { day: 'numeric', month: 'long' } : { dateStyle: 'medium' }).format(
      new Date(`${dateKey}T12:00:00`),
    );

  const digitName = (n: number) => d.digits[String(n) as keyof Dict['digits']];

  function announce(text: string): void {
    live.textContent = text;
  }

  function feedback(kind: SoundKind): void {
    if (settings.sound) playSound(kind);
    if (settings.vibration && 'vibrate' in navigator) navigator.vibrate(BUZZ[kind] as number | number[]);
  }

  // ---------- screens ----------
  function show(): void {
    const next = slotOf(currentRoute());
    if (!next) {
      leaveGame();
      store.saveLast(null);
      renderHome();
      return;
    }
    if (!slot || slot.daily !== next.daily || slot.level !== next.level || !game) openSlot(next);
    else render();
  }

  function leaveGame(): void {
    stopClock();
    stopMaking?.();
    stopMaking = null;
    slot = null;
    game = null;
    hint = null;
  }

  function openSlot(next: Slot): void {
    leaveGame();
    slot = next;
    store.saveLast(next);
    selected = null;
    held = null;
    notesMode = false;
    showMistakes = false;
    const saved = store.loadGame(next, today);
    if (saved && (next.daily || !saved.solved)) {
      begin(saved);
      return;
    }
    if (!next.daily) {
      const ready = store.loadReady(next.level);
      if (ready) {
        store.dropReady(next.level);
        begin(newGame(ready));
        refillReady();
        return;
      }
    }
    // Make the puzzle now: today's daily from its date, or a new one.
    const forSlot = next;
    const seed = next.daily ? dailySeed(today, next.level) : randomSeed();
    renderGame();
    stopMaking = makeSoon(seed, next.level, (puzzle: Puzzle) => {
      stopMaking = null;
      if (slot !== forSlot) return;
      begin(newGame(puzzle, forSlot.daily ? today : null));
    });
  }

  function begin(g: Game): void {
    game = g;
    if (slot) store.saveGame(slot, g);
    startClock();
    renderGame();
    title.focus();
  }

  function refillReady(): void {
    keepReady((level) => (store.loadReady(level) ? 1 : 0), store.saveReady);
  }

  // ---------- time ----------
  function startClock(): void {
    if (game && !game.solved && slot && document.visibilityState === 'visible' && clockFrom === null) clockFrom = performance.now();
  }

  function stopClock(): void {
    if (clockFrom === null || !game || !slot) return;
    game = addTime(game, performance.now() - clockFrom);
    clockFrom = null;
    store.saveGame(slot, game);
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
    if (slot && settings.time) renderTime();
  }, TICK_MS);

  // ---------- drawing ----------
  function renderHome(): void {
    applyLook();
    backBtn.hidden = true;
    title.textContent = d.app.name;
    const started = new Set(
      LEVELS.filter((level) => {
        const g = store.loadGame({ daily: false, level }, today);
        return !!g && !g.solved;
      }),
    );
    const days = store.loadDays();
    const daily = Object.fromEntries(
      LEVELS.map((level): [Level, DailyState] => {
        const g = store.loadGame({ daily: true, level }, today);
        const state: DailyState = days[today]?.[level] || g?.solved ? 'solved' : g ? 'started' : 'new';
        return [level, state];
      }),
    ) as Record<Level, DailyState>;
    const played = Object.keys(days).filter((date) => Object.keys(days[date] ?? {}).length > 0);
    content.replaceChildren(
      homeView({ started, daily, date: dateText(today, 'long'), streak: streak(played, today) }, d, lang, (s) => openRoute(routeOf(s))),
    );
  }

  function renderGame(): void {
    applyLook();
    backBtn.hidden = false;
    if (!slot) return;
    title.textContent = d.levels[slot.level];
    if (content.firstChild !== playView) content.replaceChildren(playView);
    render();
  }

  function badCells(g: Game): Set<number> {
    if (showMistakes || settings.errors === 'solution') return new Set(wrongCells(g));
    if (settings.errors === 'repeats') return new Set(repeatedCells(g));
    return new Set();
  }

  /** The cell's name: where it is and what it shows (a hint may show candidates in place of the notes). */
  function cellLabel(g: Game, bad: Set<number>, shown: ReadonlyMap<number, number> | null, cell: number): string {
    const { row, col } = cellName(cell);
    const digit = g.digits[cell]!;
    let text: string;
    if (!digit) {
      const notes = digitsOf(shown?.get(cell) ?? g.notes[cell]!);
      // The notes as they are seen, digit after digit (a list with "and" would not match what is on the screen).
      text = notes.length ? fmt(d.game.cellNotes, { numbers: notes.join(' ') }) : d.game.cellEmpty;
    } else if (isGiven(g, cell)) text = fmt(d.game.cellGiven, { number: digit });
    else if (bad.has(cell)) text = fmt(showMistakes || settings.errors === 'solution' ? d.game.cellWrong : d.game.cellRepeat, { number: digit });
    else text = String(digit);
    return fmt(d.game.cell, { row, col, content: text });
  }

  /** Draws the game screen from the state. */
  function render(): void {
    if (!slot) return;
    const g = game;
    info.hidden = !slot.daily && !settings.time;
    infoText.textContent = slot.daily ? fmt(d.game.dailyTitle, { date: dateText(today, 'long') }) : '';
    renderTime();
    preparing.textContent = g ? '' : d.game.preparing;
    preparing.hidden = !!g;
    boardWrap.classList.toggle('is-waiting', !g);
    if (!g) {
      note.hidden = true;
      controls.hidden = true;
      return;
    }
    controls.hidden = false;

    const screen = hint ? hintScreen(hint, hintStage, g, d, lang) : null;
    const bad = badCells(g);
    const sameDigit = held ?? (selected !== null ? g.digits[selected]! : 0);
    const marks: BoardMarks = {
      // While a hint is shown its own frames speak; the chosen cell's frame would look like one of them.
      selected: screen ? null : selected,
      peers: settings.peers && selected !== null && !screen ? new Set([...PEERS[selected]!]) : new Set(),
      same: settings.same && !screen ? sameDigit : 0,
      bad,
      hint: screen?.marks ?? null,
    };
    board.render(g, marks, (cell) => cellLabel(g, bad, screen?.marks.cands ?? null, cell));

    // Under the board: how to place a digit (until the first one), a full board with mistakes, or the end.
    const fullWrong = isFull(g) && !g.solved;
    const s = slot;
    if (g.solved) {
      noteText.textContent = d.end.title;
      noteBtn.textContent = s.daily ? d.end.home : d.end.newGame;
      noteAction = s.daily ? closeRoute : () => newPuzzle(s);
    } else if (fullWrong) {
      noteText.textContent = d.game.fullWithMistakes;
      noteBtn.textContent = d.game.showMistakes;
      noteAction = () => {
        showMistakes = true;
        render();
      };
    } else {
      noteText.textContent = tipText();
      noteAction = null;
    }
    noteBtn.hidden = !noteAction || (fullWrong && (showMistakes || settings.errors === 'solution'));
    note.hidden = !(g.solved || fullWrong || !tipDone);

    tools.el.hidden = !!screen || g.solved;
    pad.el.hidden = !!screen || g.solved;
    hintPanel.hidden = !screen;
    tools.render({ canUndo: g.undo.length > 0 && !g.solved, canRedo: g.redo.length > 0 && !g.solved, notes: notesMode, fill: settings.fillButton }, d);
    pad.render({ left: settings.counts ? remaining(g) : null, held: settings.input === 'digit' ? held : null, digitFirst: settings.input === 'digit' }, d, lang);
    if (screen) {
      hintTitle.textContent = screen.title;
      hintCounter.textContent = screen.counter ?? '';
      hintCounter.hidden = !screen.counter;
      hintText.textContent = screen.text;
      hintGo.dataset.action = screen.action;
      hintGo.textContent = { explain: d.hint.explain, next: d.hint.next, place: d.hint.place, erase: d.hint.erase }[screen.action];
    }
  }

  // ---------- moves ----------
  const options = () => ({ autoNotes: settings.autoNotes });

  /** Units (row, column, box) that a move completed: full, every digit once. */
  function finishedUnits(before: Game, after: Game, cell: number): number[] {
    return UNITS_OF[cell]!.filter((u) => {
      const cells = UNITS[u]!.cells;
      const full = (g: Game) => cells.every((c) => g.digits[c]);
      const digits = new Set(cells.map((c) => after.digits[c]));
      return !full(before) && full(after) && digits.size === SIZE;
    });
  }

  function commit(next: Game, cell: number | null): void {
    if (!game || !slot || next === game) return;
    const before = game;
    // The move that solves the puzzle stops the clock: its last stretch counts (a solved game takes no time).
    if (next.solved && clockFrom !== null) {
      next = { ...next, ms: next.ms + (performance.now() - clockFrom) };
      clockFrom = null;
    }
    game = next;
    hint = null;
    showMistakes = false;
    store.saveGame(slot, game);
    if (!tipDone && game.digits.some((digit, c) => digit && !isGiven(game!, c))) {
      tipDone = true;
      store.saveTipDone();
    }
    if (game.solved) {
      finish();
      return;
    }
    if (cell !== null && game.digits[cell] && game.digits[cell] !== before.digits[cell]) {
      const units = finishedUnits(before, game, cell);
      if (units.length) {
        feedback('unit');
        if (!reducedMotion()) board.flash(units.flatMap((u) => UNITS[u]!.cells));
        const names = units.map((u) => fmt(d.place[UNITS[u]!.kind], { n: UNITS[u]!.index + 1 }));
        announce(fmt(d.game.placedDone, { number: game.digits[cell]!, ...cellName(cell), place: new Intl.ListFormat(lang).format(names) }));
      } else feedback('place');
    }
    render();
  }

  function enter(cell: number, digit: number): void {
    if (!game || game.solved || isGiven(game, cell)) return;
    if (notesMode && !game.digits[cell]) {
      const had = (game.notes[cell]! & (1 << (digit - 1))) !== 0;
      commit(toggleNote(game, cell, digit), null);
      announce(fmt(had ? d.game.noteRemoved : d.game.noteAdded, { number: digit }));
      return;
    }
    if (game.digits[cell] === digit) {
      commit(clearCell(game, cell), null);
      announce(fmt(d.game.erased, cellName(cell)));
      return;
    }
    announce(fmt(d.game.placed, { number: digit, ...cellName(cell) }));
    commit(placeDigit(game, cell, digit, options()), cell);
  }

  function onCell(cell: number): void {
    if (!game) return;
    selected = cell;
    if (settings.input === 'digit' && held !== null && !hint) enter(cell, held);
    render();
  }

  function onDigit(digit: number): void {
    if (!game || game.solved) return;
    if (settings.input === 'digit') {
      held = held === digit ? null : digit;
      render();
      return;
    }
    if (selected !== null) enter(selected, digit);
  }

  function onErase(): void {
    if (!game || selected === null) return;
    const next = clearCell(game, selected);
    if (next !== game) announce(fmt(d.game.erased, cellName(selected)));
    commit(next, null);
  }

  function takeBack(): void {
    if (!game) return;
    const next = undo(game);
    if (next === game) announce(d.game.nothingToUndo);
    commit(next, null);
  }

  function putBack(): void {
    if (!game) return;
    const next = redo(game);
    if (next === game) announce(d.game.nothingToRedo);
    commit(next, null);
  }

  function switchNotes(): void {
    notesMode = !notesMode;
    render();
  }

  function fillAll(): void {
    if (game) commit(fillNotes(game), null);
  }

  // ---------- hints ----------
  function openHint(): void {
    if (!game || !slot || game.solved) return;
    const found = nextHint(game.digits, parseGrid(game.solution));
    if (!found) return;
    game = askHint(game);
    store.saveGame(slot, game);
    hint = found;
    hintStage = 'where';
    render();
    hintTitle.focus();
  }

  function closeHint(): void {
    hint = null;
    render();
    tools.el.querySelectorAll<HTMLButtonElement>('.tool')[3]?.focus();
  }

  function runHint(action: HintAction): void {
    if (!game || !hint) return;
    if (action === 'explain') hintStage = 0;
    else if (action === 'next') hintStage = typeof hintStage === 'number' ? hintStage + 1 : 0;
    else if (action === 'erase' && hint.kind === 'mistakes') {
      commit(eraseCells(game, hint.cells), null);
      return;
    } else if (action === 'place') {
      const target = hint.kind === 'reveal' ? { cell: hint.cell, digit: hint.digit } : hint.kind === 'steps' ? hint.steps.at(-1)!.place! : null;
      if (!target) return;
      const removals = hint.kind === 'steps' ? hint.steps.slice(0, -1).flatMap((s) => s.eliminate) : [];
      selected = target.cell;
      announce(fmt(d.game.placed, { number: target.digit, ...cellName(target.cell) }));
      commit(applyHint(game, removals, target.cell, target.digit, options()), target.cell);
      board.focus(target.cell);
      return;
    }
    render();
    hintTitle.focus();
  }

  // ---------- the end ----------
  function finish(): void {
    if (!game || !slot) return;
    stopClock();
    const g = game;
    const s = slot;
    store.saveStats(recordSolved(store.loadStats(), g));
    if (s.daily) store.saveDayResult(today, s.level, { hints: g.hints, ms: g.ms });
    feedback('solved');
    // The solved board without the chosen cell and its highlights.
    selected = null;
    held = null;
    notesMode = false;
    if (!reducedMotion()) board.flash(Array.from({ length: CELLS }, (_, c) => c));
    render();
    const lines = [g.hints ? plural(lang, g.hints, d.end.hints, { n: g.hints }) : d.end.clean];
    if (settings.time) lines.push(fmt(d.end.time, { time: clockText(g.ms) }));
    let share: ShareText | null = null;
    if (s.daily) {
      const days = store.loadDays();
      const played = Object.keys(days).filter((date) => Object.keys(days[date] ?? {}).length > 0);
      const n = streak(played, today);
      lines.push(plural(lang, n, d.end.streak, { n }));
      const shareParams = { name: SUDOKU.name, date: dateText(today, 'medium'), level: d.levels[s.level], n: g.hints };
      const text = g.hints ? plural(lang, g.hints, d.end.shareHints, shareParams) : fmt(d.end.shareClean, shareParams);
      share = { label: d.end.copy, done: d.end.copied, text: SUDOKU.links.game ? `${text}\n${SUDOKU.links.game}` : text };
    }
    const home = { label: d.end.home, action: closeRoute };
    window.setTimeout(
      () =>
        endDialog.open({
          title: d.end.title,
          highlight: s.daily ? fmt(d.game.dailyTitle, { date: dateText(today, 'long') }) : fmt(d.end.level, { level: d.levels[s.level] }),
          lines,
          share,
          secondary: s.daily ? null : home,
          primary: s.daily ? home : { label: d.end.newGame, action: () => newPuzzle(s) },
        }),
      reducedMotion() ? 0 : FLASH_MS,
    );
  }

  function newPuzzle(s: Slot): void {
    if (s.daily) return;
    store.dropGame(s);
    if (slot && slot.level === s.level && !slot.daily) {
      slot = null;
      openSlot(s);
    } else openRoute(routeOf(s));
  }

  // ---------- menu ----------
  function tipText(): string {
    return settings.input === 'digit' ? d.game.tipDigit : d.game.tipCell;
  }

  function openMenu(): void {
    const ordinary = slot && !slot.daily ? slot : null;
    menuDialog.open(
      { d, lang, settings, stats: store.loadStats(), tip: tipText() },
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
          if (patch.input) held = null;
          redraw();
        },
        newPuzzle: ordinary ? () => newPuzzle(ordinary) : null,
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
    if (!game || !slot || menuDialog.el.open || endDialog.el.open) return;
    const ctrl = event.ctrlKey || event.metaKey;
    const letter = letterOf(event);
    if (ctrl && letter === 'z') {
      event.preventDefault();
      if (event.shiftKey) putBack();
      else takeBack();
      return;
    }
    if (ctrl && letter === 'y') {
      event.preventDefault();
      putBack();
      return;
    }
    if (ctrl || event.altKey) return;
    if (event.key === 'Escape') {
      if (hint) closeHint();
      else if (held !== null) {
        held = null;
        render();
      }
      return;
    }
    if (hint) return; // the hint panel has its own buttons
    const moves: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    const move = moves[event.key];
    if (move) {
      event.preventDefault();
      const from = selected ?? Math.floor(CELLS / 2);
      const r = Math.min(SIZE - 1, Math.max(0, rowOf(from) + (selected === null ? 0 : move[0])));
      const c = Math.min(SIZE - 1, Math.max(0, colOf(from) + (selected === null ? 0 : move[1])));
      selected = r * SIZE + c;
      render();
      board.focus(selected);
      return;
    }
    const digit = digitOf(event);
    if (digit !== null && selected !== null) {
      event.preventDefault();
      if (digit === 0) onErase();
      else enter(selected, digit);
      return;
    }
    if ((event.key === 'Backspace' || event.key === 'Delete') && selected !== null) {
      event.preventDefault();
      onErase();
      return;
    }
    if (letter === 'n') switchNotes();
    else if (letter === 'h') openHint();
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
      if (slot?.daily) {
        const s = slot;
        slot = null;
        openSlot(s);
        return;
      }
      if (!slot) renderHome();
    }
    startClock();
  });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyLook);
  watchRoute(show);

  // Open where the player stopped: the game open last time, else the start screen.
  const last = store.loadLast();
  if (!slotOf(currentRoute()) && last) openRoute(routeOf(last));
  else show();
  refillReady();
}
