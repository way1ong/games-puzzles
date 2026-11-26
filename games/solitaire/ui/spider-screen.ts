// Spider's screen (docs/solitaire/SPEC.md, "Павук"): the deal in play — an ordinary one or Spider of the day, for the
// number of suits chosen — the line about the deal, the table, the note under it (on a phone held upright, first
// "Turn the phone") and the tools. It turns taps, drags and keys into moves; the rules are in ../core (pure functions); the work
// that takes time (a deal that can be won, a hint, the quiet check that a way is left) goes in slices (maker.ts).
// The start screen, the menu and the top bar belong to app.ts, which opens this screen and passes it what it needs.
import { streak } from '../../../shared/core/dates.ts';
import type { ShareText } from '../../../shared/ui/copy.ts';
import { h } from '../../../shared/ui/dom.ts';
import { SOLITAIRE } from '../config.ts';
import { SUITS } from '../core/cards.ts';
import { spiderChecked, spiderDailySeed, spiderWinnableSeed } from '../core/spider-deals.ts';
import { spiderHintSearch, type SpiderHint, type SpiderWay } from '../core/spider-hint.ts';
import { recordSpiderLeft, recordSpiderWon } from '../core/spider-stats.ts';
import { spiderStuck } from '../core/spider-stuck.ts';
import { spiderBestPlace } from '../core/spider-tap.ts';
import {
  addSpiderTime,
  canMoveRun,
  countSpiderHint,
  dealBlock,
  dealRow,
  faceOf,
  moveRun,
  runStart,
  spiderDeal,
  spiderSuit,
  undoSpider,
  type Spider,
  type SpiderStep,
} from '../core/spider.ts';
import type { EndContent } from './end-dialog.ts';
import { canFullLandscape, enterFullLandscape } from './fullscreen.ts';
import { fmt, plural, type Dict } from './i18n.ts';
import { keepSpiderReady, randomSeed, runSoon } from './maker.ts';
import { cardName } from './names.ts';
import * as spiderStore from './spider-storage.ts';
import type { SpiderSlot } from './spider-storage.ts';
import { createSpiderTableView, type SpiderTarget } from './spider-table-view.ts';
import type { Settings } from './storage.ts';
import { clockText } from './time.ts';
import { createToolsView } from './tools-view.ts';

const ARROWS: Record<string, 'left' | 'right' | 'up' | 'down'> = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };

/** What the screen needs from the app around it. */
export interface SpiderShell {
  dict(): Dict;
  lang(): string;
  settings(): Settings;
  today(): string;
  announce(text: string): void;
  dateText(dateKey: string, style: 'long' | 'medium'): string;
  openEnd(content: EndContent): void;
  /** Back to the start screen. */
  close(): void;
  /** Another deal of Spider (the menu's "new deal" works through it too). */
  openSpider(slot: SpiderSlot): void;
}

interface NoteAction {
  label: string;
  run: () => void;
  /** A quieter button. */
  quiet?: boolean;
}

interface NoteNow {
  text: string;
  actions: NoteAction[];
  suggestNew: boolean;
}

export interface SpiderScreen {
  view: HTMLElement;
  /** The open deal's place; null — none. */
  slot(): SpiderSlot | null;
  open(slot: SpiderSlot): void;
  /** Stops the work and the clock (the deal stays saved). */
  leave(): void;
  render(): void;
  /** The name for the top bar. */
  title(): string;
  keydown(event: KeyboardEvent, letter: string): void;
  /** The page went out of sight, or came back (another day may have begun). */
  visibility(visible: boolean): void;
}

export function createSpiderScreen(shell: SpiderShell): SpiderScreen {
  let slot: SpiderSlot | null = null;
  let game: Spider | null = null;
  let stopMaking: (() => void) | null = null;
  let stopHinting: (() => void) | null = null;
  let stopChecking: (() => void) | null = null;
  let hint: SpiderHint | null = null;
  /** The way the last hint is a step of: while the player follows it, the next hint is its next move. */
  let way: SpiderWay | null = null;
  /** A short word about the last action, shown until the next move. */
  let message: string | null = null;
  /** The game found, unasked, that no way to the end is left from this position, and how far back one is. */
  let deadEnd: { at: Spider; back: number | null } | null = null;
  /** "New deal" was tapped once: the second tap deals. */
  let armedNew = false;
  let tipDone = spiderStore.loadSpiderTipDone();
  let rotateDone = spiderStore.loadRotateTipDone();
  /** When the current stretch of play started (performance.now()); null — the clock stands. */
  let clockFrom: number | null = null;

  // ---------- elements ----------
  const infoText = h('span', { class: 'info__text' });
  const timeEl = h('span', { class: 'info__time', role: 'timer' });
  const info = h('p', { class: 'info' }, infoText, timeEl);
  const noteText = h('span', { class: 'note__text' });
  const noteActions = h('span', { class: 'note__actions' });
  const note = h('div', { class: 'note' }, noteText, noteActions);
  const table = createSpiderTableView({ tap: onTap, drop: onDrop });
  const preparing = h('p', { class: 'table-wait', role: 'status' });
  const stage = h('div', { class: 'stage' }, table.el, preparing);
  const tools = createToolsView({ hint: askHint, undo: takeBack, newDeal, restart });
  const view = h('div', { class: 'play play--spider' }, info, stage, note, tools.el);

  // "Turn the phone" comes and goes with the phone's position
  window.matchMedia('(orientation: portrait)').addEventListener('change', () => {
    if (slot) render();
  });

  /** A note longer than its place (the narrow panel on a phone on its side, large letters) scrolls: then the keys reach it. */
  function noteByKeys(): void {
    if (note.scrollHeight > note.clientHeight + 1) note.tabIndex = 0;
    else note.removeAttribute('tabindex');
  }
  new ResizeObserver(noteByKeys).observe(note);

  const d = () => shell.dict();
  const name = (card: number) => (game ? cardName(faceOf(card, game.suits), d()) : '');

  // ---------- opening a deal ----------
  function stopWork(): void {
    stopMaking?.();
    stopMaking = null;
    stopHinting?.();
    stopHinting = null;
    stopChecking?.();
    stopChecking = null;
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

  function open(next: SpiderSlot): void {
    leave();
    slot = next;
    message = null;
    armedNew = false;
    const today = shell.today();
    const saved = spiderStore.loadSpider(next, today);
    if (saved && (next.daily || !saved.done)) {
      begin(saved);
      return;
    }
    const anyDeal = !spiderChecked(next.suits) || (!next.daily && shell.settings().deals === 'any');
    if (!next.daily && anyDeal) {
      begin(spiderDeal(randomSeed(), next.suits));
      return;
    }
    if (!next.daily) {
      const ready = spiderStore.loadSpiderReady(next.suits);
      if (ready !== null) {
        spiderStore.dropSpiderReady(next.suits);
        begin(spiderDeal(ready, next.suits));
        refillReady(next);
        return;
      }
    }
    // Make the deal now: today's Spider of the day from its date, or a new one that can be won.
    const forSlot = next;
    const start = next.daily ? spiderDailySeed(today, next.suits) : randomSeed();
    render();
    stopMaking = runSoon(spiderWinnableSeed(start, next.suits), (seed) => {
      stopMaking = null;
      if (slot !== forSlot) return;
      begin(spiderDeal(seed ?? start, forSlot.suits, forSlot.daily ? today : null));
      if (!forSlot.daily) refillReady(forSlot);
    });
  }

  function refillReady(s: SpiderSlot): void {
    keepSpiderReady(s.suits, (suits) => spiderStore.loadSpiderReady(suits) !== null, spiderStore.saveSpiderReady);
  }

  function begin(g: Spider): void {
    game = g;
    deadEnd = null;
    if (slot) spiderStore.saveSpider(slot, g);
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
    game = addSpiderTime(game, performance.now() - clockFrom);
    clockFrom = null;
    spiderStore.saveSpider(slot, game);
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

  // ---------- drawing ----------
  function suitsText(): string {
    if (!slot) return '';
    const text = plural(shell.lang(), slot.suits, d().spider.suits, { n: slot.suits });
    return spiderChecked(slot.suits) ? text : `${text} · ${d().spider.anyDeals}`;
  }

  function hintMarks(): { from: number; index: number; to: number } | 'stock' | null {
    const m = hint?.kind === 'unsure' ? hint.move : hint;
    if (!m) return null;
    if (m.kind === 'deal') return 'stock';
    if (m.kind === 'move') return { from: m.from, index: m.index, to: m.to };
    return null;
  }

  function moveText(m: { from: number; index: number; to: number }): { card: string; target: string } {
    const card = game?.columns[m.from]?.[m.index];
    return { card: card === undefined ? '' : name(card), target: fmt(d().game.toColumn, { n: m.to + 1 }) };
  }

  function hintText(hm: SpiderHint): NoteNow {
    const t = d();
    if (hm.kind === 'move') return { text: fmt(t.hint.move, moveText(hm)), actions: [], suggestNew: false };
    if (hm.kind === 'deal') return { text: t.spider.hintDeal, actions: [], suggestNew: false };
    if (hm.kind === 'unsure') {
      if (hm.move?.kind === 'move') return { text: fmt(t.hint.unsure, moveText(hm.move)), actions: [], suggestNew: false };
      return { text: t.spider.unsureDeal, actions: [], suggestNew: false };
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

  function noteNow(g: Spider | null): NoteNow | null {
    const t = d();
    if (!g) return { text: t.game.preparing, actions: [], suggestNew: false };
    if (g.done) {
      const action = slot?.daily ? { label: t.end.home, run: shell.close } : { label: t.end.newDeal, run: dealAnew };
      return { text: t.end.title, actions: [action], suggestNew: false };
    }
    if (stopHinting) return { text: t.hint.thinking, actions: [], suggestNew: false };
    if (hint) return hintText(hint);
    if (deadEnd?.at === g) return deadEndNote(deadEnd.back);
    if (message) return { text: message, actions: [], suggestNew: false };
    // a phone held upright: the cards get bigger on its side — said first, until put away (decision of 26.11)
    if (!rotateDone && window.matchMedia('(orientation: portrait) and (pointer: coarse)').matches) {
      const actions: NoteAction[] = [];
      if (canFullLandscape()) actions.push({ label: t.spider.fullscreen, run: fullLandscape });
      actions.push({ label: t.spider.rotateHide, run: hideRotate, quiet: true });
      return { text: t.spider.rotate, actions, suggestNew: false };
    }
    if (!tipDone) return { text: t.spider.tip, actions: [], suggestNew: false };
    return null;
  }

  function hideRotate(): void {
    rotateDone = true;
    spiderStore.saveRotateTipDone();
    render();
  }

  function fullLandscape(): void {
    void enterFullLandscape().then((ok) => {
      if (!ok) say(d().spider.fullscreenFailed);
    });
  }

  function render(): void {
    if (!slot) return;
    const g = game;
    const t = d();
    infoText.textContent = slot.daily ? `${suitsText()} · ${shell.dateText(shell.today(), 'long')}` : suitsText();
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
        const b = h('button', { class: a.quiet ? 'btn btn--ghost' : 'btn btn--primary', type: 'button' }, a.label);
        b.addEventListener('click', a.run);
        return b;
      }),
    );
    tools.el.hidden = !g || g.done;
    const suggestNew = now?.suggestNew ?? false;
    // Spider of the day has no new deal; where no way is found from here, "Start over" takes its place
    const fresh = !slot.daily ? 'deal' : suggestNew && !!g && g.history.length > 0 ? 'restart' : null;
    tools.render({ canUndo: !!g && g.history.length > 0, fresh, suggestNew, thinking: !!stopHinting }, t);
    if (g) table.render(g, { hint: hintMarks() }, t, shell.lang());
    noteByKeys();
  }

  // ---------- moves ----------
  /** Words for a step: the card moved and where, the card turned up, a run gone home. */
  function stepWords(before: Spider, after: Spider): string {
    const t = d();
    const step: SpiderStep | undefined = after.history[after.history.length - 1];
    if (!step) return '';
    const words: string[] = [];
    const runs = step.kind === 'move' ? (step.run ? [step.run] : []) : step.runs;
    if (step.kind === 'move') {
      const card = before.columns[step.from]![before.columns[step.from]!.length - step.count]!;
      words.push(fmt(t.game.moved, { card: name(card), target: fmt(t.game.toColumn, { n: step.to + 1 }) }));
      if (step.flipped) {
        const up = after.columns[step.from]!.at(-1);
        if (up !== undefined) words.push(fmt(t.game.turnedUp, { card: name(up) }));
      }
    } else words.push(t.spider.dealt);
    for (const run of runs) words.push(fmt(t.spider.runHome, { suit: t.cards.suits[SUITS[spiderSuit(run.cards[0]!, before.suits)]!] }));
    return words.join(' ');
  }

  function commit(next: Spider, words: string | null): void {
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
    spiderStore.saveSpider(slot, game);
    if (words) shell.announce(words);
    if (game.done) {
      finish();
      return;
    }
    checkWay();
    render();
  }

  /**
   * After every change: if no move that leads anywhere is left (core/spider-stuck.ts), the hint's search is asked
   * quietly whether a way to the end is left. It is not a hint: nothing is counted, nothing said unless no way is left.
   */
  function checkWay(): void {
    stopChecking?.();
    stopChecking = null;
    const g = game;
    if (!g || !slot || g.done) {
      deadEnd = null;
      return;
    }
    if (deadEnd && deadEnd.at !== g) deadEnd = null;
    if (deadEnd || !spiderStuck(g)) return;
    const forSlot = slot;
    stopChecking = runSoon(spiderHintSearch(g, way), (found) => {
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

  function moveNow(from: number, index: number, to: number): boolean {
    if (!game) return false;
    const before = game;
    const after = moveRun(before, from, index, to);
    if (after === before) return false;
    commit(after, stepWords(before, after));
    return true;
  }

  function onTap(target: SpiderTarget): void {
    if (!game || game.done) return;
    armedNew = false;
    const t = d();
    if (target.kind === 'stock') {
      dealNow();
      return;
    }
    if (target.kind === 'empty') return;
    const { column, index } = target;
    if (index < game.down[column]!) {
      table.refuse(target);
      say(t.game.faceDown);
      return;
    }
    if (index < runStart(game, game.suits, column)) {
      table.refuse(target);
      say(fmt(t.spider.notRun, { card: name(game.columns[column]![index]!) }));
      return;
    }
    const to = spiderBestPlace(game, game.suits, column, index);
    if (to === null) {
      table.refuse(target);
      say(fmt(t.game.noPlace, { card: name(game.columns[column]![index]!) }));
      return;
    }
    moveNow(column, index, to);
  }

  function onDrop(from: number, index: number, to: number): boolean {
    if (!game || game.done) return false;
    if (!canMoveRun(game, game.suits, from, index, to)) {
      say(fmt(d().game.cantDrop, { card: name(game.columns[from]![index]!) }));
      return false;
    }
    return moveNow(from, index, to);
  }

  function dealNow(): void {
    if (!game || game.done) return;
    const block = dealBlock(game);
    if (block) {
      table.refuse({ kind: 'stock' });
      say(block === 'empty-column' ? d().spider.emptyColumn : d().spider.stockNone);
      return;
    }
    const before = game;
    const after = dealRow(before);
    commit(after, stepWords(before, after));
  }

  function takeBack(): void {
    if (!game || game.done) return;
    const next = undoSpider(game);
    if (next === game) {
      say(d().game.nothingToUndo);
      return;
    }
    commit(next, d().game.undone);
  }

  function takeBackMany(steps: number): void {
    if (!game || game.done) return;
    let next = game;
    for (let k = 0; k < steps; k++) next = undoSpider(next);
    commit(next, d().game.undone);
  }

  /** Spider of the day from its start: every move taken back. */
  function restart(): void {
    if (!game || game.done) return;
    let next = game;
    while (next.history.length > 0) next = undoSpider(next);
    commit(next, d().game.restarted);
  }

  /** A new ordinary deal: the unfinished one is counted as played. */
  function dealAnew(): void {
    if (!slot) return;
    const s = slot;
    if (game && !game.done) spiderStore.saveSpiderStats(recordSpiderLeft(spiderStore.loadSpiderStats(), game));
    spiderStore.dropSpider({ daily: false, suits: s.suits });
    shell.openSpider({ daily: false, suits: s.suits });
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
    if (!game || !slot || game.done || stopHinting) return;
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
    stopHinting = runSoon(spiderHintSearch(g, way), (found) => {
      stopHinting = null;
      if (slot !== forSlot || game !== g) return;
      game = countSpiderHint(g);
      spiderStore.saveSpider(forSlot, game);
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
    spiderStore.saveSpiderStats(recordSpiderWon(spiderStore.loadSpiderStats(), g));
    if (s.daily) spiderStore.saveSpiderDayResult(today, s.suits, { hints: g.hints, ms: g.ms });
    if (!tipDone) {
      tipDone = true;
      spiderStore.saveSpiderTipDone();
    }
    hint = null;
    render();
    const lines = g.hints ? [fmt(t.end.hints, { n: g.hints })] : [t.end.clean];
    if (shell.settings().time) lines.push(fmt(t.end.time, { time: clockText(g.ms) }));
    let share: ShareText | null = null;
    if (s.daily) {
      const days = spiderStore.loadSpiderDays();
      const played = Object.keys(days).filter((date) => Object.keys(days[date] ?? {}).length > 0);
      const n = streak(played, today);
      lines.push(plural(lang, n, t.spider.streak, { n }));
      const params = { name: `${SOLITAIRE.name} · ${t.spider.title}`, date: shell.dateText(today, 'medium'), hints: g.hints };
      const text = g.hints ? fmt(t.end.share, params) : fmt(t.end.shareClean, params);
      share = { label: t.end.copy, done: t.end.copied, text: SOLITAIRE.links.game ? `${text}\n${SOLITAIRE.links.game}` : text };
    }
    const home = { label: t.end.home, action: shell.close };
    shell.openEnd({
      title: t.end.title,
      highlight: s.daily ? `${t.spider.daily} · ${shell.dateText(today, 'long')}` : suitsText(),
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
    title: () => (slot?.daily ? d().spider.daily : d().spider.title),
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
      else if (letter === 'd') dealNow();
      else if (letter === 'n') newDeal();
    },
    visibility(visible) {
      if (!visible) {
        stopClock();
        return;
      }
      // another day: Spider of the day becomes today's
      if (slot?.daily && game?.daily && game.daily !== shell.today()) {
        open(slot);
        return;
      }
      startClock();
    },
  };
}
