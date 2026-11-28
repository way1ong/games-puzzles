// The game screen (docs/slide/SPEC.md): which screen is open (the start; a fifteen of a size or of the day; levels,
// free play of a difficulty or the puzzle of the day of "Clear the way" and of "The chest"), the game in play, the hint
// and its way, the taken piece, the picture shown whole, the time, the end, the menu, the keys. The rules are the
// core's; this module only shows them and passes the player's actions on.
import { localDateKey, streak } from '../../../shared/core/dates.ts';
import type { ShareText } from '../../../shared/ui/copy.ts';
import { h } from '../../../shared/ui/dom.ts';
import { offerUpdates } from '../../../shared/ui/update-view.ts';
import { PICTURES, pictureUrl } from '../art/pictures.ts';
import { DIFFICULTIES, SLIDE, type Difficulty } from '../config.ts';
import { parseBox, sizeOf, type BoxMove, type BoxPuzzle } from '../core/box.ts';
import { allPositions as allBoxPositions, nextMove as nextBoxMove, type BoxPositions } from '../core/box-solve.ts';
import { homeOf } from '../core/fifteen.ts';
import { findHint, type TileWay } from '../core/fifteen-solve.ts';
import { dailySeed, fifteenTiles, freePuzzle, levelPuzzle, levelSeed } from '../core/level.ts';
import { addTime, clean, countHint, moveBlock, movePiece, movesMade, newBox, newFifteen, newUnblock, perfect, slideTile, startAgain, started, undo, type SlidePlay } from '../core/play.ts';
import { parsePool, type PoolPuzzle } from '../core/pool.ts';
import { longestStreak, recordLeft, recordWon } from '../core/stats.ts';
import { parseBoard, type Move, type Puzzle } from '../core/unblock.ts';
import { allPositions, nextMove, type Positions } from '../core/unblock-solve.ts';
import boxPoolText from '../levels/box.txt?raw';
import poolText from '../levels/unblock.txt?raw';
import { createBoxView } from './box-view.ts';
import { createEndDialog } from './end-dialog.ts';
import { createFifteenView } from './fifteen-view.ts';
import { homeView, type DayState } from './home-view.ts';
import { dict, fmt, pickLang, plural, type Dict } from './i18n.ts';
import { backSign } from './icons.ts';
import { createMenuDialog } from './menu-dialog.ts';
import { closeRoute, currentRoute, openRoute, restoreRoute, watchRoute } from './route.ts';
import { randomSeed } from './seed.ts';
import * as store from './storage.ts';
import { isSlot, slotKind, slotOf, type PoolMode, type PuzzleSets, type Settings, type Slot } from './storage.ts';
import { clockText } from './time.ts';
import { createToolsView } from './tools-view.ts';
import { createUnblockView } from './unblock-view.ts';
import { blockHint, blockLabel, pieceHint, pieceLabel, tileHint, tileLabel, tipText } from './words.ts';

/** The sets of puzzles made in advance: "Clear the way" and "The chest". */
const POOLS: Record<PoolMode, readonly PoolPuzzle[]> = { unblock: parsePool(poolText), box: parsePool(boxPoolText) };

/** How often the shown time is updated, ms. */
const TICK_MS = 1000;

/** A latin letter key whatever the keyboard layout (H; Z with Ctrl). */
function letterOf(event: KeyboardEvent): string {
  return event.code.startsWith('Key') ? event.code.slice(3).toLowerCase() : '';
}

interface NoteAction {
  label: string;
  run: () => void;
}

/** The puzzle of the day of "Clear the way" or "The chest": the same for everybody on that date. */
const dayPuzzle = (mode: PoolMode, date: string): PoolPuzzle => freePuzzle(POOLS[mode], SLIDE[mode].daily, dailySeed(mode, date), SLIDE[mode]);
const SETS: PuzzleSets = { pool: (mode) => POOLS[mode], day: dayPuzzle };

const puzzles = new Map<string, Puzzle>();
const puzzleOf = (board: string): Puzzle => {
  let p = puzzles.get(board);
  if (!p) puzzles.set(board, (p = parseBoard(board).puzzle));
  return p;
};

const boxPuzzles = new Map<string, BoxPuzzle>();
const boxPuzzleOf = (board: string): BoxPuzzle => {
  let p = boxPuzzles.get(board);
  if (!p) boxPuzzles.set(board, (p = parseBox(board).puzzle));
  return p;
};

export function startApp(root: HTMLElement): void {
  let settings: Settings = store.loadSettings();
  let lang = pickLang(settings.lang, navigator.languages ?? [navigator.language]);
  let d: Dict = dict(lang);
  let today = localDateKey(new Date());

  /** The screen of a game open (null — the start screen). */
  let open: Slot | null = null;
  let game: SlidePlay | null = null;
  /** The hint shown: a tile of the fifteen, a move of "Clear the way", or a move of "The chest". */
  let hint: { tile: number } | { move: Move } | { block: BoxMove } | null = null;
  /** The game the hint was found for: a second press does it only while nothing has changed. */
  let hintFor: SlidePlay | null = null;
  /** The fifteen: the way the hints follow while the player is on it. */
  let tileWay: TileWay | null = null;
  /** "Clear the way": every position of the puzzle in play (walked once, at the first hint). */
  let positions: { board: string; map: Positions } | null = null;
  /** "The chest": the same. */
  let boxPositions: { board: string; map: BoxPositions } | null = null;
  /** "Clear the way", "The chest": the piece taken by a tap or Enter. */
  let taken: number | null = null;
  /** The fifteen: the picture shown whole. */
  let whole = false;
  /** A short word about the last action, shown until the next one. */
  let message: string | null = null;
  /** "Start again" was tapped once: the second tap starts again. */
  let armedAgain = false;
  const tipDone = { fifteen: store.loadTipDone('fifteen'), unblock: store.loadTipDone('unblock'), box: store.loadTipDone('box') };
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
  // A new version: asked on the start screen only, never in play (shared/ui/update-view.ts).
  const updates = offerUpdates(
    () => !isSlot(currentRoute()),
    () => d.update,
  );

  const whereEl = h('span', { class: 'info__text' });
  const movesEl = h('span', { class: 'info__moves' });
  const timeEl = h('span', { class: 'info__time', role: 'timer' });
  const info = h('p', { class: 'info' }, whereEl, movesEl, timeEl);
  const noteText = h('span', { class: 'note__text' });
  const noteActions = h('span', { class: 'note__actions' });
  const note = h('div', { class: 'note' }, noteText, noteActions);
  const fifteenView = createFifteenView({ tap: onTile });
  const unblockView = createUnblockView({ move: onMove, take: onTake, stuck: onStuck });
  const boxView = createBoxView({ move: onBlockMove, take: onTake, stuck: onStuck });
  const board = h('div', { class: 'board' });
  const tools = createToolsView({ undo: undoMove, hint: askHint, again: startOver, picture: togglePicture });
  const playView = h('div', { class: 'play' }, info, board, note, tools.el);

  backBtn.addEventListener('click', () => closeRoute(''));
  menuBtn.addEventListener('click', openMenu);

  /** A note longer than its place scrolls by itself: then the keys reach it. */
  function noteByKeys(): void {
    if (note.scrollHeight > note.clientHeight + 1) note.tabIndex = 0;
    else note.removeAttribute('tabindex');
  }
  new ResizeObserver(noteByKeys).observe(note);

  root.replaceChildren(h('main', { class: 'app' }, h('header', { class: 'top' }, backBtn, title, menuBtn), content, live, menuDialog.el, endDialog.el));

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

  function vibrate(): void {
    if (settings.vibration && 'vibrate' in navigator) navigator.vibrate(SLIDE.vibrateMs);
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
    renderHome();
  }

  function leaveGame(): void {
    stopClock();
    open = null;
    game = null;
    clearTurn();
  }

  /** Forgets what belongs to one moment of a game: the hint, the taken piece, the picture shown, the word. */
  function clearTurn(): void {
    hint = null;
    hintFor = null;
    tileWay = null;
    taken = null;
    whole = false;
    message = null;
    armedAgain = false;
  }

  function newGame(slot: Slot): SlidePlay {
    const k = slotKind(slot);
    if (k.mode === 'fifteen') {
      if (k.way === 'daily') {
        const seed = dailySeed('fifteen', today);
        return newFifteen(fifteenTiles(SLIDE.fifteen.dailySize, seed), 'daily', seed, PICTURES.length, { daily: today });
      }
      const seed = randomSeed();
      return newFifteen(fifteenTiles(SLIDE.fifteen.sizes[k.difficulty!], seed), 'free', seed, PICTURES.length, { difficulty: k.difficulty! });
    }
    const mode = k.mode;
    const make = mode === 'box' ? newBox : newUnblock;
    if (k.way === 'level') {
      const level = store.loadReached(mode);
      return make(levelPuzzle(POOLS[mode], level, SLIDE[mode]), 'level', levelSeed(level, mode), { level });
    }
    if (k.way === 'daily') return make(dayPuzzle(mode, today), 'daily', dailySeed(mode, today), { daily: today });
    const seed = randomSeed();
    return make(freePuzzle(POOLS[mode], k.difficulty!, seed, SLIDE[mode]), 'free', seed, { difficulty: k.difficulty! });
  }

  /** The word at the end of a game of each mode. */
  const doneText = (g: SlidePlay): string => (g.mode === 'fifteen' ? d.game.solved : g.mode === 'box' ? d.game.chestOut : d.game.out);

  function openGame(slot: Slot): void {
    stopClock();
    open = slot;
    clearTurn();
    game = store.loadPlay(slot, today, SETS) ?? newGame(slot);
    if (game.done) message = doneText(game);
    render();
    startClock();
    title.focus();
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

  // ---------- the start screen ----------
  function renderHome(): void {
    applyLook();
    backBtn.hidden = true;
    title.textContent = d.app.name;
    const begun = (slot: Slot) => {
      const p = store.loadPlay(slot, today, SETS);
      return !!p && !p.done && started(p);
    };
    const dayState = (mode: SlidePlay['mode'], slot: Slot): DayState => {
      const p = store.loadPlay(slot, today, SETS);
      return store.loadDays(mode)[today] || p?.done ? 'done' : p && started(p) ? 'started' : 'new';
    };
    const each = (mode: SlidePlay['mode']) => Object.fromEntries(DIFFICULTIES.map((diff) => [diff, begun(`${mode}-${diff}` as Slot)])) as Record<Difficulty, boolean>;
    const ways = (mode: PoolMode) => ({
      reached: store.loadReached(mode),
      levelBegun: begun(mode === 'box' ? 'box-levels' : 'levels'),
      begun: each(mode),
      day: dayState(mode, `${mode}-day`),
      streak: streak(Object.keys(store.loadDays(mode)), today),
    });
    content.replaceChildren(
      homeView(
        {
          fifteen: { begun: each('fifteen'), day: dayState('fifteen', 'fifteen-day'), streak: streak(Object.keys(store.loadDays('fifteen')), today) },
          unblock: ways('unblock'),
          box: ways('box'),
          date: dateText(today, 'long'),
        },
        d,
        lang,
        (slot) => openRoute(slot),
      ),
    );
    updates.check();
  }

  // ---------- the game ----------
  function titleText(g: SlidePlay): string {
    if (g.mode === 'fifteen') return g.way === 'daily' ? d.game.dailyFifteen : fmt(d.game.fifteen, { n: g.size });
    if (g.way === 'level') return fmt(d.game.level, { n: g.level! });
    if (g.way === 'daily') return g.mode === 'box' ? d.game.dailyBox : d.game.dailyUnblock;
    return d.difficulty[g.difficulty!];
  }

  function whereText(g: SlidePlay): string {
    if (g.mode === 'fifteen') return g.way === 'daily' ? `${dateText(today, 'long')} · ${fmt(d.home.size, { n: g.size })}` : d.difficulty[g.difficulty!];
    if (g.way === 'daily') return dateText(today, 'long');
    // "The chest" says its name: its levels and difficulties are named as those of "Clear the way"
    if (g.mode === 'box') return d.mode.box;
    return g.way === 'level' ? d.home.levels : d.home.free;
  }

  function movesText(g: SlidePlay): string {
    const n = movesMade(g);
    const moves = plural(lang, n, d.game.moves, { n });
    return g.mode === 'fifteen' ? moves : `${moves} · ${plural(lang, g.fewest, d.game.fewest, { n: g.fewest })}`;
  }

  function noteContent(g: SlidePlay): { text: string; actions: NoteAction[] } {
    if (g.done) return { text: doneText(g), actions: endActions() };
    if (message) return { text: message, actions: [] };
    if (g.mode !== 'fifteen' && taken !== null) return { text: g.mode === 'box' ? d.game.takenBox : d.game.taken, actions: [] };
    if (!tipDone[g.mode]) return { text: tipText(d, g.mode, settings.faces, g.mode === 'unblock' ? g.theme : 'box'), actions: [] };
    return { text: '', actions: [] };
  }

  const shownHint = () => (hint && hintFor === game ? hint : null);

  function render(): void {
    if (!game || !open) return;
    applyLook();
    backBtn.hidden = false;
    title.textContent = titleText(game);
    if (!content.contains(playView)) content.replaceChildren(playView);
    const g = game;
    whereEl.textContent = whereText(g);
    movesEl.textContent = movesText(g);
    renderTime();
    playView.dataset.mode = g.mode;
    const shown = shownHint();
    if (g.mode === 'fifteen') {
      if (board.firstChild !== fifteenView.el) board.replaceChildren(fifteenView.el);
      fifteenView.el.setAttribute('aria-label', d.board.fifteen);
      const face = settings.faces;
      const hintTile = shown && 'tile' in shown ? shown.tile : null;
      fifteenView.render({
        tiles: g.tiles,
        face,
        picture: face === 'numbers' ? null : pictureUrl(g.picture),
        hint: hintTile,
        whole,
        done: g.done,
        label: (tile, cell) => {
          const marks: string[] = [];
          if (cell === homeOf(tile, g.size)) marks.push(d.board.home);
          if (hintTile === tile) marks.push(d.board.hint);
          return tileLabel(tile, cell, g.size, d, marks);
        },
        pictureLabel: d.board.picture,
        goalLabel: d.board.goal,
      });
    } else if (g.mode === 'box') {
      if (board.firstChild !== boxView.el) board.replaceChildren(boxView.el);
      boxView.el.setAttribute('aria-label', d.board.box);
      const puzzle = boxPuzzleOf(g.board);
      const move = shown && 'block' in shown ? shown.block : null;
      boxView.render({
        board: g.board,
        puzzle,
        places: g.places,
        taken,
        hint: move,
        done: g.done,
        label: (i) => {
          const marks: string[] = [];
          if (taken === i) marks.push(d.board.taken);
          if (move?.piece === i) marks.push(d.board.hint);
          return blockLabel(puzzle, g.places, i, d, lang, marks);
        },
        exitLabel: fmt(d.board.slot, { from: SLIDE.box.slot + 1, to: SLIDE.box.slot + sizeOf('chest')[0] }),
      });
    } else {
      if (board.firstChild !== unblockView.el) board.replaceChildren(unblockView.el);
      unblockView.el.setAttribute('aria-label', d.board.unblock);
      const puzzle = puzzleOf(g.board);
      const move = shown && 'move' in shown ? shown.move : null;
      unblockView.render({
        puzzle,
        places: g.places,
        theme: g.theme,
        taken,
        hint: move,
        done: g.done,
        label: (i) => {
          const marks: string[] = [];
          if (taken === i) marks.push(d.board.taken);
          if (move?.piece === i) marks.push(d.board.hint);
          return pieceLabel(puzzle, g.places, i, g.theme, d, lang, marks);
        },
        exitLabel: fmt(d.board.exit, { r: SLIDE.unblock.exitRow + 1 }),
      });
    }
    tools.render(d, { hintReady: !!shown, goal: g.mode === 'fifteen' ? { shown: whole, picture: settings.faces !== 'numbers' } : null });
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

  function save(): void {
    if (game && (started(game) || game.hints > 0)) store.savePlay(game);
  }

  /** After a move: forget the hint shown (its way is kept while the player follows it), then the end or a redraw. */
  function moved(next: SlidePlay): void {
    game = next;
    hint = null;
    hintFor = null;
    taken = null;
    armedAgain = false;
    message = null;
    announce(d.game.moved);
    save();
    if (next.done) {
      finish();
      return;
    }
    render();
  }

  function onTile(cell: number): void {
    if (!game || game.mode !== 'fifteen' || game.done) return;
    const next = slideTile(game, cell);
    if (!next) {
      armedAgain = false;
      message = d.game.notInLine;
      announce(message);
      render();
      return;
    }
    moved(next);
  }

  function onMove(move: Move): void {
    if (!game || game.mode !== 'unblock' || game.done) return;
    const next = movePiece(game, move);
    if (next) moved(next);
  }

  function onBlockMove(move: BoxMove): void {
    if (!game || game.mode !== 'box' || game.done) return;
    const next = moveBlock(game, move);
    if (next) moved(next);
  }

  function onTake(piece: number | null): void {
    if (!game || game.mode === 'fifteen' || game.done) return;
    taken = piece;
    armedAgain = false;
    message = piece === null ? d.game.put : null;
    if (piece === null) announce(d.game.put);
    else if (game.mode === 'box') announce(`${blockLabel(boxPuzzleOf(game.board), game.places, piece, d, lang, [d.board.taken])}. ${d.game.takenBox}`);
    else announce(`${pieceLabel(puzzleOf(game.board), game.places, piece, game.theme, d, lang, [d.board.taken])}. ${d.game.taken}`);
    render();
  }

  function onStuck(): void {
    if (!game || game.done) return;
    taken = null;
    message = game.mode === 'box' ? d.game.cannotMoveBox : d.game.cannotMove;
    announce(message);
    render();
  }

  function undoMove(): void {
    if (!game || game.done) return;
    armedAgain = false;
    const next = undo(game);
    if (!next) message = d.game.nothingToUndo;
    else {
      game = next;
      hint = null;
      hintFor = null;
      taken = null;
      message = d.game.undone;
      save();
    }
    announce(message);
    render();
  }

  function askHint(): void {
    if (!game || game.done) return;
    armedAgain = false;
    const shown = shownHint();
    // a second press does the hint shown, while nothing has changed
    if (shown) {
      if ('tile' in shown && game.mode === 'fifteen') onTile(game.tiles.indexOf(shown.tile));
      else if ('move' in shown) onMove(shown.move);
      else if ('block' in shown) onBlockMove(shown.block);
      return;
    }
    if (game.mode === 'fifteen') {
      const found = findHint(game.tiles, tileWay);
      if (!found) return;
      tileWay = found.way;
      game = countHint(game);
      hint = { tile: found.tile };
      message = tileHint(found.tile, settings.faces, d);
    } else if (game.mode === 'box') {
      // every position of the puzzle, once (the set keeps only puzzles with few enough: config, box.maxPositions)
      if (boxPositions?.board !== game.board) boxPositions = { board: game.board, map: allBoxPositions(boxPuzzleOf(game.board), parseBox(game.board).spots)! };
      const move = nextBoxMove(boxPositions.map, game.places);
      if (!move) return;
      game = countHint(game);
      hint = { block: move };
      taken = null;
      message = blockHint(boxPuzzleOf(game.board), game.places, move, d);
    } else {
      if (positions?.board !== game.board) {
        const puzzle = puzzleOf(game.board);
        positions = { board: game.board, map: allPositions(puzzle, parseBoard(game.board).places)! };
      }
      const move = nextMove(positions.map, game.places);
      if (!move) return;
      game = countHint(game);
      hint = { move };
      taken = null;
      message = pieceHint(puzzleOf(game.board), game.places, move, game.theme, d);
    }
    hintFor = game;
    save();
    announce(message);
    render();
  }

  function startOver(sure = false): void {
    if (!game || game.done) return;
    if (!sure && !armedAgain && started(game)) {
      armedAgain = true;
      message = d.game.againSure;
      announce(message);
      render();
      return;
    }
    const next = startAgain(game);
    armedAgain = false;
    if (!next) return;
    game = next;
    clearTurn();
    message = d.game.again;
    save();
    announce(message);
    render();
  }

  /** The fifteen: the goal over the board — the tiles in order, or the whole picture — until pressed again. */
  function togglePicture(): void {
    if (!game || game.mode !== 'fifteen') return;
    whole = !whole;
    announce(whole ? (settings.faces === 'numbers' ? d.board.goal : d.board.picture) : '');
    render();
  }

  /** Free play: leave this game for a new one (a begun one counts as played). */
  function newFree(): void {
    if (!game || game.way !== 'free' || !open) return;
    if (!game.done && started(game)) store.saveStats(recordLeft(store.loadStats(), game));
    store.dropPlay(open);
    openGame(open);
  }

  // ---------- the end ----------
  function endActions(): NoteAction[] {
    if (!game) return [];
    if (game.way === 'level') return [{ label: d.end.next, run: nextLevel }];
    if (game.way === 'free') return [{ label: d.end.new, run: newFree }];
    return [{ label: d.end.home, run: () => closeRoute('') }];
  }

  function nextLevel(): void {
    const slot = game ? slotOf(game) : null;
    if (slot !== 'levels' && slot !== 'box-levels') return;
    store.dropPlay(slot);
    if (open === slot) openGame(slot);
  }

  function finish(): void {
    if (!game || !open) return;
    stopClock();
    const g = game;
    const slot = slotOf(g);
    store.saveStats(recordWon(store.loadStats(), g));
    if (g.mode !== 'fifteen' && g.way === 'level') store.saveReached(g.mode, Math.max(store.loadReached(g.mode), g.level! + 1));
    if (g.way === 'daily') store.saveDayResult(g.mode, today, { moves: movesMade(g), clean: clean(g) });
    if (g.way === 'free') store.dropPlay(slot);
    else store.savePlay(g);
    if (!tipDone[g.mode]) {
      tipDone[g.mode] = true;
      store.saveTipDone(g.mode);
    }
    vibrate();
    hint = null;
    taken = null;
    whole = false;
    message = null;
    render();
    const n = movesMade(g);
    const lines = [plural(lang, n, d.end.moves, { n })];
    if (g.mode !== 'fifteen') lines.push(perfect(g) ? d.end.perfect : plural(lang, g.fewest, d.end.fewest, { n: g.fewest }));
    if (clean(g)) lines.push(d.end.clean);
    else {
      if (g.undos) lines.push(plural(lang, g.undos, d.end.undos, { n: g.undos }));
      if (g.hints) lines.push(plural(lang, g.hints, d.end.hints, { n: g.hints }));
    }
    if (settings.time) lines.push(fmt(d.end.time, { time: clockText(g.ms) }));
    let share: ShareText | null = null;
    const dayTitle = g.mode === 'fifteen' ? d.home.dailyFifteen : g.mode === 'box' ? d.home.dailyBox : d.home.dailyUnblock;
    if (g.way === 'daily') {
      const days = streak(Object.keys(store.loadDays(g.mode)), today);
      lines.push(plural(lang, days, d.end.streak, { n: days, title: dayTitle }));
      const params = { name: SLIDE.name, date: dateText(today, 'medium'), moves: n, fewest: g.mode === 'fifteen' ? 0 : g.fewest };
      const text =
        g.mode === 'fifteen'
          ? fmt(clean(g) ? d.end.shareFifteenClean : d.end.shareFifteen, params)
          : g.mode === 'box'
            ? fmt(clean(g) ? d.end.shareBoxClean : d.end.shareBox, params)
            : fmt(clean(g) ? d.end.shareUnblockClean : d.end.shareUnblock, params);
      share = { label: d.end.copy, done: d.end.copied, text: SLIDE.links.game ? `${text}\n${SLIDE.links.game}` : text };
    }
    const home = { label: d.end.home, action: () => closeRoute('') };
    endDialog.open({
      title: g.mode === 'fifteen' ? d.end.solved : g.mode === 'box' ? d.end.chestOut : d.end.out,
      highlight: g.way === 'daily' ? `${dayTitle} · ${dateText(today, 'long')}` : g.mode === 'box' ? `${d.mode.box} · ${titleText(g)}` : titleText(g),
      lines,
      share,
      secondary: g.way === 'daily' ? null : home,
      primary: g.way === 'level' ? { label: d.end.next, action: nextLevel } : g.way === 'free' ? { label: d.end.new, action: newFree } : home,
    });
  }

  // ---------- menu ----------
  function openMenu(): void {
    menuDialog.open(
      {
        d,
        lang,
        settings,
        stats: store.loadStats(),
        longest: {
          fifteen: longestStreak(Object.keys(store.loadDays('fifteen'))),
          unblock: longestStreak(Object.keys(store.loadDays('unblock'))),
          box: longestStreak(Object.keys(store.loadDays('box'))),
        },
      },
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
          if (patch.faces && game?.mode === 'fifteen' && hint && 'tile' in hint) message = tileHint(hint.tile, settings.faces, d);
          redraw();
        },
        clearProgress() {
          store.clearAll();
          tipDone.fifteen = false;
          tipDone.unblock = false;
          tipDone.box = false;
          if (open) openGame(open);
          else show();
        },
      },
    );
  }

  function redraw(): void {
    if (open) render();
    else renderHome();
  }

  // ---------- keys ----------
  document.addEventListener('keydown', (event) => {
    if (!open || !game || menuDialog.el.open || endDialog.el.open || document.querySelector('dialog[open]')) return;
    const letter = letterOf(event);
    if ((event.ctrlKey || event.metaKey) && letter === 'z') {
      event.preventDefault();
      undoMove();
      return;
    }
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (letter === 'h') askHint();
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

  // Open where the player stopped: the game open last time (with the start screen behind it), else the start.
  const last = store.loadLast();
  if (!currentRoute() && isSlot(last)) restoreRoute('', last);
  else show();
}
