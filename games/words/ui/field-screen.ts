// The Word Field screen (the second mode, decision of 25.11): a level or the daily field — the field, the word
// being made, the verdict of the last try, words left, bonus words, hints, time — and the keys. The rules are in
// ../core (field.ts, field-play.ts, field-solve.ts); the start screen, the menu and the windows belong to app.ts.
import { h } from '../../../shared/ui/dom.ts';
import type { ShareText } from '../../../shared/ui/copy.ts';
import { WORDS, type WordLang } from '../config.ts';
import type { Dictionary } from '../core/dictionary.ts';
import { makeFieldDaily, makeFieldLevel, touching } from '../core/field.ts';
import { addFieldTime, freeCells, hintNext, hintStart, hintWord, newFieldPlay, pathForTiles, tryFieldPath, type FieldPlay, type FieldVerdict } from '../core/field-play.ts';
import { makeSolver, type Solver } from '../core/field-solve.ts';
import { tilesOf } from '../core/letters.ts';
import { streakWithGrace } from '../core/streak.ts';
import type { EndContent } from './end-dialog.ts';
import { createFieldView, HUES } from './field-view.ts';
import type { HintOption } from './hint-dialog.ts';
import { fmt, plural, type Dict } from './i18n.ts';
import { bonusSign, checkSign, clearSign, hintSign, reportSign } from './icons.ts';
import type { SoundKind } from './sound.ts';
import * as store from './storage.ts';
import type { Settings, Track } from './storage.ts';
import { clockText } from './time.ts';

export type FieldScreenName = 'field' | 'field-daily';
type FieldHint = 'start' | 'next' | 'word';

export interface FieldScreenDeps {
  texts(): Dict;
  lang(): WordLang;
  settings(): Settings;
  track(): Track;
  today(): string;
  dateText(dateKey: string, style: 'long' | 'medium'): string;
  loadDictionary(lang: WordLang, huTiles: boolean): Promise<Dictionary>;
  setTitle(text: string): void;
  focusTitle(): void;
  announce(text: string): void;
  feedback(kind: SoundKind): void;
  openHints(options: readonly HintOption<FieldHint>[], choose: (kind: FieldHint) => void): void;
  openBonus(words: readonly string[]): void;
  openEnd(content: EndContent): void;
  /** Back to the start screen. */
  home(): void;
  reported(entry: store.Reported): void;
  tipDone(): boolean;
  markTipDone(): void;
}

export interface FieldScreen {
  el: HTMLElement;
  open(screen: FieldScreenName): void;
  leave(): void;
  render(): void;
  key(event: KeyboardEvent): void;
  /** The page was hidden (true) or shown again (false). */
  hidden(hidden: boolean): void;
  /** Whether a field is being played (keys go to it). */
  active(): boolean;
}

/** How long a placed word lights up, ms (the same value drives the CSS animation). */
const LIGHT_MS = 700;
const TICK_MS = 1000;

export function createFieldScreen(deps: FieldScreenDeps): FieldScreen {
  let screen: FieldScreenName | null = null;
  let play: FieldPlay | null = null;
  let playTrack: Track = deps.track();
  let solver: Solver | null = null;
  let dictionary: Dictionary | null = null;
  let path: number[] = [];
  let typed = '';
  /** The last try: a verdict of the rules, or "absent" — typed letters that make no path on the field. */
  let verdict: { kind: FieldVerdict | 'absent'; text: string } | null = null;
  let failed = false;
  let clockFrom: number | null = null;
  let generation = 0;

  const d = () => deps.texts();

  // ---------- elements ----------
  const leftEl = h('span', { class: 'info__left' });
  const timeEl = h('span', { class: 'info__time', role: 'timer' });
  const hintBtn = h('button', { class: 'tool', type: 'button' }, hintSign(), h('span', { class: 'tool__label' }));
  const bonusCount = h('span', { class: 'tool__count' });
  const bonusBtn = h('button', { class: 'tool', type: 'button' }, bonusSign(), h('span', { class: 'tool__label' }), bonusCount);
  // Words left and time above the field; every button below it, so the field gets the height (a small phone keeps
  // 44 px cells on the biggest field).
  const info = h('div', { class: 'info info--field' }, h('p', { class: 'info__text' }, leftEl, timeEl));
  const view = createFieldView({ change: onPath, submit });
  const waitEl = h('p', { class: 'board-wait', role: 'status' });
  const readable = h('div', { class: 'visually-hidden' });
  const stage = h('div', { class: 'stage stage--field' }, view.el, waitEl);
  const currentEl = h('p', { class: 'current', 'aria-hidden': 'true' });
  const verdictText = h('span', {});
  const reportBtn = h('button', { class: 'btn btn--ghost btn--small', type: 'button' }, reportSign(), h('span', {}));
  const verdictEl = h('div', { class: 'verdict' }, verdictText, reportBtn);
  const tipEl = h('p', { class: 'tip' });
  const statusEl = h('div', { class: 'status' }, currentEl, verdictEl, tipEl);
  const checkBtn = h('button', { class: 'tool tool--main', type: 'button' }, checkSign(), h('span', { class: 'tool__label' }));
  const clearBtn = h('button', { class: 'tool', type: 'button' }, clearSign(), h('span', { class: 'tool__label' }));
  const tools = h('div', { class: 'field-tools' }, hintBtn, bonusBtn, checkBtn, clearBtn);
  const side = h('div', { class: 'field-side' }, statusEl, tools);
  const el = h('div', { class: 'field-play' }, info, stage, side, readable);

  hintBtn.addEventListener('click', openHints);
  bonusBtn.addEventListener('click', () => play && deps.openBonus(play.bonus));
  checkBtn.addEventListener('click', () => (typed ? submitTyped() : submit(path)));
  clearBtn.addEventListener('click', () => {
    typed = '';
    onPath([]);
  });
  reportBtn.addEventListener('click', () => {
    if (!verdict) return;
    deps.reported({ lang: deps.lang(), word: verdict.text, verdict: verdict.kind });
    reportBtn.hidden = true;
    deps.announce(fmt(d().game.reported, { word: verdict.text }));
    verdictText.textContent = fmt(d().game.reported, { word: verdict.text });
  });

  // ---------- opening and leaving ----------
  function open(next: FieldScreenName): void {
    leave();
    screen = next;
    path = [];
    typed = '';
    verdict = null;
    failed = false;
    const mine = ++generation;
    const settings = deps.settings();
    const lang = deps.lang();
    render();
    deps
      .loadDictionary(lang, settings.huTiles)
      .then((loaded) => {
        if (mine !== generation) return;
        dictionary = loaded;
        window.setTimeout(() => {
          if (mine !== generation) return;
          const today = deps.today();
          const track = deps.track();
          const saved = store.loadFieldPlay(track, next === 'field-daily' ? today : null);
          begin(saved ?? newFieldPlay(next === 'field-daily' ? makeFieldDaily(loaded, today) : makeFieldLevel(loaded, store.loadFieldReached(track))));
        }, 0);
      })
      .catch(() => {
        if (mine !== generation) return;
        failed = true;
        render();
      });
  }

  function begin(p: FieldPlay): void {
    play = p;
    playTrack = deps.track();
    solver = dictionary ? makeSolver(dictionary, p.field) : null;
    path = [];
    store.saveFieldPlay(playTrack, p);
    startClock();
    render();
    deps.focusTitle();
  }

  function leave(): void {
    stopClock();
    generation++;
    screen = null;
    play = null;
    solver = null;
  }

  // ---------- time ----------
  function startClock(): void {
    if (play && !play.done && document.visibilityState === 'visible' && clockFrom === null) clockFrom = performance.now();
  }

  function stopClock(): void {
    if (clockFrom === null || !play) return;
    play = addFieldTime(play, performance.now() - clockFrom);
    clockFrom = null;
    store.saveFieldPlay(playTrack, play);
  }

  const playedMs = () => (play ? play.ms + (clockFrom === null ? 0 : performance.now() - clockFrom) : 0);

  /** A move that ends the field stops the clock: its last stretch counts. */
  function withTime(next: FieldPlay): FieldPlay {
    if (!next.done || clockFrom === null) return next;
    const timed = { ...next, ms: next.ms + (performance.now() - clockFrom) };
    clockFrom = null;
    return timed;
  }

  window.setInterval(() => {
    if (play && deps.settings().time) renderTime();
  }, TICK_MS);

  function renderTime(): void {
    timeEl.hidden = !deps.settings().time || !play;
    if (!timeEl.hidden) timeEl.textContent = clockText(playedMs());
  }

  // ---------- drawing ----------
  /** A colour for each placed word, unlike the touching words placed before it. */
  function hues(p: FieldPlay): number[] {
    const out: number[] = [];
    const owner = new Map<number, number>();
    p.placed.forEach((w, k) => {
      const near = new Set<number>();
      for (const c of w.path) {
        for (const [cell, other] of owner) if (touching(p.field.cols, c, cell)) near.add(out[other]!);
      }
      const hue = Array.from({ length: HUES }, (_, i) => i + 1).find((x) => !near.has(x)) ?? (k % HUES) + 1;
      out.push(hue);
      for (const c of w.path) owner.set(c, k);
    });
    return out;
  }

  const tipText = () => {
    const s = deps.settings();
    return s.input === 'swipe' ? d().field.tipSwipe : s.input === 'tap' ? d().field.tipTap : d().field.tipBoth;
  };

  function render(): void {
    if (!screen) return;
    const texts = d();
    const p = play;
    const settings = deps.settings();
    const today = deps.today();
    deps.setTitle(
      screen === 'field-daily'
        ? fmt(texts.field.dailyTitle, { date: deps.dateText(today, 'long') })
        : fmt(texts.field.level, { n: p?.field.number ?? store.loadFieldReached(deps.track()) }),
    );
    waitEl.hidden = !!p;
    waitEl.textContent = failed ? texts.game.loadFailed : texts.game.preparing;
    view.el.hidden = !p;
    info.hidden = !p;
    side.hidden = !p;
    if (!p) return;
    hintBtn.querySelector('.tool__label')!.textContent = texts.tools.hint;
    bonusBtn.querySelector('.tool__label')!.textContent = texts.field.bonus;
    checkBtn.querySelector('.tool__label')!.textContent = texts.tools.check;
    clearBtn.querySelector('.tool__label')!.textContent = texts.tools.clear;

    const left = p.plan.length;
    leftEl.textContent = settings.showLeft && !p.done ? plural(deps.lang(), left, texts.game.wordsLeft, { n: left }) : '';
    renderTime();
    bonusBtn.hidden = !settings.showBonus;
    bonusCount.textContent = p.bonus.length ? String(p.bonus.length) : '';
    hintBtn.setAttribute('aria-disabled', String(p.done));
    view.render({ field: p.field, placed: p.placed, hues: hues(p), hint: p.hint, path, input: settings.input });

    const making = typed ? typed : path.map((c) => p.field.cells[c]).join('');
    currentEl.textContent = making.toUpperCase();
    currentEl.hidden = !making;
    renderVerdict();
    verdictEl.hidden = !!making || !verdict;
    tipEl.textContent = tipText();
    tipEl.hidden = !!making || !!verdict || deps.tipDone() || p.done;
    checkBtn.hidden = settings.input === 'swipe' && !typed;
    checkBtn.setAttribute('aria-disabled', String((typed ? tilesOf(deps.lang(), typed, { huTiles: settings.huTiles }).length : path.length) < WORDS.minWord));
    clearBtn.setAttribute('aria-disabled', String(!path.length && !typed));
    renderReadable(p, texts);
  }

  /** For readers of the screen: the field row by row (taken cells as dashes) and the words placed. */
  function renderReadable(p: FieldPlay, texts: Dict): void {
    const free = freeCells(p);
    const rows: HTMLElement[] = [];
    for (let r = 0; r < p.field.rows; r++) {
      const letters = p.field.cells.slice(r * p.field.cols, (r + 1) * p.field.cols).map((t, c) => (free[r * p.field.cols + c] ? t.toUpperCase() : '—'));
      rows.push(h('li', {}, fmt(texts.field.row, { n: r + 1, letters: letters.join(' ') })));
    }
    readable.replaceChildren(
      h('p', {}, texts.field.howToType),
      h('ol', { 'aria-label': texts.field.label }, ...rows),
      h('p', {}, p.placed.length ? fmt(texts.field.placedList, { words: p.placed.map((w) => w.text).join(', ') }) : ''),
    );
  }

  function renderVerdict(): void {
    const texts = d();
    if (!verdict) {
      verdictText.textContent = '';
      reportBtn.hidden = true;
      return;
    }
    const word = verdict.text;
    const lines: Record<FieldVerdict | 'absent', string> = {
      found: fmt(texts.game.found, { word }),
      other: fmt(texts.field.other, { word }),
      stuck: fmt(texts.field.stuck, { word }),
      again: fmt(texts.game.again, { word }),
      short: plural(deps.lang(), WORDS.minWord, texts.game.short, { n: WORDS.minWord }),
      unknown: fmt(texts.game.unknown, { word }),
      absent: fmt(texts.field.notOnField, { word }),
    };
    verdictText.textContent = lines[verdict.kind];
    verdictEl.dataset.kind = verdict.kind === 'other' ? 'found' : verdict.kind === 'stuck' ? 'bonus' : verdict.kind;
    reportBtn.hidden = !['found', 'other', 'stuck', 'unknown'].includes(verdict.kind);
    reportBtn.querySelector('span')!.textContent = fmt(texts.game.report, { word });
  }

  // ---------- moves ----------
  function onPath(next: number[]): void {
    path = next;
    typed = '';
    if (verdict && next.length) verdict = null;
    render();
  }

  function submit(cells: readonly number[]): void {
    if (!play || !solver || !dictionary || play.done) return;
    path = [];
    typed = '';
    if (!cells.length) {
      render();
      return;
    }
    const s = solver;
    const result = tryFieldPath(play, cells, { accepts: dictionary.accepts, complete: (free) => s.complete(free) });
    after(result.play, result.verdict, result.text);
  }

  function submitTyped(): void {
    if (!play || !solver || play.done) return;
    const tiles = tilesOf(deps.lang(), typed, { huTiles: deps.settings().huTiles });
    const found = pathForTiles(play, tiles, solver.find);
    if (!found) {
      const text = tiles.join('');
      typed = '';
      verdict = { kind: tiles.length < WORDS.minWord ? 'short' : 'absent', text };
      render();
      deps.announce(verdictText.textContent ?? '');
      return;
    }
    submit(found);
  }

  function after(next: FieldPlay, kind: FieldVerdict, text: string): void {
    if (!play) return;
    const before = play;
    play = withTime(next);
    verdict = { kind, text };
    if (!deps.tipDone() && (kind === 'found' || kind === 'other')) deps.markTipDone();
    if (play !== before) store.saveFieldPlay(playTrack, play);
    if (kind === 'found' || kind === 'other') deps.feedback('found');
    else if (kind === 'stuck') deps.feedback('bonus');
    render();
    deps.announce(verdictText.textContent ?? '');
    if (play.done) finish();
  }

  // ---------- hints ----------
  function openHints(): void {
    if (!play || play.done) return;
    const texts = d();
    deps.openHints(
      [
        { kind: 'start', label: texts.field.hintStart, disabled: !!play.hint },
        { kind: 'next', label: texts.field.hintNext },
        { kind: 'word', label: texts.field.hintWord },
      ],
      useHint,
    );
  }

  function useHint(kind: FieldHint): void {
    if (!play || play.done) return;
    const next = kind === 'start' ? hintStart(play) : kind === 'next' ? hintNext(play) : hintWord(play);
    if (next === play) return;
    play = withTime(next);
    store.saveFieldPlay(playTrack, play);
    render();
    if (play.done) finish();
  }

  // ---------- the end ----------
  function finish(): void {
    if (!play) return;
    const p = play;
    const texts = d();
    const lang = deps.lang();
    const settings = deps.settings();
    store.saveFieldPlay(playTrack, p);
    store.recordFieldDone(p);
    const daily = p.field.daily;
    if (daily) store.saveFieldDayResult(daily, p.field.lang, { hints: p.hints, ms: p.ms });
    else {
      store.saveFieldReached(playTrack, (p.field.number ?? 0) + 1);
      store.dropFieldPlay(playTrack);
    }
    deps.feedback('done');
    const lines = [plural(lang, p.placed.length, texts.end.words, { n: p.placed.length })];
    if (p.bonus.length && settings.showBonus) lines.push(plural(lang, p.bonus.length, texts.end.bonus, { n: p.bonus.length }));
    lines.push(p.hints ? plural(lang, p.hints, texts.end.hints, { n: p.hints }) : texts.end.clean);
    if (settings.time) lines.push(fmt(texts.end.time, { time: clockText(p.ms) }));
    let share: ShareText | null = null;
    if (daily) {
      const days = store.loadFieldDays();
      const played = Object.keys(days).filter((date) => days[date]?.[lang as WordLang]);
      const n = streakWithGrace(played, deps.today(), settings.grace ? WORDS.graceDays : 0);
      lines.push(plural(lang, n, texts.end.streak, { n }));
      const params = { name: `${WORDS.name} · ${texts.home.field}`, date: deps.dateText(daily, 'medium'), n: p.hints };
      const text = p.hints ? plural(lang, p.hints, texts.end.shareHints, params) : fmt(texts.end.shareClean, params);
      share = { label: texts.end.copy, done: texts.end.copied, text: WORDS.links.game ? `${text}\n${WORDS.links.game}` : text };
    }
    const home = { label: texts.end.home, action: deps.home };
    window.setTimeout(
      () =>
        deps.openEnd({
          title: daily ? texts.end.dailyTitle : fmt(texts.end.title, { n: p.field.number ?? 0 }),
          highlight: null,
          lines,
          share,
          secondary: daily ? null : home,
          primary: daily ? home : { label: texts.end.next, action: () => open('field') },
        }),
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : LIGHT_MS,
    );
  }

  // ---------- keys ----------
  function key(event: KeyboardEvent): void {
    if (!play || play.done) return;
    if (event.key === 'Escape') {
      typed = '';
      onPath([]);
      return;
    }
    if (event.key === 'Enter') {
      if (!typed && !path.length && (event.target as HTMLElement | null)?.closest('button')) return;
      event.preventDefault();
      if (typed) submitTyped();
      else submit(path);
      return;
    }
    if (event.key === 'Backspace') {
      event.preventDefault();
      if (typed) typed = typed.slice(0, -1);
      else path = path.slice(0, -1);
      render();
      return;
    }
    if (event.key === '?') {
      event.preventDefault();
      openHints();
      return;
    }
    const ch = event.key.toLowerCase();
    if (ch.length !== 1 || !/\p{L}/u.test(ch)) return;
    event.preventDefault();
    path = [];
    verdict = null;
    typed += ch;
    render();
  }

  return {
    el,
    open,
    leave,
    render,
    key,
    hidden(isHidden) {
      if (isHidden) stopClock();
      else startClock();
    },
    active: () => !!screen,
  };
}
