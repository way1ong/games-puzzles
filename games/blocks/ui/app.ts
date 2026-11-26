// The game screen: holds the current game and the player's choices, draws everything and turns presses,
// drags and keys into moves. The rules themselves are in ../core (pure functions).
import { BLOCKS } from '../config.ts';
import { canPlace, fullLines, place as placeOnBoard } from '../core/board.ts';
import { localDateKey, streak } from '../../../shared/core/dates.ts';
import { setTextures } from '../../../shared/ui/textures.ts';
import { dailySeed } from '../core/daily.ts';
import { MODES, newGame, placePiece, shapeCode, turnPiece, undo, type GameState, type Mode } from '../core/game.ts';
import type { Cells } from '../core/shapes.ts';
import { createBoardView, type BoardView, type Preview } from './board-view.ts';
import { copyControl, type ShareText } from '../../../shared/ui/copy.ts';
import { h } from '../../../shared/ui/dom.ts';
import { attachDrag } from './drag.ts';
import { createEndDialog } from './end-dialog.ts';
import { dict, fmt, num, pickLang, plural, type Dict } from './i18n.ts';
import { createMenuDialog } from './menu-dialog.ts';
import { pieceElement, pieceSize } from './piece-view.ts';
import * as store from './storage.ts';
import { TEXTURES } from './textures.ts';
import { createTray, renderTray, type TraySlot } from './tray-view.ts';

/** How long cleared lines light up, ms (the same value drives the CSS animation). */
const FLASH_MS = 420;
/** Tray: inner padding of a slot and gap between cells, px; a tray cell is at most this part of a board cell. */
const TRAY_PAD = 6;
const TRAY_GAP = 2;
const TRAY_SCALE = { normal: 0.55, big: 0.7 };
/** A finger hides what it holds: a dragged piece floats this many board cells above the touch point. */
const TOUCH_LIFT_CELLS = 1;

function randomSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] ?? Date.now() >>> 0;
}

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** A letter key that works with any keyboard layout (Latin letters as typed, otherwise the key's place). */
function letterOf(event: KeyboardEvent): string {
  if (/^[a-z]$/i.test(event.key)) return event.key.toLowerCase();
  return event.code.startsWith('Key') ? event.code.slice(3).toLowerCase() : '';
}

function digitOf(event: KeyboardEvent): number | null {
  if (/^[1-9]$/.test(event.key)) return Number(event.key);
  return /^(Digit|Numpad)[1-9]$/.test(event.code) ? Number(event.code.slice(-1)) : null;
}

export function startApp(root: HTMLElement): void {
  let settings = store.loadSettings();
  let lang = pickLang(settings.lang, navigator.languages ?? [navigator.language]);
  let d: Dict = dict(lang);
  let mode: Mode = store.loadMode() ?? 'classic';
  let today = localDateKey(new Date());
  let game = load(mode);
  let hintDone = store.loadHintDone();
  /** Tray slot chosen by a tap or a key (placing without dragging). */
  let selected: number | null = null;
  /** Where the chosen piece would go (its top-left cell), and the cell tapped last to put it there. */
  let target: { row: number; col: number } | null = null;
  let tapCell: { row: number; col: number } | null = null;
  let drag: { slot: number; floating: HTMLElement; row: number; col: number } | null = null;
  let flash = new Set<number>();
  let noteKey = '';

  function load(m: Mode): GameState {
    if (m === 'daily') return store.loadGame('daily', today) ?? newGame('daily', dailySeed(today));
    return store.loadGame(m, today) ?? newGame(m, randomSeed());
  }

  // ---------- elements (built again when the language changes) ----------
  let board: BoardView;
  let slots: TraySlot[] = [];
  let note: HTMLElement;
  let stats: HTMLElement;
  let undoBtn: HTMLButtonElement;
  let newBtn: HTMLButtonElement;
  let actions: HTMLElement;
  let modeBtns: HTMLButtonElement[] = [];
  let modeNote: HTMLElement;
  const live = h('p', { class: 'visually-hidden', 'aria-live': 'polite' });
  const endDialog = createEndDialog();
  const menuDialog = createMenuDialog();

  function build(): void {
    document.documentElement.lang = lang;
    document.title = d.meta.title;
    document.querySelector('meta[name="description"]')?.setAttribute('content', d.meta.description);
    document.documentElement.classList.toggle('big', settings.big);
    document.documentElement.classList.toggle('drawn', settings.look === 'drawn');
    setTextures(document.documentElement, TEXTURES);

    const menuBtn = h(
      'button',
      { class: 'icon-btn', type: 'button', 'aria-label': d.app.menu },
      h('span', { class: 'icon-menu', 'aria-hidden': 'true' }),
    );
    menuBtn.addEventListener('click', openMenu);

    // What the chosen mode allows: e.g. that pieces turn only in the calm mode.
    modeNote = h('p', { class: 'mode-note', 'aria-live': 'polite' });
    modeBtns = MODES.map((m) => {
      const b = h('button', { class: 'seg__btn', type: 'button' }, d.modes[m]);
      b.addEventListener('click', () => switchMode(m));
      return b;
    });

    stats = h('div', { class: 'stats' });
    board = createBoardView(game.size, boardLabel());
    board.el.style.setProperty('--flash-ms', `${FLASH_MS}ms`);
    board.el.addEventListener('click', onBoardClick);
    note = h('div', { class: 'board-note', hidden: true });
    noteKey = '';

    const tray = createTray(BLOCKS.piecesPerRound, d.app.tray);
    slots = tray.slots;
    slots.forEach((slot, i) => {
      attachDrag(slot.grab, {
        onStart: (e) => startDrag(i, e),
        onMove: (e) => moveDrag(e),
        onDrop: () => dropDrag(),
        onCancel: () => endDrag(),
        onTap: () => selectSlot(selected === i ? null : i),
      });
      slot.grab.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        e.stopPropagation();
        if (selected === i && target) placeFrom(i, target.row, target.col);
        else selectSlot(i);
      });
      slot.turn.addEventListener('click', () => turn(i));
    });

    undoBtn = h('button', { class: 'btn btn--ghost', type: 'button' }, d.actions.undo);
    undoBtn.addEventListener('click', takeBack);
    newBtn = h('button', { class: 'btn btn--ghost', type: 'button' }, d.actions.newGame);
    newBtn.addEventListener('click', restart);
    actions = h('div', { class: 'actions' }, undoBtn, newBtn);

    root.replaceChildren(
      h(
        'main',
        { class: 'app' },
        h('header', { class: 'top' }, h('h1', { class: 'top__name' }, d.app.name), menuBtn),
        h('nav', { class: 'seg', 'aria-label': d.modes.label }, ...modeBtns),
        modeNote,
        h('div', { class: 'stage' }, stats, h('div', { class: 'board-wrap' }, board.el, note)),
        tray.el,
        actions,
        live,
        endDialog.el,
        menuDialog.el,
      ),
    );
    updateThemeColor();
    render();
  }

  // ---------- drawing ----------
  function previewAt(slot: number, row: number, col: number): Preview | null {
    const piece = game.tray[slot];
    if (!piece) return null;
    const code = shapeCode(piece.shape);
    const ok = canPlace(game.board, game.size, piece.cells, row, col);
    let rows: number[] = [];
    let cols: number[] = [];
    if (ok) ({ rows, cols } = fullLines(placeOnBoard(game.board, game.size, piece.cells, row, col, code), game.size));
    return { cells: piece.cells, code, row, col, ok, rows, cols };
  }

  /**
   * Cell size of a piece in the tray: a part of a board cell, smaller only when a long piece needs it to fit
   * its slot (the slot's size comes from the layout, not from the piece).
   */
  function trayCell(cells: Cells): number {
    const { rows, cols } = pieceSize(cells);
    const span = Math.max(rows, cols);
    const grab = slots[0]?.grab;
    const room = grab ? Math.min(grab.clientWidth, grab.clientHeight) : 0;
    const fit = (room - 2 * TRAY_PAD - (span - 1) * TRAY_GAP) / span;
    const cap = board.geometry().step * (settings.big ? TRAY_SCALE.big : TRAY_SCALE.normal);
    return Math.max(4, Math.floor(Math.min(fit, cap)));
  }

  function stat(label: string, value: string): HTMLElement {
    return h(
      'p',
      { class: 'stat' },
      h('span', { class: 'stat__label' }, label),
      h('span', { class: 'stat__value' }, value),
    );
  }

  function renderStats(): void {
    const items = [stat(d.app.score, num(lang, game.score))];
    if (mode === 'daily') {
      const round = Math.min(game.round, BLOCKS.dailyRounds);
      items.push(stat(d.app.round, fmt(d.app.roundOf, { n: num(lang, round), total: num(lang, BLOCKS.dailyRounds) })));
      items.push(stat(d.app.streak, num(lang, streak(Object.keys(store.loadDaily()), today))));
    } else {
      items.push(stat(d.app.best, num(lang, Math.max(store.loadBest(mode), game.score))));
    }
    stats.replaceChildren(...items);
  }

  /** A note over the board: how to play (until the first piece ever), or why the game has ended. */
  function renderNote(): void {
    const showHint = !game.end && !hintDone && drag === null && selected === null;
    const key = game.end ? `end:${mode}:${game.end}` : showHint ? 'hint' : '';
    // Shown or not is decided every time; the content is rebuilt only when it changes.
    note.hidden = key === '';
    if (key === noteKey) return;
    noteKey = key;
    note.classList.toggle('board-note--hint', showHint);
    if (showHint) {
      note.replaceChildren(h('p', {}, d.app.hint));
    } else if (game.end && mode === 'daily') {
      const copy = copyControl(dailyShare());
      note.replaceChildren(
        h('p', { class: 'board-note__title' }, endTitle()),
        h('p', {}, d.end.playedToday),
        copy.button,
        copy.out,
      );
    } else if (game.end) {
      const again = h('button', { class: 'btn btn--primary', type: 'button' }, d.actions.newGame);
      again.addEventListener('click', restart);
      note.replaceChildren(h('p', { class: 'board-note__title' }, endTitle()), again);
    } else {
      note.replaceChildren();
    }
  }

  /** The board for screen readers: how full it is. */
  function boardLabel(): string {
    const total = game.size * game.size;
    const filled = game.board.filter((v) => v > 0).length;
    return plural(lang, filled, d.app.boardState, { filled: num(lang, filled), total: num(lang, total) });
  }

  function pieceLabel(n: number, cells: number): string {
    return plural(lang, cells, d.app.piece, { n: num(lang, n), cells: num(lang, cells) });
  }

  /** Where the chosen piece would go, for players who move it with keys and listen. */
  function announceTarget(withPiece: boolean): void {
    const piece = selected === null ? null : game.tray[selected];
    if (selected === null || !piece || !target) return;
    const fits = canPlace(game.board, game.size, piece.cells, target.row, target.col);
    const where = fmt(fits ? d.announce.positionOk : d.announce.positionBad, {
      row: num(lang, target.row + 1),
      col: num(lang, target.col + 1),
    });
    announce(withPiece ? `${pieceLabel(selected + 1, piece.cells.length)}. ${where}` : where);
  }

  function render(): void {
    modeBtns.forEach((b, i) => b.setAttribute('aria-pressed', String(MODES[i] === mode)));
    modeNote.textContent =
      mode === 'daily'
        ? plural(lang, BLOCKS.dailyRounds, d.modeInfo.daily, { rounds: num(lang, BLOCKS.dailyRounds) })
        : d.modeInfo[mode];
    renderStats();
    const preview = drag
      ? previewAt(drag.slot, drag.row, drag.col)
      : selected !== null && target
        ? previewAt(selected, target.row, target.col)
        : null;
    board.render(game.board, preview, flash);
    board.el.setAttribute('aria-label', boardLabel());
    renderNote();
    renderTray(slots, game.tray, {
      cellPx: trayCell,
      gapPx: TRAY_GAP,
      selected,
      canTurn: mode === 'calm' && !game.end,
      pieceLabel,
      turnLabel: (n) => fmt(d.actions.turnPiece, { n }),
      turnText: d.actions.turn,
    });
    slots.forEach((slot, i) => slot.el.classList.toggle('is-dragging', drag?.slot === i));
    undoBtn.hidden = mode !== 'calm' || game.history.length === 0;
    newBtn.hidden = mode === 'daily' || game.end !== null;
    actions.hidden = undoBtn.hidden && newBtn.hidden;
  }

  function updateThemeColor(): void {
    const bg = getComputedStyle(document.body).backgroundColor;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg);
  }

  // ---------- moves ----------
  function save(): void {
    store.saveGame(mode, game, today);
  }

  function announce(text: string): void {
    live.textContent = text;
  }

  function vibrate(pattern: number | number[]): void {
    if (settings.vibration && 'vibrate' in navigator) navigator.vibrate(pattern);
  }

  function clearChoice(): void {
    selected = null;
    target = null;
    tapCell = null;
  }

  function placeFrom(slot: number, row: number, col: number): void {
    const move = placePiece(game, slot, row, col);
    if (!move) {
      announce(d.announce.cannot);
      return;
    }
    const focusWasInTray = slots.some((s) => s.grab === document.activeElement);
    game = move.state;
    clearChoice();
    if (!hintDone) {
      hintDone = true;
      store.saveHintDone();
    }
    const lines = move.rows.length + move.cols.length;
    const parts = [plural(lang, move.points, d.announce.points, { points: num(lang, move.points) })];
    if (lines > 0) parts.push(plural(lang, lines, d.announce.lines, { lines: num(lang, lines) }));
    announce(parts.join('. '));
    vibrate(lines > 0 ? [20, 40, 20] : 12);
    if (lines > 0 && !reducedMotion()) {
      flash = new Set<number>();
      for (const r of move.rows) for (let c = 0; c < game.size; c++) flash.add(r * game.size + c);
      for (const c of move.cols) for (let r = 0; r < game.size; r++) flash.add(r * game.size + c);
      window.setTimeout(() => {
        flash = new Set();
        render();
      }, FLASH_MS);
    }
    save();
    if (game.end) finish();
    render();
    if (focusWasInTray) slots.find((_, i) => game.tray[i])?.grab.focus();
  }

  function endTitle(): string {
    return game.end === 'completed' ? d.end.completed : d.end.stuck;
  }

  function dailyShare(): ShareText {
    const score = store.loadDaily()[today] ?? game.score;
    const date = new Intl.DateTimeFormat(lang, { dateStyle: 'medium' }).format(new Date(`${today}T12:00:00`));
    const text = plural(lang, score, d.end.shareText, { name: BLOCKS.name, date, score: num(lang, score) });
    return { label: d.end.copy, done: d.end.copied, text: BLOCKS.links.game ? `${text}\n${BLOCKS.links.game}` : text };
  }

  function finish(): void {
    if (mode === 'daily') {
      store.saveDailyResult(today, game.score);
      const days = streak(Object.keys(store.loadDaily()), today);
      endDialog.open({
        title: endTitle(),
        highlight: null,
        lines: [
          fmt(d.end.score, { score: num(lang, game.score) }),
          plural(lang, days, d.end.streak, { n: num(lang, days) }),
          d.end.playedToday,
        ],
        share: dailyShare(),
        secondary: null,
        primary: { label: d.actions.close, action: () => undefined },
        update: d.update,
      });
      return;
    }
    const best = store.loadBest(mode);
    const isBest = game.score > best;
    if (isBest) store.saveBest(mode, game.score);
    endDialog.open({
      title: endTitle(),
      highlight: isBest && game.score > 0 ? d.end.newBest : null,
      lines: [
        fmt(d.end.score, { score: num(lang, game.score) }),
        fmt(d.end.best, { best: num(lang, Math.max(best, game.score)) }),
      ],
      share: null,
      secondary: { label: d.actions.close, action: () => undefined },
      primary: { label: d.actions.newGame, action: restart },
      update: d.update,
    });
  }

  function restart(): void {
    if (mode === 'daily') return;
    if (drag) endDrag();
    game = newGame(mode, randomSeed());
    clearChoice();
    save();
    render();
  }

  function takeBack(): void {
    game = undo(game);
    clearChoice();
    save();
    render();
  }

  function turn(slot: number): void {
    game = turnPiece(game, slot);
    tapCell = null;
    keepTargetInside();
    save();
    render();
  }

  function switchMode(m: Mode): void {
    if (m === mode && localDateKey(new Date()) === today) return;
    if (drag) endDrag();
    mode = m;
    store.saveMode(m);
    today = localDateKey(new Date());
    game = load(m);
    clearChoice();
    render();
  }

  // ---------- taps and keys ----------
  function selectSlot(slot: number | null): void {
    if (game.end || (slot !== null && !game.tray[slot])) slot = null;
    selected = slot;
    target = null;
    tapCell = null;
    const piece = slot === null ? null : game.tray[slot];
    if (piece) {
      const { rows, cols } = pieceSize(piece.cells);
      target = { row: Math.floor((game.size - rows) / 2), col: Math.floor((game.size - cols) / 2) };
    }
    render();
    announceTarget(true);
  }

  function keepTargetInside(): void {
    const piece = selected === null ? null : game.tray[selected];
    if (!piece || !target) return;
    const { rows, cols } = pieceSize(piece.cells);
    target = {
      row: Math.min(Math.max(target.row, 0), game.size - rows),
      col: Math.min(Math.max(target.col, 0), game.size - cols),
    };
  }

  /** Tap a piece, then a cell: the piece's shadow moves there; a second tap on the same cell places it. */
  function onBoardClick(event: MouseEvent): void {
    if (selected === null || drag || game.end) return;
    const piece = game.tray[selected];
    const cell = board.cellAt(event.clientX, event.clientY);
    if (!piece || !cell) return;
    if (target && tapCell && tapCell.row === cell.row && tapCell.col === cell.col) {
      placeFrom(selected, target.row, target.col);
      return;
    }
    const { rows, cols } = pieceSize(piece.cells);
    target = { row: cell.row - Math.floor((rows - 1) / 2), col: cell.col - Math.floor((cols - 1) / 2) };
    keepTargetInside();
    tapCell = cell;
    render();
  }

  document.addEventListener('keydown', (event) => {
    if (endDialog.el.open || menuDialog.el.open || event.altKey) return;
    const letter = letterOf(event);
    if (event.ctrlKey || event.metaKey) {
      if (letter === 'z' && mode === 'calm' && game.history.length > 0) {
        event.preventDefault();
        takeBack();
      }
      return;
    }
    const digit = digitOf(event);
    if (digit !== null) {
      if (digit <= BLOCKS.piecesPerRound) selectSlot(digit - 1);
      return;
    }
    if (letter === 'r' && mode === 'calm' && !game.end) {
      const slot = selected ?? game.tray.findIndex((p) => p !== null);
      if (slot >= 0) turn(slot);
      return;
    }
    if (selected === null || !target) return;
    const steps: Record<string, [number, number]> = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
    };
    const step = steps[event.key];
    const onControl = event.target instanceof HTMLElement && event.target.closest('button, a, input, select, textarea') !== null;
    if (step) {
      event.preventDefault();
      target = { row: target.row + step[0], col: target.col + step[1] };
      tapCell = null;
      keepTargetInside();
      render();
      announceTarget(false);
    } else if (event.key === 'Enter' && !onControl) {
      event.preventDefault();
      placeFrom(selected, target.row, target.col);
    } else if (event.key === 'Escape') {
      selectSlot(null);
    }
  });

  // ---------- dragging ----------
  function startDrag(slot: number, event: PointerEvent): void {
    const piece = game.tray[slot];
    if (!piece || game.end) return;
    clearChoice();
    const g = board.geometry();
    const floating = pieceElement(piece.cells, shapeCode(piece.shape), g.cell, g.gap);
    floating.classList.add('floating');
    document.body.append(floating);
    document.documentElement.classList.add('dragging');
    drag = { slot, floating, row: -game.size, col: -game.size };
    moveDrag(event);
  }

  function moveDrag(event: PointerEvent): void {
    if (!drag) return;
    const piece = game.tray[drag.slot];
    if (!piece) return;
    const g = board.geometry();
    const { rows, cols } = pieceSize(piece.cells);
    const width = cols * g.step - g.gap;
    const height = rows * g.step - g.gap;
    const top =
      event.pointerType === 'touch' ? event.clientY - height - g.step * TOUCH_LIFT_CELLS : event.clientY - height / 2;
    const left = event.clientX - width / 2;
    drag.floating.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
    const col = Math.round((left - g.left) / g.step);
    const row = Math.round((top - g.top) / g.step);
    if (row !== drag.row || col !== drag.col) {
      drag.row = row;
      drag.col = col;
      render();
    }
  }

  function dropDrag(): void {
    if (!drag) return;
    const { slot, row, col } = drag;
    const preview = previewAt(slot, row, col);
    endDrag();
    if (preview?.ok) {
      placeFrom(slot, row, col);
      return;
    }
    const overBoard = preview?.cells.some(([r, c]) => {
      const rr = row + r;
      const cc = col + c;
      return rr >= 0 && cc >= 0 && rr < game.size && cc < game.size;
    });
    if (overBoard) announce(d.announce.cannot);
  }

  function endDrag(): void {
    drag?.floating.remove();
    drag = null;
    document.documentElement.classList.remove('dragging');
    render();
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
      setLook(look) {
        settings = { ...settings, look };
        store.saveSettings(settings);
        document.documentElement.classList.toggle('drawn', look === 'drawn');
      },
      setBig(on) {
        settings = { ...settings, big: on };
        store.saveSettings(settings);
        document.documentElement.classList.toggle('big', on);
        render();
      },
      setVibration(on) {
        settings = { ...settings, vibration: on };
        store.saveSettings(settings);
      },
      clearProgress() {
        store.clearAll();
        hintDone = false;
        game = load(mode);
        clearChoice();
        render();
      },
    });
  }

  window.addEventListener('resize', () => render());
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', updateThemeColor);
  // A new day while the game stays open: the daily puzzle follows the date.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && mode === 'daily' && localDateKey(new Date()) !== today) {
      switchMode('daily');
    }
  });
  build();
}
