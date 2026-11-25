// The game screen: the start screen or a level (of the sequence or the daily puzzle); the word being made on
// the wheel, the verdict of the last try, hints, time. Turns touches and keys into moves and draws the result.
// The rules themselves are in ../core (pure functions).
import { localDateKey } from '../../../shared/core/dates.ts';
import type { ShareText } from '../../../shared/ui/copy.ts';
import { h } from '../../../shared/ui/dom.ts';
import { WORDS, WORD_LANGS, type WordLang } from '../config.ts';
import type { Dictionary } from '../core/dictionary.ts';
import { makeDaily, makeLevel } from '../core/level.ts';
import { meaningOf } from '../core/meanings.ts';
import { addTime, missing, newPlay, openCell, openFirstLetter, openWord, tryWord, type Play, type Verdict } from '../core/play.ts';
import { streakWithGrace } from '../core/streak.ts';
import { typeKey, type Typing } from '../core/typing.ts';
import { createBonusDialog } from './bonus-dialog.ts';
import { createCrosswordView } from './crossword-view.ts';
import { loadDictionary } from './dict-load.ts';
import { createEndDialog } from './end-dialog.ts';
import { createFieldScreen, type FieldScreenName } from './field-screen.ts';
import { createHintDialog } from './hint-dialog.ts';
import { homeView } from './home-view.ts';
import { dict, fmt, pickLang, plural, type Dict } from './i18n.ts';
import { backSign, bonusSign, checkSign, clearSign, hintSign, reportSign, shuffleSign } from './icons.ts';
import { createMeaningDialog, meaningList, type WordMeaning } from './meaning-dialog.ts';
import { loadMeanings } from './meanings-load.ts';
import { createMenuDialog } from './menu-dialog.ts';
import { closeRoute, currentRoute, openRoute, watchRoute } from './route.ts';
import { playSound, type SoundKind } from './sound.ts';
import * as store from './storage.ts';
import type { Settings, Track } from './storage.ts';
import { clockText } from './time.ts';
import { createWheelView } from './wheel-view.ts';

/** How long a found word lights up on the crossword, ms (the same value drives the CSS animation). */
const LIGHT_MS = 700;
/** Vibration patterns, ms: a word found, a bonus word, the level done. */
const BUZZ = { found: 15, bonus: [10, 30, 10], done: [30, 60, 30, 60, 60] } as const;
/** How often the shown time is updated, ms. */
const TICK_MS = 1000;

type Screen = 'level' | 'daily';
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function asLang(code: string): WordLang {
  return (WORD_LANGS as readonly string[]).includes(code) ? (code as WordLang) : 'en';
}

export function startApp(root: HTMLElement): void {
  let settings: Settings = store.loadSettings();
  let lang = asLang(pickLang(settings.lang, navigator.languages ?? [navigator.language]));
  let d: Dict = dict(lang);
  let today = localDateKey(new Date());

  let screen: Screen | null = null;
  let dictionary: Dictionary | null = null;
  let play: Play | null = null;
  /** The wheel as shown (shuffling changes the order); `selected` points into it. */
  let wheel: string[] = [];
  let selected: number[] = [];
  let verdict: { kind: Verdict; text: string } | null = null;
  let justFound: string | null = null;
  let choosing = false;
  let failed = false;
  let tipDone = store.loadTipDone();
  let clockFrom: number | null = null;
  /** A key typed that may still begin a two-character Hungarian tile (core/typing.ts). */
  let pending: Typing['pending'] = null;
  /** Said words alternate with a trailing no-break space, so the same words twice are said twice. */
  let saidAgain = false;
  /** Loads and level-making of an earlier screen are dropped when the screen changes. */
  let generation = 0;

  const track = (): Track => ({ lang, tiles: settings.huTiles });
  /**
   * The track the level being played belongs to: it is always saved there, even when the language or the tile
   * setting has just changed (saving under the new one would overwrite that track's own level).
   */
  let playTrack: Track = track();

  // ---------- elements ----------
  const title = h('h1', { class: 'top__name', tabindex: -1 });
  const backBtn = h('button', { class: 'icon-btn', type: 'button' }, backSign());
  const menuBtn = h('button', { class: 'icon-btn', type: 'button' }, h('span', { class: 'icon-menu', 'aria-hidden': 'true' }));
  const content = h('div', { class: 'content' });
  const live = h('p', { class: 'visually-hidden', 'aria-live': 'polite' });
  const menuDialog = createMenuDialog();
  const endDialog = createEndDialog();
  const hintDialog = createHintDialog();
  const bonusDialog = createBonusDialog();
  const meaningDialog = createMeaningDialog();
  /** The Word Field screen (second mode), when one of its routes is open. */
  let fieldOn: FieldScreenName | null = null;
  const field = createFieldScreen({
    texts: () => d,
    lang: () => lang,
    settings: () => settings,
    track,
    today: () => today,
    dateText: (key, style) => dateText(key, style),
    loadDictionary,
    setTitle: (text) => (title.textContent = text),
    focusTitle: () => title.focus(),
    announce: (text) => announce(text),
    feedback: (kind) => feedback(kind),
    openHints: (options, choose) => hintDialog.open(d, options, choose),
    openBonus: (words) => bonusDialog.open(d, words, lang),
    openEnd: (content) => endDialog.open(content),
    home: closeRoute,
    reported: (entry) => store.addReported(entry),
    tipDone: () => tipDone,
    markTipDone: () => {
      tipDone = true;
      store.saveTipDone();
    },
  });

  const leftEl = h('span', { class: 'info__left' });
  const timeEl = h('span', { class: 'info__time', role: 'timer' });
  const hintBtn = h('button', { class: 'tool', type: 'button' }, hintSign(), h('span', { class: 'tool__label' }));
  const bonusCount = h('span', { class: 'tool__count' });
  const bonusBtn = h('button', { class: 'tool', type: 'button' }, bonusSign(), h('span', { class: 'tool__label' }), bonusCount);
  const info = h('div', { class: 'info' }, h('p', { class: 'info__text' }, leftEl, timeEl), h('div', { class: 'info__tools' }, bonusBtn, hintBtn));
  const crossword = createCrosswordView(onCell, showMeanings);
  crossword.el.style.setProperty('--lit-ms', `${LIGHT_MS}ms`);
  const chooseNote = h('p', { class: 'choose-note' });
  const chooseCancel = h('button', { class: 'btn btn--ghost', type: 'button' });
  const chooseBar = h('div', { class: 'choose-bar', role: 'status' }, chooseNote, chooseCancel);
  const waitEl = h('p', { class: 'board-wait', role: 'status' });
  const stage = h('div', { class: 'stage' }, crossword.el, waitEl);
  const currentEl = h('p', { class: 'current', 'aria-hidden': 'true' });
  const verdictText = h('span', {});
  const reportBtn = h('button', { class: 'btn btn--ghost btn--small', type: 'button' }, reportSign(), h('span', {}));
  // Screen readers hear the verdict once, from the one announcing line (`live`).
  const verdictEl = h('div', { class: 'verdict' }, verdictText, reportBtn);
  const tipEl = h('p', { class: 'tip' });
  const wheelView = createWheelView({ change: onSelect, submit });
  const shuffleBtn = h('button', { class: 'tool', type: 'button' }, shuffleSign(), h('span', { class: 'tool__label' }));
  const clearBtn = h('button', { class: 'tool', type: 'button' }, clearSign(), h('span', { class: 'tool__label' }));
  const checkBtn = h('button', { class: 'tool tool--main', type: 'button' }, checkSign(), h('span', { class: 'tool__label' }));
  const wheelTools = h('div', { class: 'wheel-tools' }, shuffleBtn, checkBtn, clearBtn);
  // One line above the wheel: the word being made; else the verdict of the last try; else how to play.
  const statusEl = h('div', { class: 'status' }, currentEl, verdictEl, tipEl);
  // The wheel's own place: on a phone on its side the wheel takes as much of it as is free (a box only there).
  const wheelBox = h('div', { class: 'wheel-box' }, wheelView.el);
  const playArea = h('div', { class: 'play-area' }, statusEl, wheelBox, wheelTools);
  const playView = h('div', { class: 'play' }, info, chooseBar, stage, playArea);

  backBtn.addEventListener('click', closeRoute);
  menuBtn.addEventListener('click', openMenu);
  hintBtn.addEventListener('click', () => {
    if (play && !play.done) openHints();
  });
  bonusBtn.addEventListener('click', () => {
    if (play) bonusDialog.open(d, play.bonus, lang);
  });
  chooseCancel.addEventListener('click', () => {
    choosing = false;
    render();
  });
  shuffleBtn.addEventListener('click', shuffle);
  clearBtn.addEventListener('click', () => onSelect([]));
  checkBtn.addEventListener('click', () => submit(selected));
  reportBtn.addEventListener('click', report);

  root.replaceChildren(
    h(
      'main',
      { class: 'app' },
      h('header', { class: 'top' }, backBtn, title, menuBtn),
      content,
      live,
      menuDialog.el,
      endDialog.el,
      hintDialog.el,
      bonusDialog.el,
      meaningDialog.el,
    ),
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
    const label = (b: HTMLElement, text: string) => {
      b.querySelector('.tool__label')!.textContent = text;
    };
    label(hintBtn, d.tools.hint);
    label(bonusBtn, d.tools.bonus);
    label(shuffleBtn, d.tools.shuffle);
    label(clearBtn, d.tools.clear);
    label(checkBtn, d.tools.check);
    chooseNote.textContent = d.hint.chooseNow;
    chooseCancel.textContent = d.app.close;
  }

  const dateText = (dateKey: string, style: 'long' | 'medium') =>
    new Intl.DateTimeFormat(lang, style === 'long' ? { day: 'numeric', month: 'long' } : { dateStyle: 'medium' }).format(new Date(`${dateKey}T12:00:00`));

  function announce(text: string): void {
    saidAgain = !saidAgain;
    live.textContent = saidAgain ? `${text}\u00a0` : text;
  }

  function feedback(kind: SoundKind): void {
    if (settings.sound) playSound(kind);
    if (settings.vibration && 'vibrate' in navigator) navigator.vibrate(BUZZ[kind] as number | number[]);
  }

  const tipText = () => (settings.input === 'swipe' ? d.game.tipSwipe : settings.input === 'tap' ? d.game.tipTap : d.game.tipBoth);

  type HintKind = 'firstLetter' | 'chooseCell' | 'wholeWord';
  const openHints = () =>
    hintDialog.open<HintKind>(
      d,
      [
        { kind: 'firstLetter', label: d.hint.firstLetter },
        { kind: 'chooseCell', label: d.hint.chooseCell },
        { kind: 'wholeWord', label: d.hint.wholeWord },
      ],
      useHint,
    );

  // ---------- screens ----------
  function show(): void {
    const route = currentRoute();
    if (route === 'field' || route === 'field-daily') {
      if (route !== fieldOn) openField(route);
      else field.render();
      return;
    }
    const next: Screen | null = route === 'level' || route === 'daily' ? route : null;
    if (!next) {
      leave();
      store.saveLast(null);
      renderHome();
      return;
    }
    if (next !== screen || !play) open(next);
    else render();
  }

  function leave(): void {
    stopClock();
    generation++;
    screen = null;
    play = null;
    choosing = false;
    field.leave();
    fieldOn = null;
  }

  function openField(next: FieldScreenName): void {
    leave();
    fieldOn = next;
    store.saveLast(next);
    applyLook();
    backBtn.hidden = false;
    if (content.firstChild !== field.el) content.replaceChildren(field.el);
    field.open(next);
  }

  function open(next: Screen): void {
    leave();
    screen = next;
    store.saveLast(next);
    selected = [];
    verdict = null;
    failed = false;
    const mine = ++generation;
    renderGame();
    loadDictionary(lang, settings.huTiles)
      .then((loaded) => {
        if (mine !== generation) return;
        dictionary = loaded;
        void loadMeanings(lang); // ready by the time a word is tapped or the level ends
        // Level-making takes a moment the first time: after the "making the level" line is drawn.
        window.setTimeout(() => {
          if (mine !== generation) return;
          begin(next === 'daily' ? (store.loadPlay(track(), today) ?? newPlay(makeDaily(loaded, today))) : (store.loadPlay(track(), null) ?? newPlay(makeLevel(loaded, store.loadLevelReached(track())))));
        }, 0);
      })
      .catch(() => {
        if (mine !== generation) return;
        failed = true;
        renderGame();
      });
  }

  function begin(p: Play): void {
    play = p;
    playTrack = track();
    wheel = [...p.level.letters];
    selected = [];
    store.savePlay(playTrack, p);
    startClock();
    renderGame();
    title.focus();
  }

  // ---------- time ----------
  function startClock(): void {
    if (play && !play.done && document.visibilityState === 'visible' && clockFrom === null) clockFrom = performance.now();
  }

  function stopClock(): void {
    if (clockFrom === null || !play) return;
    play = addTime(play, performance.now() - clockFrom);
    clockFrom = null;
    store.savePlay(playTrack, play);
  }

  const playedMs = () => (play ? play.ms + (clockFrom === null ? 0 : performance.now() - clockFrom) : 0);

  /** A move that ends the level stops the clock: its last stretch counts (a finished level takes no time). */
  function withTime(next: Play): Play {
    if (!next.done || clockFrom === null) return next;
    const timed = { ...next, ms: next.ms + (performance.now() - clockFrom) };
    clockFrom = null;
    return timed;
  }

  function renderTime(): void {
    timeEl.hidden = !settings.time || !play;
    if (!timeEl.hidden) timeEl.textContent = clockText(playedMs());
  }

  window.setInterval(() => {
    if (play && settings.time) renderTime();
  }, TICK_MS);

  // ---------- drawing ----------
  function renderHome(): void {
    applyLook();
    backBtn.hidden = true;
    title.textContent = d.app.name;
    const grace = settings.grace ? WORDS.graceDays : 0;
    const days = store.loadDays();
    const daily = store.loadPlay(track(), today);
    const fieldDays = store.loadFieldDays();
    const fieldDaily = store.loadFieldPlay(track(), today);
    const date = dateText(today, 'long');
    content.replaceChildren(
      homeView(
        [
          {
            mode: 'wheel',
            title: d.home.wheel,
            note: d.home.wheelNote,
            level: store.loadLevelReached(track()),
            levelsDone: store.loadStats()[lang].levels,
            daily: days[today]?.[lang] || daily?.done ? 'solved' : daily ? 'started' : 'new',
            streak: streakWithGrace(Object.keys(days).filter((day) => days[day]?.[lang]), today, grace),
            dailyLabel: fmt(d.game.dailyTitle, { date }),
            play: () => openRoute('level'),
            openDaily: () => openRoute('daily'),
          },
          {
            mode: 'field',
            title: d.home.field,
            note: d.home.fieldNote,
            level: store.loadFieldReached(track()),
            levelsDone: store.loadFieldStats()[lang].levels,
            daily: fieldDays[today]?.[lang] || fieldDaily?.done ? 'solved' : fieldDaily ? 'started' : 'new',
            streak: streakWithGrace(Object.keys(fieldDays).filter((day) => fieldDays[day]?.[lang]), today, grace),
            dailyLabel: fmt(d.field.dailyTitle, { date }),
            play: () => openRoute('field'),
            openDaily: () => openRoute('field-daily'),
          },
        ],
        d,
        lang,
      ),
    );
  }

  function renderGame(): void {
    applyLook();
    backBtn.hidden = false;
    if (content.firstChild !== playView) content.replaceChildren(playView);
    render();
  }

  /** Draws the level screen from the state. */
  function render(): void {
    if (!screen) return;
    const p = play;
    title.textContent = screen === 'daily' ? fmt(d.game.dailyTitle, { date: dateText(today, 'long') }) : fmt(d.game.level, { n: p?.level.number ?? store.loadLevelReached(track()) });
    waitEl.hidden = !!p;
    waitEl.textContent = failed ? d.game.loadFailed : d.game.preparing;
    crossword.el.hidden = !p;
    info.hidden = !p;
    // While a cell is chosen for a hint, the crossword takes the wheel's place: its cells get big enough to tap.
    playArea.hidden = !p || choosing;
    chooseBar.hidden = !p || !choosing;
    if (!p) return;

    const left = missing(p).length;
    leftEl.textContent = settings.showLeft && !p.done ? plural(lang, left, d.game.wordsLeft, { n: left }) : '';
    renderTime();
    bonusBtn.hidden = !settings.showBonus;
    bonusCount.textContent = p.bonus.length ? String(p.bonus.length) : '';
    hintBtn.setAttribute('aria-disabled', String(p.done));
    crossword.render(p, { showCells: settings.showCells, choosing, justFound: reducedMotion() ? null : justFound }, d);

    currentEl.textContent = selected.map((i) => wheel[i]!.toUpperCase()).join('');
    currentEl.hidden = !selected.length;
    renderVerdict();
    verdictEl.hidden = !!selected.length || !verdict;
    tipEl.textContent = tipText();
    tipEl.hidden = !!selected.length || !!verdict || tipDone || p.done;
    wheelView.render({ letters: wheel, selected, input: settings.input }, d.game.wheel);
    checkBtn.hidden = settings.input === 'swipe';
    checkBtn.setAttribute('aria-disabled', String(selected.length < WORDS.minWord));
    clearBtn.setAttribute('aria-disabled', String(!selected.length));
    wheelTools.classList.toggle('wheel-tools--two', settings.input === 'swipe');
  }

  function renderVerdict(): void {
    if (!verdict) {
      verdictText.textContent = '';
      reportBtn.hidden = true;
      return;
    }
    const word = verdict.text;
    const texts: Record<Verdict, string> = {
      found: fmt(d.game.found, { word }),
      bonus: fmt(d.game.bonus, { word }),
      again: fmt(d.game.again, { word }),
      short: plural(lang, WORDS.minWord, d.game.short, { n: WORDS.minWord }),
      unknown: fmt(d.game.unknown, { word }),
    };
    verdictText.textContent = texts[verdict.kind];
    verdictEl.dataset.kind = verdict.kind;
    const reportable = verdict.kind === 'found' || verdict.kind === 'bonus' || verdict.kind === 'unknown';
    reportBtn.hidden = !reportable;
    reportBtn.querySelector('span')!.textContent = fmt(d.game.report, { word });
  }

  // ---------- moves ----------
  function onSelect(next: readonly number[]): void {
    selected = [...next];
    pending = null;
    if (verdict && next.length) verdict = null;
    render();
  }

  function submit(indices: readonly number[]): void {
    if (!play || !dictionary || play.done) return;
    const tiles = indices.map((i) => wheel[i]!);
    selected = [];
    pending = null;
    if (!tiles.length) {
      render();
      return;
    }
    const before = play;
    const result = tryWord(play, tiles, dictionary);
    play = withTime(result.play);
    verdict = { kind: result.verdict, text: result.text };
    if (!tipDone && (result.verdict === 'found' || result.verdict === 'bonus')) {
      tipDone = true;
      store.saveTipDone();
    }
    if (play !== before) store.savePlay(playTrack, play);
    if (result.verdict === 'found') {
      justFound = result.text;
      feedback('found');
      window.setTimeout(() => {
        justFound = null;
        render();
      }, LIGHT_MS);
    } else if (result.verdict === 'bonus') feedback('bonus');
    render();
    announce(verdictText.textContent ?? '');
    if (play.done) finish();
  }

  function shuffle(): void {
    if (!play) return;
    const order = [...wheel];
    // Rotate and swap: a new order every time, never the same as before.
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j]!, order[i]!];
    }
    if (order.join('\u0000') === wheel.join('\u0000') && order.length > 1) order.push(order.shift()!);
    wheel = order;
    selected = [];
    render();
  }

  function report(): void {
    if (!verdict) return;
    store.addReported({ lang, word: verdict.text, verdict: verdict.kind });
    reportBtn.hidden = true;
    announce(fmt(d.game.reported, { word: verdict.text }));
    verdictText.textContent = fmt(d.game.reported, { word: verdict.text });
  }

  // ---------- hints ----------
  function useHint(kind: HintKind): void {
    if (!play || play.done) return;
    if (kind === 'chooseCell') {
      choosing = true;
      render();
      crossword.el.querySelector<HTMLButtonElement>('.is-choice')?.focus();
      return;
    }
    const next = kind === 'firstLetter' ? openFirstLetter(play) : openWord(play);
    applyHint(next);
  }

  function onCell(row: number, col: number): void {
    if (!play || !choosing) return;
    choosing = false;
    applyHint(openCell(play, row, col));
  }

  function applyHint(next: Play): void {
    if (!play || next === play) {
      render();
      return;
    }
    play = withTime(next);
    store.savePlay(playTrack, play);
    render();
    if (play.done) finish();
  }

  // ---------- the end ----------
  function finish(): void {
    if (!play) return;
    const p = play;
    store.savePlay(playTrack, p);
    store.recordDone(p);
    const daily = p.level.daily;
    if (daily) store.saveDayResult(daily, p.level.lang, { hints: p.hints, ms: p.ms });
    else {
      store.saveLevelReached(playTrack, (p.level.number ?? 0) + 1);
      store.dropPlay(playTrack);
    }
    feedback('done');
    const lines = [plural(lang, p.found.length, d.end.words, { n: p.found.length })];
    if (p.bonus.length && settings.showBonus) lines.push(plural(lang, p.bonus.length, d.end.bonus, { n: p.bonus.length }));
    lines.push(p.hints ? plural(lang, p.hints, d.end.hints, { n: p.hints }) : d.end.clean);
    if (settings.time) lines.push(fmt(d.end.time, { time: clockText(p.ms) }));
    let share: ShareText | null = null;
    if (daily) {
      const days = store.loadDays();
      const playedDays = Object.keys(days).filter((date) => days[date]?.[lang]);
      const n = streakWithGrace(playedDays, today, settings.grace ? WORDS.graceDays : 0);
      lines.push(plural(lang, n, d.end.streak, { n }));
      const params = { name: WORDS.name, date: dateText(daily, 'medium'), n: p.hints };
      const text = p.hints ? plural(lang, p.hints, d.end.shareHints, params) : fmt(d.end.shareClean, params);
      share = { label: d.end.copy, done: d.end.copied, text: WORDS.links.game ? `${text}\n${WORDS.links.game}` : text };
    }
    const home = { label: d.end.home, action: closeRoute };
    const words = p.level.words.map((placed) => placed.word.text);
    const wordsLang = lang;
    window.setTimeout(() => {
      void loadMeanings(wordsLang).then((meanings) => {
        const known: WordMeaning[] = words.map((word) => ({ word, meaning: meaningOf(meanings, word) }));
        endDialog.open({
          title: daily ? d.end.dailyTitle : fmt(d.end.title, { n: p.level.number ?? 0 }),
          highlight: null,
          lines,
          // only where some of the words have meanings already (docs/words/SPEC.md, "Значення слів")
          words: known.some((k) => k.meaning) ? { label: d.end.meanings, list: meaningList(known, d, wordsLang) } : null,
          share,
          secondary: daily ? null : home,
          primary: daily ? home : { label: d.end.next, action: nextLevel },
        });
      });
    }, reducedMotion() ? 0 : LIGHT_MS);
  }

  /** A found word tapped in the crossword: what it means — or the two words through a crossing cell. */
  function showMeanings(words: string[]): void {
    const wordsLang = lang;
    void loadMeanings(wordsLang).then((meanings) => {
      if (wordsLang !== lang || !play) return;
      meaningDialog.open(d, words.map((word) => ({ word, meaning: meaningOf(meanings, word) })), wordsLang);
    });
  }

  function nextLevel(): void {
    if (screen === 'level') open('level');
    else openRoute('level');
  }

  // ---------- menu ----------
  function openMenu(): void {
    menuDialog.open(
      { d, lang, settings, stats: store.loadStats(), fieldStats: store.loadFieldStats(), reported: store.loadReported(), tip: tipText() },
      {
        setLang(code) {
          lang = asLang(code);
          d = dict(lang);
          settings = { ...settings, lang: code };
          store.saveSettings(settings);
          menuDialog.el.close();
          reopen();
          openMenu();
        },
        set(patch) {
          const tilesChanged = patch.huTiles !== undefined && patch.huTiles !== settings.huTiles;
          settings = { ...settings, ...patch };
          store.saveSettings(settings);
          if (tilesChanged) reopen();
          else if (screen) renderGame();
          else if (fieldOn) {
            applyLook();
            field.render();
          } else renderHome();
        },
        clearProgress() {
          // The level on the screen is stopped (and saved) first, so nothing is saved again after the clearing.
          const was = screen;
          const wasField = fieldOn;
          leave();
          store.clearAll();
          tipDone = false;
          if (was) open(was);
          else if (wasField) openField(wasField);
          else renderHome();
        },
      },
    );
  }

  /** The language or the tiles changed: the screen shows that language's level or start. */
  function reopen(): void {
    if (screen) open(screen);
    else if (fieldOn) openField(fieldOn);
    else renderHome();
  }

  // ---------- keys ----------
  document.addEventListener('keydown', (event) => {
    if (menuDialog.el.open || endDialog.el.open || hintDialog.el.open || bonusDialog.el.open || meaningDialog.el.open) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (fieldOn) {
      field.key(event);
      return;
    }
    if (!play || !screen) return;
    if (event.key === 'Escape') {
      if (choosing) choosing = false;
      else onSelect([]);
      render();
      return;
    }
    if (event.key === 'Enter') {
      // A word being made is checked whatever has the focus; otherwise a focused button does its own thing.
      if (!selected.length && (event.target as HTMLElement | null)?.closest('button')) return;
      event.preventDefault();
      submit(selected);
      return;
    }
    if (event.key === 'Backspace') {
      event.preventDefault();
      onSelect(selected.slice(0, -1));
      return;
    }
    if (event.key === ' ' && !(event.target as HTMLElement | null)?.closest('button')) {
      event.preventDefault();
      shuffle();
      return;
    }
    if (event.key === '?') {
      event.preventDefault();
      if (!play.done) openHints();
      return;
    }
    const key = event.key.toLowerCase();
    if (key.length !== 1) return;
    // A letter of the wheel not used yet; Hungarian two-character tiles by their two keys.
    const typing: Typing = { selected, pending };
    const next = typeKey(wheel, typing, key);
    if (next === typing) return;
    event.preventDefault();
    if (next.selected !== selected) onSelect(next.selected);
    pending = next.pending;
  });

  // ---------- the page around ----------
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      stopClock();
      field.hidden(true);
      return;
    }
    const now = localDateKey(new Date());
    if (now !== today) {
      today = now;
      if (screen === 'daily') {
        open('daily');
        return;
      }
      if (fieldOn === 'field-daily') {
        openField('field-daily');
        return;
      }
      if (!screen && !fieldOn) renderHome();
    }
    startClock();
    field.hidden(false);
  });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyLook);
  watchRoute(show);

  const last = store.loadLast();
  if (!currentRoute() && last) openRoute(last);
  else show();
}
