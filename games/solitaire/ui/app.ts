// The game screen: which screen is open (the start, Klondike, the deal of the day), the deal in play, the hint shown;
// turns taps, drags and keys into moves and draws the result. The rules themselves are in ../core (pure functions);
// the work that takes time (finding a deal that can be won, a hint, the quiet check that a way to the end is left)
// goes in slices (maker.ts).
import { localDateKey, streak } from '../../../shared/core/dates.ts';
import { setTextures } from '../../../shared/ui/textures.ts';
import type { ShareText } from '../../../shared/ui/copy.ts';
import { h } from '../../../shared/ui/dom.ts';
import { TEXTURES } from '../art/textures.ts';
import { SOLITAIRE } from '../config.ts';
import { dailySeed, winnableSeed } from '../core/deals.ts';
import { hintSearch, type Hint } from '../core/hint.ts';
import {
  addTime,
  canFinish,
  canMove,
  countHint,
  deal,
  drawCards,
  finishStep,
  moveCards,
  movingCards,
  undo,
  wasteTop,
  type Klondike,
  type Place,
} from '../core/klondike.ts';
import { longestStreak, recordLeft, recordWon } from '../core/stats.ts';
import { carriedBack, worthChecking } from '../core/stuck.ts';
import { bestPlace } from '../core/tap.ts';
import { createEndDialog } from './end-dialog.ts';
import { homeView, type DailyState } from './home-view.ts';
import { dict, fmt, pickLang, plural, type Dict } from './i18n.ts';
import { backSign } from './icons.ts';
import { keepReady, randomSeed, runSoon } from './maker.ts';
import { createMenuDialog } from './menu-dialog.ts';
import { cardName, targetName } from './names.ts';
import { closeRoute, currentRoute, openRoute, watchRoute } from './route.ts';
import * as store from './storage.ts';
import type { Settings, Slot } from './storage.ts';
import { createTableView, type Target } from './table-view.ts';
import { clockText } from './time.ts';
import { createToolsView } from './tools-view.ts';

/** How often the shown time is updated, ms. */
const TICK_MS = 1000;
/** The pace of finishing by itself: one card home per step, ms (no steps when the system asks for less motion). */
const FINISH_STEP_MS = 110;

const ROUTES = { play: false, daily: true } as const;
type Route = keyof typeof ROUTES;
const isRoute = (r: string): r is Route => r === 'play' || r === 'daily';

/** A latin letter key whatever the keyboard layout (H, D, F, N; Z with Ctrl). */
function letterOf(event: KeyboardEvent): string {
  return event.code.startsWith('Key') ? event.code.slice(3).toLowerCase() : '';
}

const ARROWS: Record<string, 'left' | 'right' | 'up' | 'down'> = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };

interface NoteAction {
  label: string;
  run: () => void;
}

export function startApp(root: HTMLElement): void {
  let settings: Settings = store.loadSettings();
  let lang = pickLang(settings.lang, navigator.languages ?? [navigator.language]);
  let d: Dict = dict(lang);
  let today = localDateKey(new Date());

  /** The open deal's place; null — the start screen. */
  let slot: Slot | null = null;
  let game: Klondike | null = null;
  let stopMaking: (() => void) | null = null;
  let stopHinting: (() => void) | null = null;
  let stopChecking: (() => void) | null = null;
  let finishing: number | null = null;
  let hint: Hint | null = null;
  /**
   * The game found, unasked, that no way to the end is left from this position (core/stuck.ts), and how many moves
   * back the deal can be won again (null — not within reach).
   */
  let deadEnd: { at: Klondike; back: number | null } | null = null;
  /** A short word about the last action (no place, nothing to undo), shown until the next move. */
  let message: string | null = null;
  /** "New deal" was tapped once: the second tap deals. */
  let armedNew = false;
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
  const noteText = h('span', { class: 'note__text' });
  const noteActions = h('span', { class: 'note__actions' });
  const note = h('div', { class: 'note' }, noteText, noteActions);
  const table = createTableView({ tap: onTap, drop: onDrop });
  const preparing = h('p', { class: 'table-wait', role: 'status' });
  const stage = h('div', { class: 'stage' }, table.el, preparing);
  const tools = createToolsView({ hint: askHint, undo: takeBack, newDeal, restart });
  // The note under the table: the columns grow from the top, so a note coming and going does not move them.
  const playView = h('div', { class: 'play' }, info, stage, note, tools.el);

  backBtn.addEventListener('click', closeRoute);
  menuBtn.addEventListener('click', openMenu);

  /** A note longer than its place (large letters on the lowest screens) scrolls by itself: then the keys reach it. */
  function noteByKeys(): void {
    if (note.scrollHeight > note.clientHeight + 1) note.tabIndex = 0;
    else note.removeAttribute('tabindex');
  }
  new ResizeObserver(noteByKeys).observe(note);

  setTextures(document.documentElement, TEXTURES);
  root.replaceChildren(
    h('main', { class: 'app' }, h('header', { class: 'top' }, backBtn, title, menuBtn), content, live, menuDialog.el, endDialog.el),
  );

  // ---------- look ----------
  function applyLook(): void {
    const html = document.documentElement;
    html.lang = lang;
    html.classList.toggle('big', settings.big);
    html.classList.toggle('four', settings.fourColours);
    html.classList.toggle('drawn', settings.look === 'drawn');
    if (settings.theme === 'system') delete html.dataset.theme;
    else html.dataset.theme = settings.theme;
    document.title = d.meta.title;
    document.querySelector('meta[name="description"]')?.setAttribute('content', d.meta.description);
    const bg = getComputedStyle(document.body).backgroundColor;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg);
    backBtn.setAttribute('aria-label', d.app.back);
    menuBtn.setAttribute('aria-label', d.app.menu);
    table.el.setAttribute('aria-label', d.game.table);
  }

  const dateText = (dateKey: string, style: 'long' | 'medium') =>
    new Intl.DateTimeFormat(lang, style === 'long' ? { day: 'numeric', month: 'long' } : { dateStyle: 'medium' }).format(
      new Date(`${dateKey}T12:00:00`),
    );

  function announce(text: string): void {
    live.textContent = text;
  }

  // ---------- screens ----------
  function show(): void {
    const route = currentRoute();
    if (!isRoute(route)) {
      leaveGame();
      store.saveLast(null);
      renderHome();
      return;
    }
    const next: Slot = { daily: ROUTES[route], draw: settings.draw };
    if (!slot || slot.daily !== next.daily || slot.draw !== next.draw || (!game && !stopMaking)) openSlot(next);
    else renderGame();
  }

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

  function leaveGame(): void {
    stopClock();
    stopWork();
    slot = null;
    game = null;
    hint = null;
    deadEnd = null;
  }

  function openSlot(next: Slot): void {
    leaveGame();
    slot = next;
    store.saveLast(next.daily);
    message = null;
    armedNew = false;
    const saved = store.loadPlay(next, today);
    if (saved && (next.daily || !saved.done)) {
      begin(saved);
      return;
    }
    if (!next.daily && settings.deals === 'any') {
      begin(deal(randomSeed(), next.draw));
      return;
    }
    if (!next.daily) {
      const ready = store.loadReady(next.draw);
      if (ready !== null) {
        store.dropReady(next.draw);
        begin(deal(ready, next.draw));
        refillReady();
        return;
      }
    }
    // Make the deal now: today's deal of the day from its date, or a new one that can be won.
    const forSlot = next;
    const start = next.daily ? dailySeed(today, next.draw) : randomSeed();
    renderGame();
    stopMaking = runSoon(winnableSeed(start, next.draw), (seed) => {
      stopMaking = null;
      if (slot !== forSlot) return;
      begin(deal(seed ?? start, forSlot.draw, forSlot.daily ? today : null));
      if (!forSlot.daily) refillReady();
    });
  }

  function begin(g: Klondike): void {
    game = g;
    deadEnd = null;
    if (slot) store.savePlay(slot, g);
    startClock();
    renderGame();
    title.focus();
    checkWay();
  }

  function refillReady(): void {
    keepReady((draw) => store.loadReady(draw) !== null, store.saveReady);
  }

  // ---------- time ----------
  function startClock(): void {
    if (game && !game.done && document.visibilityState === 'visible' && clockFrom === null) clockFrom = performance.now();
  }

  function stopClock(): void {
    if (clockFrom === null || !game || !slot) return;
    game = addTime(game, performance.now() - clockFrom);
    clockFrom = null;
    store.savePlay(slot, game);
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
    const draw = settings.draw;
    const saved = store.loadPlay({ daily: false, draw }, today);
    const day = store.loadPlay({ daily: true, draw }, today);
    const days = store.loadDays();
    const daily: DailyState = days[today]?.[draw] || day?.done ? 'done' : day && day.history.length > 0 ? 'started' : 'new';
    const played = Object.keys(days).filter((date) => Object.keys(days[date] ?? {}).length > 0);
    content.replaceChildren(
      homeView(
        {
          started: !!saved && !saved.done && saved.history.length > 0,
          drawOne: draw === 1,
          daily,
          date: dateText(today, 'long'),
          streak: streak(played, today),
        },
        d,
        lang,
        (isDaily) => openRoute(isDaily ? 'daily' : 'play'),
      ),
    );
  }

  function renderGame(): void {
    applyLook();
    backBtn.hidden = false;
    if (!slot) return;
    title.textContent = slot.daily ? d.game.daily : d.game.title;
    if (content.firstChild !== playView) content.replaceChildren(playView);
    render();
  }

  /** The move a hint shows, for the table. */
  function hintMarks(): { from: Place; index: number; to: Place } | 'stock' | null {
    const m = hint?.kind === 'unsure' ? hint.move : hint;
    if (!m) return null;
    if (m.kind === 'draw') return 'stock';
    if (m.kind === 'move') return { from: m.from, index: m.index, to: m.to };
    return null;
  }

  function hintText(g: Klondike, hm: Hint): { text: string; actions: NoteAction[]; suggestNew: boolean } {
    const moveWords = (m: { from: Place; index: number; to: Place }) => {
      const card = movingCards(g, m.from, m.index)?.[0];
      return { card: card === undefined ? '' : cardName(card, d), target: targetName(m.to, d) };
    };
    if (hm.kind === 'move') return { text: fmt(d.hint.move, moveWords(hm)), actions: [], suggestNew: false };
    if (hm.kind === 'draw') return { text: d.hint.draw, actions: [], suggestNew: false };
    if (hm.kind === 'finish') return { text: d.hint.finish, actions: [{ label: d.game.finish, run: finishAll }], suggestNew: false };
    if (hm.kind === 'unsure') {
      if (hm.move?.kind === 'move') return { text: fmt(d.hint.unsure, moveWords(hm.move)), actions: [], suggestNew: false };
      return { text: d.hint.unsureDraw, actions: [], suggestNew: false };
    }
    const back = hm.back;
    if (back === null) return { text: d.hint.stuckFar, actions: [], suggestNew: true };
    return {
      text: plural(lang, back, d.hint.stuck, { n: back }),
      actions: [{ label: plural(lang, back, d.hint.undoMoves, { n: back }), run: () => takeBackMany(back) }],
      suggestNew: true,
    };
  }

  /**
   * No way to the end is left: back to where the deal can be won, and — standing out among the tools — a new deal
   * (the deal of the day: from its start).
   */
  function deadEndNote(back: number | null): { text: string; actions: NoteAction[]; suggestNew: boolean } {
    const actions: NoteAction[] = [];
    if (back !== null) actions.push({ label: plural(lang, back, d.hint.undoMoves, { n: back }), run: () => takeBackMany(back) });
    return { text: d.game.deadEnd, actions, suggestNew: true };
  }

  /** What the line above the table says now, and what it offers to do there. */
  function noteNow(g: Klondike | null): { text: string; actions: NoteAction[]; suggestNew: boolean } | null {
    if (!g) return { text: d.game.preparing, actions: [], suggestNew: false };
    if (g.done) {
      const action = slot?.daily ? { label: d.end.home, run: closeRoute } : { label: d.end.newDeal, run: dealNow };
      return { text: d.end.title, actions: [action], suggestNew: false };
    }
    if (stopHinting) return { text: d.hint.thinking, actions: [], suggestNew: false };
    if (hint) return hintText(g, hint);
    // before a passing word (a card with no place…): the way out of a dead end stays in sight
    if (deadEnd?.at === g) return deadEndNote(deadEnd.back);
    if (message) return { text: message, actions: [], suggestNew: false };
    if (canFinish(g)) return { text: d.game.finishNote, actions: [{ label: d.game.finish, run: finishAll }], suggestNew: false };
    if (!tipDone) return { text: d.game.tip, actions: [], suggestNew: false };
    return null;
  }

  /** Draws the deal's screen from the state. */
  function render(): void {
    if (!slot) return;
    const g = game;
    infoText.textContent = slot.daily ? fmt(d.home.dailyTitle, { date: dateText(today, 'long') }) : slot.draw === 1 ? d.home.drawOne : d.home.drawThree;
    renderTime();
    preparing.hidden = !!g;
    preparing.textContent = g ? '' : d.game.preparing;
    table.el.hidden = !g;
    const now = noteNow(g);
    note.hidden = !now || (!g && !now.actions.length && now.text === d.game.preparing);
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
    tools.render({ canUndo: !!g && g.history.length > 0, fresh, suggestNew, thinking: !!stopHinting }, d);
    if (g) table.render(g, { hint: hintMarks(), leftHand: settings.leftHand }, d, lang);
    noteByKeys();
  }

  // ---------- moves ----------
  function commit(next: Klondike, words: string | null): void {
    if (!game || !slot || next === game) return;
    // The move that finishes the deal stops the clock: its last stretch counts.
    if (next.done && clockFrom !== null) {
      next = { ...next, ms: next.ms + (performance.now() - clockFrom) };
      clockFrom = null;
    }
    game = next;
    hint = null;
    message = null;
    armedNew = false;
    stopHinting?.();
    stopHinting = null;
    store.savePlay(slot, game);
    if (words) announce(words);
    if (game.done) {
      finish();
      return;
    }
    checkWay();
    render();
  }

  /**
   * After every change: if the player is plainly stuck (core/stuck.ts), the hint's search is asked quietly whether a
   * way to the end is left. It is not a hint: nothing is counted, and nothing is said unless no way is left.
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
      // turning the stock in a dead end leaves it a dead end: no need to ask again
      const back = carriedBack(deadEnd.at, deadEnd.back, g);
      deadEnd = back === undefined ? null : { at: g, back };
      if (deadEnd) return;
    }
    if (!worthChecking(g)) return;
    const forSlot = slot;
    stopChecking = runSoon(hintSearch(g), (found) => {
      stopChecking = null;
      if (slot !== forSlot || game !== g || found.kind !== 'stuck') return;
      deadEnd = { at: g, back: found.back };
      render();
      announce(noteText.textContent ?? '');
    });
  }

  /** Words for a move: the card and where it went, and the card it turned up. */
  function moveWords(before: Klondike, after: Klondike, from: Place, index: number, to: Place): string {
    const card = movingCards(before, from, index)?.[0];
    let words = card === undefined ? '' : fmt(d.game.moved, { card: cardName(card, d), target: targetName(to, d) });
    if (from.kind === 'column' && after.down[from.index]! < before.down[from.index]!) {
      const up = after.columns[from.index]!.at(-1);
      if (up !== undefined) words += ` ${fmt(d.game.turnedUp, { card: cardName(up, d) })}`;
    }
    return words;
  }

  function moveNow(from: Place, index: number, to: Place): boolean {
    if (!game) return false;
    const before = game;
    const after = moveCards(before, from, index, to);
    if (after === before) return false;
    commit(after, moveWords(before, after, from, index, to));
    return true;
  }

  function say(text: string): void {
    message = text;
    announce(text);
    hint = null;
    render();
  }

  function onTap(target: Target): void {
    if (!game || game.done || finishing !== null) return;
    armedNew = false;
    if (target.kind === 'stock') {
      drawNow();
      return;
    }
    if (target.kind === 'empty') return;
    const { place, index } = target;
    if (place.kind === 'column' && index < game.down[place.index]!) {
      table.refuse(target);
      say(d.game.faceDown);
      return;
    }
    if (place.kind === 'foundation') {
      say(d.game.fromHome);
      return;
    }
    const to = bestPlace(game, place, index);
    if (!to) {
      const card = movingCards(game, place, index)?.[0];
      table.refuse(target);
      say(fmt(d.game.noPlace, { card: card === undefined ? '' : cardName(card, d) }));
      return;
    }
    moveNow(place, index, to);
  }

  function onDrop(from: Place, index: number, to: Place): boolean {
    if (!game || game.done || finishing !== null) return false;
    if (!canMove(game, from, index, to)) {
      const card = movingCards(game, from, index)?.[0];
      say(fmt(d.game.cantDrop, { card: card === undefined ? '' : cardName(card, d) }));
      return false;
    }
    return moveNow(from, index, to);
  }

  function drawNow(): void {
    if (!game || game.done) return;
    if (game.talon.length === 0) {
      table.refuse({ kind: 'stock' });
      say(d.game.stockNone);
      return;
    }
    const before = game;
    const after = drawCards(before);
    const top = wasteTop(after);
    commit(after, after.pos === 0 ? d.game.turnedOver : top === null ? null : fmt(d.game.drawn, { card: cardName(top, d) }));
  }

  function takeBack(): void {
    if (!game || game.done || finishing !== null) return;
    const next = undo(game);
    if (next === game) {
      say(d.game.nothingToUndo);
      return;
    }
    commit(next, d.game.undone);
  }

  function takeBackMany(steps: number): void {
    if (!game || game.done) return;
    let next = game;
    for (let k = 0; k < steps; k++) next = undo(next);
    commit(next, d.game.undone);
  }

  /** The deal of the day from its start: every move taken back. */
  function restart(): void {
    if (!game || game.done || finishing !== null) return;
    let next = game;
    while (next.history.length > 0) next = undo(next);
    commit(next, d.game.restarted);
  }

  /** Puts the rest home one card after another (all at once when the system asks for less motion). */
  function finishAll(): void {
    if (!game || !canFinish(game) || finishing !== null) return;
    stopHinting?.();
    stopHinting = null;
    hint = null;
    // One card home per step; the turns of the stock in between take no time.
    const stepOnce = (): boolean => {
      if (!game || !slot) return false;
      let next = game;
      let s = finishStep(next);
      for (let turns = 0; s === 'draw' && turns <= next.talon.length + 1; turns++) {
        next = drawCards(next);
        s = finishStep(next);
      }
      if (!s || s === 'draw') return false;
      next = moveCards(next, s.from, s.index, s.to);
      if (next === game) return false;
      if (next.done) {
        finishing = null;
        commit(next, null);
        return false;
      }
      game = next;
      store.savePlay(slot, game);
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

  /** A new ordinary deal: the unfinished one is counted as played. */
  function dealNow(): void {
    if (!slot) return;
    endDialog.el.close();
    const draw = slot.draw;
    if (game && !game.done) store.saveStats(recordLeft(store.loadStats(), game));
    store.dropPlay({ daily: false, draw });
    if (slot.daily) {
      openRoute('play');
      return;
    }
    slot = null;
    openSlot({ daily: false, draw });
  }

  function newDeal(): void {
    if (!game || !slot || slot.daily) return;
    // the game has said no way is left: one tap deals (otherwise the second tap does)
    if (game.history.length > 0 && !game.done && !armedNew && deadEnd?.at !== game) {
      armedNew = true;
      const text = d.game.newSure;
      announce(text);
      message = text;
      hint = null;
      render();
      return;
    }
    dealNow();
  }

  // ---------- hints ----------
  function askHint(): void {
    if (!game || !slot || game.done || stopHinting || finishing !== null) return;
    if (deadEnd?.at === game) {
      // the game has just said it: no way is left — not counted as a hint
      message = null;
      render();
      announce(noteText.textContent ?? '');
      return;
    }
    stopChecking?.();
    stopChecking = null;
    const g = game;
    const forSlot = slot;
    hint = null;
    message = null;
    armedNew = false;
    stopHinting = runSoon(hintSearch(g), (found) => {
      stopHinting = null;
      if (slot !== forSlot || game !== g) return;
      game = countHint(g);
      store.savePlay(forSlot, game);
      hint = found;
      render();
      announce(noteText.textContent ?? '');
    });
    render();
  }

  // ---------- the end ----------
  function finish(): void {
    if (!game || !slot) return;
    stopClock();
    const g = game;
    const s = slot;
    store.saveStats(recordWon(store.loadStats(), g));
    if (s.daily) store.saveDayResult(today, s.draw, { hints: g.hints, ms: g.ms });
    if (!tipDone) {
      tipDone = true;
      store.saveTipDone();
    }
    hint = null;
    render();
    const lines = g.hints ? [fmt(d.end.hints, { n: g.hints })] : [d.end.clean];
    if (settings.time) lines.push(fmt(d.end.time, { time: clockText(g.ms) }));
    let share: ShareText | null = null;
    if (s.daily) {
      const days = store.loadDays();
      const played = Object.keys(days).filter((date) => Object.keys(days[date] ?? {}).length > 0);
      const n = streak(played, today);
      lines.push(plural(lang, n, d.end.streak, { n }));
      const params = { name: SOLITAIRE.name, date: dateText(today, 'medium'), hints: g.hints };
      const text = g.hints ? fmt(d.end.share, params) : fmt(d.end.shareClean, params);
      share = { label: d.end.copy, done: d.end.copied, text: SOLITAIRE.links.game ? `${text}\n${SOLITAIRE.links.game}` : text };
    }
    const home = { label: d.end.home, action: closeRoute };
    endDialog.open({
      title: d.end.title,
      highlight: s.daily ? fmt(d.home.dailyTitle, { date: dateText(today, 'long') }) : s.draw === 1 ? d.home.drawOne : d.home.drawThree,
      lines,
      share,
      secondary: s.daily ? null : home,
      primary: s.daily ? home : { label: d.end.newDeal, action: dealNow },
    });
  }

  // ---------- menu ----------
  function openMenu(): void {
    const days = store.loadDays();
    const played = Object.keys(days).filter((date) => Object.keys(days[date] ?? {}).length > 0);
    menuDialog.open(
      { d, lang, settings, stats: store.loadStats(), longest: longestStreak(played) },
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
          const drawChanged = patch.draw !== undefined && patch.draw !== settings.draw;
          settings = { ...settings, ...patch };
          store.saveSettings(settings);
          // Another way of turning the stock: that way's own deal opens (each keeps its unfinished one).
          if (drawChanged && slot) {
            const daily = slot.daily;
            stopClock();
            slot = null;
            openSlot({ daily, draw: settings.draw });
            return;
          }
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
    if (!slot || menuDialog.el.open || endDialog.el.open) return;
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
    const dir = ARROWS[event.key];
    if (dir && game) {
      event.preventDefault();
      table.step(dir);
      return;
    }
    if (letter === 'h') askHint();
    else if (letter === 'd') drawNow();
    else if (letter === 'f') finishAll();
    else if (letter === 'n') newDeal();
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

  // Open where the player stopped: the deal open last time, else the start screen.
  const last = store.loadLast();
  if (!isRoute(currentRoute()) && last !== null) openRoute(last ? 'daily' : 'play');
  else show();
  refillReady();
}
