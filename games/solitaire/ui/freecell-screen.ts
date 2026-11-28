// FreeCell's screen (docs/solitaire/SPEC.md, "Вільні клітинки"): the deal in play — an ordinary one or the deal of the
// day, for the number of free cells chosen — the line about the deal, the table, the note under it and the tools. It
// turns taps, drags and keys into moves; the rules are in ../core (pure functions); the work that takes time (a deal
// that can be won, a hint, the quiet check that a way is left) goes in slices (maker.ts). The start screen, the menu
// and the top bar belong to app.ts, which opens this screen and passes it what it needs.
import { streak } from '../../../shared/core/dates.ts';
import type { ShareText } from '../../../shared/ui/copy.ts';
import { h } from '../../../shared/ui/dom.ts';
import type { Sounds } from '../../../shared/ui/sound.ts';
import { SOLITAIRE } from '../config.ts';
import type { Card } from '../core/cards.ts';
import { freecellDailySeed, freecellWinnableSeed } from '../core/freecell-deals.ts';
import { freecellHintSearch, type FreeHint, type FreeWay } from '../core/freecell-hint.ts';
import type { FreeMove } from '../core/freecell-solve.ts';
import { recordFreeCellLeft, recordFreeCellWon } from '../core/freecell-stats.ts';
import { freeCarried, freecellWorthChecking } from '../core/freecell-stuck.ts';
import { freeBestPlace, tapRefusal } from '../core/freecell-tap.ts';
import {
  addFreeTime,
  canFinish,
  countFreeHint,
  emptyColumns,
  finishStep,
  freeCellsLeft,
  freecellDeal,
  moveCards,
  moveLimit,
  moveRefusal,
  movingCards,
  settleStart,
  undoFreeCell,
  type FreeCell,
  type FreePlace,
} from '../core/freecell.ts';
import type { EndContent } from './end-dialog.ts';
import * as freeStore from './freecell-storage.ts';
import type { FreeCellSlot } from './freecell-storage.ts';
import { createFreeTableView, type FreeTarget } from './freecell-table-view.ts';
import { fmt, plural, type Dict } from './i18n.ts';
import { keepFreeCellReady, randomSeed, runSoon } from './maker.ts';
import { cardName } from './names.ts';
import type { Settings } from './storage.ts';
import { clockText } from './time.ts';
import { createToolsView } from './tools-view.ts';

const ARROWS: Record<string, 'left' | 'right' | 'up' | 'down'> = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
/** The pace of finishing by itself: one card home per step, ms (no steps when the system asks for less motion). */
const FINISH_STEP_MS = 110;

/** What the screen needs from the app around it. */
export interface FreeCellShell {
  /** The game's sounds (shared with Klondike's screen). */
  sounds: Sounds;
  dict(): Dict;
  lang(): string;
  settings(): Settings;
  today(): string;
  announce(text: string): void;
  dateText(dateKey: string, style: 'long' | 'medium'): string;
  openEnd(content: EndContent): void;
  /** Back to the start screen. */
  close(): void;
  /** Another FreeCell deal (the menu's "new deal" works through it too). */
  openFreeCell(slot: FreeCellSlot): void;
}

interface NoteAction {
  label: string;
  run: () => void;
}

interface NoteNow {
  text: string;
  actions: NoteAction[];
  suggestNew: boolean;
}

export interface FreeCellScreen {
  view: HTMLElement;
  /** The open deal's place; null — none. */
  slot(): FreeCellSlot | null;
  open(slot: FreeCellSlot): void;
  /** Stops the work and the clock (the deal stays saved). */
  leave(): void;
  render(): void;
  /** The name for the top bar. */
  title(): string;
  keydown(event: KeyboardEvent, letter: string): void;
  /** The page went out of sight, or came back (another day may have begun). */
  visibility(visible: boolean): void;
}

export function createFreeCellScreen(shell: FreeCellShell): FreeCellScreen {
  let slot: FreeCellSlot | null = null;
  let game: FreeCell | null = null;
  let stopMaking: (() => void) | null = null;
  let stopHinting: (() => void) | null = null;
  let stopChecking: (() => void) | null = null;
  let finishing: number | null = null;
  let hint: FreeHint | null = null;
  /** The way the last hint is a step of: while the player follows it, the next hint is its next move. */
  let way: FreeWay | null = null;
  /** A short word about the last action, shown until the next move. */
  let message: string | null = null;
  /** The game found, unasked, that no way to the end is left from this position, and how far back one is. */
  let deadEnd: { at: FreeCell; back: number | null } | null = null;
  /** "New deal" was tapped once: the second tap deals. */
  let armedNew = false;
  /** The cards that went home by themselves with the last move: they fly there one after another. */
  let flying: Card[] = [];
  let tipDone = freeStore.loadFreeCellTipDone();
  /** When the current stretch of play started (performance.now()); null — the clock stands. */
  let clockFrom: number | null = null;

  // ---------- elements ----------
  const infoText = h('span', { class: 'info__text' });
  const timeEl = h('span', { class: 'info__time', role: 'timer' });
  const info = h('p', { class: 'info' }, infoText, timeEl);
  const noteText = h('span', { class: 'note__text' });
  const noteActions = h('span', { class: 'note__actions' });
  const note = h('div', { class: 'note' }, noteText, noteActions);
  const table = createFreeTableView({ tap: onTap, drop: onDrop });
  const preparing = h('p', { class: 'table-wait', role: 'status' });
  const stage = h('div', { class: 'stage' }, table.el, preparing);
  const tools = createToolsView({ hint: askHint, undo: takeBack, newDeal, restart });
  const view = h('div', { class: 'play play--freecell' }, info, stage, note, tools.el);

  /** A note longer than its place (the narrow panel on a phone on its side, large letters) scrolls: then the keys reach it. */
  function noteByKeys(): void {
    if (note.scrollHeight > note.clientHeight + 1) note.tabIndex = 0;
    else note.removeAttribute('tabindex');
  }
  new ResizeObserver(noteByKeys).observe(note);

  const d = () => shell.dict();
  const autoHome = () => shell.settings().autoHome;
  const name = (card: Card) => cardName(card, d());

  // ---------- opening a deal ----------
  function stopWork(): void {
    stopMaking?.();
    stopMaking = null;
    stopHinting?.();
    stopHinting = null;
    stopChecking?.();
    stopChecking = null;
    if (finishing !== null) window.clearTimeout(finishing);
    finishing = null;
  }

  function leave(): void {
    stopClock();
    stopWork();
    slot = null;
    game = null;
    hint = null;
    way = null;
    deadEnd = null;
  }

  /** A deal as it opens: the cards no longer needed go home at once, if the player keeps that on. */
  const fresh = (seed: number, s: FreeCellSlot, today: string | null): FreeCell => {
    const g = freecellDeal(seed, s.cells, today);
    return autoHome() ? settleStart(g) : g;
  };

  function open(next: FreeCellSlot): void {
    leave();
    slot = next;
    message = null;
    armedNew = false;
    const today = shell.today();
    const saved = freeStore.loadFreeCell(next, today);
    if (saved && (next.daily || !saved.done)) {
      begin(saved);
      return;
    }
    if (!next.daily && shell.settings().deals === 'any') {
      begin(fresh(randomSeed(), next, null));
      return;
    }
    if (!next.daily) {
      const ready = freeStore.loadFreeCellReady(next.cells);
      if (ready !== null) {
        freeStore.dropFreeCellReady(next.cells);
        begin(fresh(ready, next, null));
        refillReady(next);
        return;
      }
    }
    // Make the deal now: today's deal of the day from its date, or a new one that can be won.
    const forSlot = next;
    const start = next.daily ? freecellDailySeed(today, next.cells) : randomSeed();
    render();
    stopMaking = runSoon(freecellWinnableSeed(start, next.cells), (seed) => {
      stopMaking = null;
      if (slot !== forSlot) return;
      begin(fresh(seed ?? start, forSlot, forSlot.daily ? today : null));
      if (!forSlot.daily) refillReady(forSlot);
    });
  }

  function refillReady(s: FreeCellSlot): void {
    keepFreeCellReady(s.cells, (cells) => freeStore.loadFreeCellReady(cells) !== null, freeStore.saveFreeCellReady);
  }

  function begin(g: FreeCell): void {
    game = g;
    deadEnd = null;
    flying = [];
    if (slot) freeStore.saveFreeCell(slot, g);
    startClock();
    render();
    checkWay();
  }

  // ---------- time ----------
  function startClock(): void {
    if (game && !game.done && document.visibilityState === 'visible' && clockFrom === null) clockFrom = performance.now();
  }

  function stopClock(): void {
    if (clockFrom === null || !game || !slot) return;
    game = addFreeTime(game, performance.now() - clockFrom);
    clockFrom = null;
    freeStore.saveFreeCell(slot, game);
  }

  function playedMs(): number {
    if (!game) return 0;
    return game.ms + (clockFrom === null ? 0 : performance.now() - clockFrom);
  }

  function renderTime(): void {
    timeEl.hidden = !shell.settings().time || !game;
    if (!timeEl.hidden) timeEl.textContent = clockText(playedMs());
  }

  window.setInterval(() => {
    if (slot && shell.settings().time) renderTime();
  }, 1000);

  // ---------- words ----------
  const cellsText = (): string => (slot ? plural(shell.lang(), slot.cells, d().freecell.cells, { n: slot.cells }) : '');

  function targetText(to: FreePlace): string {
    if (to.kind === 'foundation') return d().game.toFoundation;
    if (to.kind === 'cell') return d().freecell.toCell;
    return fmt(d().game.toColumn, { n: to.index + 1 });
  }

  function moveText(g: FreeCell, m: FreeMove): { card: string; target: string } {
    const card = movingCards(g, m.from, m.index)?.[0];
    return { card: card === undefined ? '' : name(card), target: targetText(m.to) };
  }

  function hintMarks(): { from: FreePlace; index: number; to: FreePlace } | null {
    const m = hint?.kind === 'unsure' ? hint.move : hint?.kind === 'move' ? hint : null;
    return m ? { from: m.from, index: m.index, to: m.to } : null;
  }

  function hintText(g: FreeCell, hm: FreeHint): NoteNow {
    const t = d();
    if (hm.kind === 'move') return { text: fmt(t.hint.move, moveText(g, hm)), actions: [], suggestNew: false };
    if (hm.kind === 'finish') return { text: t.hint.finish, actions: [{ label: t.game.finish, run: finishAll }], suggestNew: false };
    if (hm.kind === 'unsure') {
      if (hm.move) return { text: fmt(t.hint.unsure, moveText(g, hm.move)), actions: [], suggestNew: false };
      return { text: t.hint.stuckFar, actions: [], suggestNew: true };
    }
    const back = hm.back;
    if (back === null) return { text: t.hint.stuckFar, actions: [], suggestNew: true };
    return {
      text: plural(shell.lang(), back, t.hint.stuck, { n: back }),
      actions: [{ label: plural(shell.lang(), back, t.hint.undoMoves, { n: back }), run: () => takeBackMany(back) }],
      suggestNew: true,
    };
  }

  /** No way to the end is left: back to where the deal can be won, and — among the tools — a new deal or the start. */
  function deadEndNote(back: number | null): NoteNow {
    const actions: NoteAction[] = [];
    if (back !== null) actions.push({ label: plural(shell.lang(), back, d().hint.undoMoves, { n: back }), run: () => takeBackMany(back) });
    return { text: d().game.deadEnd, actions, suggestNew: true };
  }

  function noteNow(g: FreeCell | null): NoteNow | null {
    const t = d();
    if (!g) return { text: t.game.preparing, actions: [], suggestNew: false };
    if (g.done) {
      const action = slot?.daily ? { label: t.end.home, run: shell.close } : { label: t.end.newDeal, run: dealAnew };
      return { text: t.end.title, actions: [action], suggestNew: false };
    }
    if (stopHinting) return { text: t.hint.thinking, actions: [], suggestNew: false };
    if (hint) return hintText(g, hint);
    if (deadEnd?.at === g) return deadEndNote(deadEnd.back);
    if (message) return { text: message, actions: [], suggestNew: false };
    if (finishing === null && canFinish(g)) return { text: t.freecell.finishNote, actions: [{ label: t.game.finish, run: finishAll }], suggestNew: false };
    if (!tipDone) return { text: t.freecell.tip, actions: [], suggestNew: false };
    return null;
  }

  // ---------- drawing ----------
  function render(): void {
    if (!slot) return;
    const g = game;
    const t = d();
    infoText.textContent = slot.daily ? `${cellsText()} · ${shell.dateText(shell.today(), 'long')}` : cellsText();
    renderTime();
    preparing.hidden = !!g;
    preparing.textContent = g ? '' : t.game.preparing;
    table.el.hidden = !g;
    table.el.setAttribute('aria-label', t.game.table);
    const now = noteNow(g);
    note.hidden = !now || (!g && now.text === t.game.preparing);
    noteText.textContent = now?.text ?? '';
    noteActions.replaceChildren(
      ...(now?.actions ?? []).map((a) => {
        const b = h('button', { class: 'btn btn--primary', type: 'button' }, a.label);
        b.addEventListener('click', a.run);
        return b;
      }),
    );
    tools.el.hidden = !g || g.done;
    const suggestNew = now?.suggestNew ?? false;
    // the deal of the day has no new deal; where no way is found from here, "Start over" takes its place
    const fresh = !slot.daily ? 'deal' : suggestNew && !!g && g.history.length > 0 ? 'restart' : null;
    tools.render({ canUndo: !!g && g.history.length > 0, fresh, suggestNew, thinking: !!stopHinting }, t);
    if (g) table.render(g, { hint: hintMarks(), flying }, t);
    flying = [];
    noteByKeys();
  }

  // ---------- moves ----------
  /** Foundations full, from the ace to the king. */
  const suitsDone = (t: FreeCell): number => t.foundations.filter((rank) => rank === SOLITAIRE.deck.ranks).length;

  /** Words for a step: the card moved and where, and the cards that went home by themselves after it. */
  function stepWords(before: FreeCell, after: FreeCell): string {
    const t = d();
    const step = after.history[after.history.length - 1];
    if (!step) return '';
    const card = movingCards(before, step.from, step.from.kind === 'column' ? before.columns[step.from.index]!.length - step.count : 0)?.[0];
    const words = [card === undefined ? '' : fmt(t.game.moved, { card: name(card), target: targetText(step.to) })];
    if (step.auto.length > 0) words.push(fmt(t.freecell.wentHome, { cards: step.auto.map((a) => name(a.card)).join(', ') }));
    return words.join(' ');
  }

  function commit(next: FreeCell, words: string | null): void {
    if (!game || !slot || next === game) return;
    // the cards move; then a suit complete, or the whole deal
    const moving = shell.sounds.play('card');
    if (next.done) shell.sounds.play('win', {}, moving);
    else if (suitsDone(next) > suitsDone(game)) shell.sounds.play('success', {}, moving);
    // The move that finishes the deal stops the clock: its last stretch counts.
    if (next.done && clockFrom !== null) {
      next = { ...next, ms: next.ms + (performance.now() - clockFrom) };
      clockFrom = null;
    }
    const grew = next.history.length === game.history.length + 1;
    flying = grew ? next.history[next.history.length - 1]!.auto.map((a) => a.card) : [];
    game = next;
    hint = null;
    message = null;
    armedNew = false;
    stopHinting?.();
    stopHinting = null;
    freeStore.saveFreeCell(slot, game);
    if (words) shell.announce(words);
    if (game.done) {
      finish();
      return;
    }
    checkWay();
    render();
  }

  /**
   * After every change: if the player is plainly stuck (core/freecell-stuck.ts), the hint's search is asked quietly
   * whether a way to the end is left. It is not a hint: nothing is counted, nothing said unless no way is left.
   */
  function checkWay(): void {
    stopChecking?.();
    stopChecking = null;
    const g = game;
    if (!g || !slot || g.done) {
      deadEnd = null;
      return;
    }
    if (deadEnd) {
      // moves made from a dead end lead to dead ends: no need to ask again
      const back = freeCarried(deadEnd.at, deadEnd.back, g);
      deadEnd = back === undefined ? null : { at: g, back };
      if (deadEnd) return;
    }
    if (!freecellWorthChecking(g, autoHome())) return;
    const forSlot = slot;
    stopChecking = runSoon(freecellHintSearch(g, autoHome(), way), (found) => {
      stopChecking = null;
      if (slot !== forSlot || game !== g || found.hint.kind !== 'stuck') return;
      deadEnd = { at: g, back: found.hint.back };
      render();
      shell.announce(noteText.textContent ?? '');
    });
  }

  function say(text: string): void {
    message = text;
    shell.announce(text);
    hint = null;
    render();
  }

  function moveNow(from: FreePlace, index: number, to: FreePlace): boolean {
    if (!game) return false;
    const before = game;
    const after = moveCards(before, from, index, to, autoHome());
    if (after === before) return false;
    commit(after, stepWords(before, after));
    return true;
  }

  /** The card at a place, from `index` up the lowest (a column) — for the words of a refusal. */
  function cardAt(g: FreeCell, from: FreePlace, index: number): string {
    const card = from.kind === 'column' ? g.columns[from.index]![index] : from.kind === 'cell' ? g.cells[from.index] : null;
    return card === null || card === undefined ? '' : name(card);
  }

  /** More cards than may move together: how many may, and why — the free cells and the empty columns. */
  function tooManyText(g: FreeCell, most: number): string {
    return plural(shell.lang(), most, d().freecell.tooMany, { n: most, cells: freeCellsLeft(g), empty: emptyColumns(g) });
  }

  function onTap(target: FreeTarget): void {
    if (!game || game.done || finishing !== null) return;
    armedNew = false;
    if (target.kind === 'empty') return;
    const { place, index } = target;
    if (place.kind === 'foundation') {
      shell.sounds.play('refuse');
      say(d().freecell.fromHome);
      return;
    }
    const to = freeBestPlace(game, place, index);
    if (to) {
      moveNow(place, index, to);
      return;
    }
    table.refuse(target);
    shell.sounds.play('refuse');
    const why = tapRefusal(game, place, index);
    const t = d();
    if (why.kind === 'order') say(fmt(t.freecell.notInOrder, { card: cardAt(game, place, index) }));
    else if (why.kind === 'too-many') say(tooManyText(game, why.most));
    else say(fmt(t.game.noPlace, { card: cardAt(game, place, index) }));
  }

  function onDrop(from: FreePlace, index: number, to: FreePlace): boolean {
    if (!game || game.done || finishing !== null) return false;
    const reason = moveRefusal(game, from, index, to);
    if (reason) {
      shell.sounds.play('refuse');
      const t = d();
      if (reason === 'order') say(fmt(t.freecell.notInOrder, { card: cardAt(game, from, index) }));
      else if (reason === 'too-many') say(tooManyText(game, moveLimit(game, to)));
      else if (reason === 'one-card') say(t.freecell.oneCard);
      else say(fmt(t.game.cantDrop, { card: cardAt(game, from, index) }));
      return false;
    }
    return moveNow(from, index, to);
  }

  function takeBack(): void {
    if (!game || game.done || finishing !== null) return;
    const next = undoFreeCell(game);
    if (next === game) {
      say(d().game.nothingToUndo);
      return;
    }
    commit(next, d().game.undone);
  }

  function takeBackMany(steps: number): void {
    if (!game || game.done) return;
    let next = game;
    for (let k = 0; k < steps; k++) next = undoFreeCell(next);
    commit(next, d().game.undone);
  }

  /** The deal of the day from its start: every move taken back. */
  function restart(): void {
    if (!game || game.done || finishing !== null) return;
    let next = game;
    while (next.history.length > 0) next = undoFreeCell(next);
    commit(next, d().game.restarted);
  }

  /** Puts the rest home one card after another (all at once when the system asks for less motion). */
  function finishAll(): void {
    if (!game || !canFinish(game) || finishing !== null) return;
    stopHinting?.();
    stopHinting = null;
    hint = null;
    const stepOnce = (): boolean => {
      if (!game || !slot) return false;
      const s = finishStep(game);
      if (!s) return false;
      const next = moveCards(game, s.from, s.index, s.to, false);
      if (next === game) return false;
      if (!next.done) shell.sounds.play('card');
      if (next.done) {
        finishing = null;
        commit(next, null);
        return false;
      }
      game = next;
      freeStore.saveFreeCell(slot, game);
      render();
      return true;
    };
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      while (stepOnce());
      return;
    }
    const tick = () => {
      finishing = null;
      if (stepOnce()) finishing = window.setTimeout(tick, FINISH_STEP_MS);
    };
    finishing = window.setTimeout(tick, 0);
  }

  /**
   * A new ordinary deal: the unfinished one is counted as played. It is left first: leaving saves the deal (its time),
   * and a deal saved after it was dropped would open again in place of the new one.
   */
  function dealAnew(): void {
    if (!slot) return;
    const s = slot;
    if (game && !game.done) freeStore.saveFreeCellStats(recordFreeCellLeft(freeStore.loadFreeCellStats(), game));
    leave();
    freeStore.dropFreeCell({ daily: false, cells: s.cells });
    shell.openFreeCell({ daily: false, cells: s.cells });
  }

  function newDeal(): void {
    if (!game || !slot || slot.daily) return;
    // the game has said no way is left: one tap deals (otherwise the second tap does)
    if (game.history.length > 0 && !game.done && !armedNew && deadEnd?.at !== game) {
      armedNew = true;
      const text = d().game.newSure;
      shell.announce(text);
      message = text;
      hint = null;
      render();
      return;
    }
    dealAnew();
  }

  // ---------- hints ----------
  function askHint(): void {
    if (!game || !slot || game.done || stopHinting || finishing !== null) return;
    if (deadEnd?.at === game) {
      // the game has just said it: no way is left — not counted as a hint
      message = null;
      render();
      shell.announce(noteText.textContent ?? '');
      return;
    }
    stopChecking?.();
    stopChecking = null;
    const g = game;
    const forSlot = slot;
    hint = null;
    message = null;
    armedNew = false;
    stopHinting = runSoon(freecellHintSearch(g, autoHome(), way), (found) => {
      stopHinting = null;
      if (slot !== forSlot || game !== g) return;
      game = countFreeHint(g);
      freeStore.saveFreeCell(forSlot, game);
      hint = found.hint;
      way = found.way;
      render();
      shell.announce(noteText.textContent ?? '');
    });
    render();
  }

  // ---------- the end ----------
  function finish(): void {
    if (!game || !slot) return;
    stopClock();
    const g = game;
    const s = slot;
    const t = d();
    const lang = shell.lang();
    const today = shell.today();
    freeStore.saveFreeCellStats(recordFreeCellWon(freeStore.loadFreeCellStats(), g));
    if (s.daily) freeStore.saveFreeCellDayResult(today, s.cells, { hints: g.hints, ms: g.ms });
    if (!tipDone) {
      tipDone = true;
      freeStore.saveFreeCellTipDone();
    }
    hint = null;
    render();
    const lines = g.hints ? [fmt(t.end.hints, { n: g.hints })] : [t.end.clean];
    if (shell.settings().time) lines.push(fmt(t.end.time, { time: clockText(g.ms) }));
    let share: ShareText | null = null;
    if (s.daily) {
      const days = freeStore.loadFreeCellDays();
      const played = Object.keys(days).filter((date) => Object.keys(days[date] ?? {}).length > 0);
      const n = streak(played, today);
      lines.push(plural(lang, n, t.freecell.streak, { n }));
      const params = { name: `${SOLITAIRE.name} · ${t.freecell.title}`, date: shell.dateText(today, 'medium'), hints: g.hints };
      const text = g.hints ? fmt(t.end.share, params) : fmt(t.end.shareClean, params);
      share = { label: t.end.copy, done: t.end.copied, text: SOLITAIRE.links.game ? `${text}\n${SOLITAIRE.links.game}` : text };
    }
    const home = { label: t.end.home, action: shell.close };
    shell.openEnd({
      title: t.end.title,
      highlight: s.daily ? `${t.freecell.daily} · ${shell.dateText(today, 'long')}` : cellsText(),
      lines,
      share,
      secondary: s.daily ? null : home,
      primary: s.daily ? home : { label: t.end.newDeal, action: dealAnew },
    });
  }

  return {
    view,
    slot: () => slot,
    open,
    leave,
    render,
    title: () => (slot?.daily ? d().freecell.daily : d().freecell.title),
    keydown(event, letter) {
      const ctrl = event.ctrlKey || event.metaKey;
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
      const dir = ARROWS[event.key];
      if (dir && game) {
        event.preventDefault();
        table.step(dir);
        return;
      }
      if (letter === 'h') askHint();
      else if (letter === 'f') finishAll();
      else if (letter === 'n') newDeal();
    },
    visibility(visible) {
      if (!visible) {
        stopClock();
        return;
      }
      // another day: the deal of the day becomes today's
      if (slot?.daily && game?.daily && game.daily !== shell.today()) {
        open(slot);
        return;
      }
      startClock();
    },
  };
}
