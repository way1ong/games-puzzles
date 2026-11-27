// The game screen: which screen is open (the start, levels in a row, a difficulty of free play, the day), the game in
// play, the lifted bottle, the hint and its kept way, a dead end, the time, the end, the menu, the keys
// (docs/pour/SPEC.md). The rules are the core's; this module only shows them and passes the player's actions on.
import { localDateKey, streak } from '../../../shared/core/dates.ts';
import type { ShareText } from '../../../shared/ui/copy.ts';
import { h } from '../../../shared/ui/dom.ts';
import { offerUpdates } from '../../../shared/ui/update-view.ts';
import { DIFFICULTIES, POUR, type Difficulty } from '../config.ts';
import { isClosed, whyNot, type Move } from '../core/bottles.ts';
import { findHint, hasWay, stepsBack, type PourWay } from '../core/hint.ts';
import { dailyDeal, freeDeal, levelDeal } from '../core/level.ts';
import { addBottle, addTime, clean, countHint, helpLeft, hintAllowed, newPlay, pourIn, startAgain, started, undo, type PourPlay } from '../core/play.ts';
import { longestStreak, recordLeft, recordWon } from '../core/stats.ts';
import { createEndDialog } from './end-dialog.ts';
import { homeView, ROUTES, type DayState, type Route } from './home-view.ts';
import { dict, fmt, pickLang, plural, type Dict } from './i18n.ts';
import { backSign } from './icons.ts';
import { createMenuDialog } from './menu-dialog.ts';
import { closeRoute, currentRoute, openRoute, restoreRoute, watchRoute } from './route.ts';
import { randomSeed } from './seed.ts';
import { createShelfView } from './shelf-view.ts';
import * as store from './storage.ts';
import type { Settings, Slot } from './storage.ts';
import { clockText } from './time.ts';
import { createToolsView } from './tools-view.ts';
import { bottleLabel, hintText, whyText } from './words.ts';

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

const isRoute = (route: string): route is Route => (ROUTES as readonly string[]).includes(route);

export function startApp(root: HTMLElement): void {
  let settings: Settings = store.loadSettings();
  let lang = pickLang(settings.lang, navigator.languages ?? [navigator.language]);
  let d: Dict = dict(lang);
  let today = localDateKey(new Date());

  /** The screen of a game open (null — the start screen). */
  let open: Route | null = null;
  let game: PourPlay | null = null;
  /** The lifted bottle. */
  let up: number | null = null;
  let hint: Move | null = null;
  /** The game the hint was found for: a second press does it only while nothing has changed. */
  let hintFor: PourPlay | null = null;
  /** The way the hints follow while the player is on it. */
  let way: PourWay | null = null;
  /** No way to the end from here (known after a pour); `back` — pours to take back to one. */
  let stuck: { back: number | null } | null = null;
  /** A short word about the last action, shown until the next one. */
  let message: string | null = null;
  /** "Start again" was tapped once: the second tap starts again. */
  let armedAgain = false;
  /** The water just poured, to rise once. */
  let poured: { to: number; amount: number } | null = null;
  let tipDone = store.loadTipDone();
  /** When the current stretch of play started (performance.now()); null — the clock stands. */
  let clockFrom: number | null = null;

  const rule = () => POUR.helps[settings.help];

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
    () => !isRoute(currentRoute()),
    () => d.update,
  );

  const whereEl = h('span', { class: 'info__text' });
  const movesEl = h('span', { class: 'info__moves' });
  const timeEl = h('span', { class: 'info__time', role: 'timer' });
  const info = h('p', { class: 'info' }, whereEl, movesEl, timeEl);
  const noteText = h('span', { class: 'note__text' });
  const noteActions = h('span', { class: 'note__actions' });
  const note = h('div', { class: 'note' }, noteText, noteActions);
  const shelf = createShelfView({ tap: onTap, put: putDown });
  const tools = createToolsView({ undo: undoPour, hint: askHint, extra: oneMore, again: startOver });
  /** A dead end's choices, in the buttons' place. */
  const stuckTools = h('div', { class: 'tools tools--stuck', role: 'group' });
  const playView = h('div', { class: 'play' }, info, shelf.el, note, tools.el, stuckTools);

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
    if (settings.vibration && 'vibrate' in navigator) navigator.vibrate(POUR.vibrateMs);
  }

  // ---------- screens ----------
  function show(): void {
    const route = currentRoute();
    if (isRoute(route)) {
      store.saveLast(route);
      if (open !== route || !game || (route === 'daily' && game.daily !== today)) openGame(route);
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

  /** Forgets what belongs to one moment of a game: the lifted bottle, the hint, the dead end, the word. */
  function clearTurn(): void {
    up = null;
    hint = null;
    hintFor = null;
    way = null;
    stuck = null;
    message = null;
    armedAgain = false;
    poured = null;
  }

  function slotOf(route: Route): Slot {
    return route;
  }

  function newGame(route: Route): PourPlay {
    if (route === 'level') {
      const level = store.loadReached();
      return newPlay(levelDeal(level), 'level', { level });
    }
    if (route === 'daily') return newPlay(dailyDeal(today), 'daily', { daily: today });
    return newPlay(freeDeal(route, randomSeed()), 'free', { difficulty: route });
  }

  function openGame(route: Route): void {
    stopClock();
    open = route;
    clearTurn();
    game = store.loadPlay(slotOf(route), today) ?? newGame(route);
    if (game.done) message = d.game.won;
    else if (hasWay(game.bottles) === false) markStuck();
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
    const days = store.loadDays();
    const begun = (slot: Slot) => {
      const p = store.loadPlay(slot, today);
      return !!p && !p.done && started(p);
    };
    const dayPlay = store.loadPlay('daily', today);
    const daily: DayState = days[today] || dayPlay?.done ? 'done' : dayPlay && started(dayPlay) ? 'started' : 'new';
    content.replaceChildren(
      homeView(
        {
          reached: store.loadReached(),
          levelBegun: begun('level'),
          begun: Object.fromEntries(DIFFICULTIES.map((diff) => [diff, begun(diff)])) as Record<Difficulty, boolean>,
          daily,
          date: dateText(today, 'long'),
          streak: streak(Object.keys(days), today),
        },
        d,
        lang,
        (route) => openRoute(route),
      ),
    );
    updates.check();
  }

  // ---------- the game ----------
  function whereText(g: PourPlay): string {
    const colours = plural(lang, g.colours, d.home.colours, { n: g.colours });
    if (g.way === 'level') return `${fmt(d.game.level, { n: g.level! })} · ${colours}`;
    if (g.way === 'daily') return `${dateText(today, 'long')} · ${colours}`;
    return `${d.difficulty[g.difficulty!]} · ${colours}`;
  }

  function titleText(g: PourPlay): string {
    if (g.way === 'level') return fmt(d.game.level, { n: g.level! });
    if (g.way === 'daily') return d.game.daily;
    return d.difficulty[g.difficulty!];
  }

  function noteContent(g: PourPlay): { text: string; actions: NoteAction[] } {
    if (g.done) return { text: d.game.won, actions: endActions() };
    // a dead end's choices stand in the buttons' place (as after a mine in Mines): the note keeps its one height
    if (stuck) return { text: stuckText(), actions: [] };
    if (message) return { text: message, actions: [] };
    if (!tipDone) return { text: up === null ? d.game.tip : d.game.lifted, actions: [] };
    return { text: '', actions: [] };
  }

  function stuckText(): string {
    const back = stuck?.back ?? null;
    const left = game ? helpLeft(game, rule()).undo : 0;
    if (back !== null && (left === null || left >= back)) return plural(lang, back, d.game.stuckBack, { n: back });
    return d.game.stuckAgain;
  }

  function stuckActions(): NoteAction[] {
    if (!game) return [];
    const out: NoteAction[] = [];
    const back = stuck?.back ?? null;
    const left = helpLeft(game, rule());
    if (back !== null && (left.undo === null || left.undo >= back)) out.push({ label: plural(lang, back, d.tools.back, { n: back }), run: () => undoPour(back) });
    if (left.extra > 0) out.push({ label: d.tools.extra, run: oneMore });
    out.push({ label: d.tools.again, run: () => startOver(true) });
    if (game.way === 'free') out.push({ label: d.end.new, run: () => newFree() });
    return out;
  }

  function render(): void {
    if (!game || !open) return;
    applyLook();
    backBtn.hidden = false;
    title.textContent = titleText(game);
    if (!content.contains(playView)) content.replaceChildren(playView);
    const g = game;
    whereEl.textContent = whereText(g);
    movesEl.textContent = plural(lang, g.moves, d.game.moves, { n: g.moves });
    renderTime();
    shelf.el.setAttribute('aria-label', d.bottle.shelf);
    const shownHint = hint && hintFor === game ? hint : null;
    shelf.render({
      bottles: g.bottles,
      paints: g.paints,
      patterns: settings.patterns,
      up,
      hint: shownHint,
      poured,
      label: (i) => {
        const marks: string[] = [];
        if (up === i) marks.push(d.bottle.up);
        if (shownHint?.from === i) marks.push(d.bottle.hintFrom);
        if (shownHint?.to === i) marks.push(d.bottle.hintTo);
        return bottleLabel(g.bottles[i]!, i, g.paints, d, marks);
      },
    });
    poured = null;
    const left = helpLeft(g, rule());
    tools.render(d, { undoLeft: left.undo, hintsLeft: left.hints, extraLeft: left.extra, hintReady: !!shownHint });
    const choices = stuck && !g.done ? stuckActions() : [];
    tools.el.hidden = g.done || choices.length > 0;
    stuckTools.hidden = !choices.length;
    stuckTools.setAttribute('aria-label', d.game.stuck);
    stuckTools.style.setProperty('--n', String(choices.length));
    stuckTools.replaceChildren(
      ...choices.map((a, i) => {
        const b = h('button', { class: `tool${i === 0 ? ' tool--main' : ''}`, type: 'button' }, h('span', { class: 'tool__label' }, a.label));
        b.addEventListener('click', a.run);
        return b;
      }),
    );
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

  function markStuck(): void {
    if (game) stuck = { back: stepsBack(game) };
  }

  /** After a change of the bottles: is there still a way? (Said at once, not left to be found.) */
  function lookAhead(): void {
    if (!game || game.done) return;
    stuck = null;
    if (hasWay(game.bottles) === false) markStuck();
  }

  function liftable(i: number): string | null {
    if (!game) return null;
    const bottle = game.bottles[i]!;
    if (!bottle.length) return d.game.whyEmpty;
    if (isClosed(bottle, POUR.capacity)) return d.game.whyClosed;
    return null;
  }

  function onTap(i: number): void {
    if (!game || game.done) return;
    armedAgain = false;
    if (up === null) {
      const why = liftable(i);
      if (why) {
        message = why;
        announce(why);
      } else {
        up = i;
        message = null;
        announce(bottleLabel(game.bottles[i]!, i, game.paints, d, [d.bottle.up]));
      }
      render();
      return;
    }
    if (up === i) {
      putDown();
      return;
    }
    const move = { from: up, to: i };
    const why = whyNot(game.bottles, move, POUR.capacity);
    if (why === null) {
      pourNow(move);
      return;
    }
    // not here: say why, and lift the tapped bottle instead when it can be poured from (C)
    message = whyText(why, d);
    up = liftable(i) ? null : i;
    announce(message);
    render();
  }

  function putDown(): void {
    if (up === null) return;
    up = null;
    message = null;
    announce(d.game.put);
    render();
  }

  function pourNow(move: Move): void {
    if (!game) return;
    const before = game.bottles.filter((b) => isClosed(b, POUR.capacity)).length;
    const next = pourIn(game, move);
    if (!next) return;
    const followed = hint && hintFor === game && hint.from === move.from && hint.to === move.to;
    game = next;
    poured = { to: move.to, amount: next.history.at(-1)!.amount };
    up = null;
    hint = null;
    hintFor = null;
    if (!followed) way = null;
    armedAgain = false;
    const closedNow = next.bottles.filter((b) => isClosed(b, POUR.capacity)).length;
    message = closedNow > before ? d.game.closedOne : null;
    if (closedNow > before) vibrate();
    announce(message ?? d.game.poured);
    save();
    if (game.done) {
      finish();
      return;
    }
    lookAhead();
    render();
  }

  function undoPour(count = 1): void {
    if (!game || game.done) return;
    armedAgain = false;
    if (!game.history.length) {
      message = d.game.nothingToUndo;
    } else {
      const next = undo(game, rule(), count);
      if (!next) message = d.game.noUndo;
      else {
        game = next;
        up = null;
        hint = null;
        hintFor = null;
        message = d.game.undone;
        save();
        lookAhead();
      }
    }
    announce(message ?? '');
    render();
  }

  function askHint(): void {
    if (!game || game.done) return;
    armedAgain = false;
    // a second press does the hint shown, while nothing has changed
    if (hint && hintFor === game) {
      pourNow(hint);
      return;
    }
    if (!hintAllowed(game, rule())) {
      message = d.game.noHints;
      announce(message);
      render();
      return;
    }
    const found = findHint(game, way);
    if (found.kind === 'move') {
      game = countHint(game);
      way = found.way;
      hint = found.move;
      hintFor = game;
      up = null;
      message = hintText(found.move, d);
      save();
    } else if (found.kind === 'stuck') {
      stuck = { back: found.back };
      message = null;
    } else {
      message = d.game.hintUnknown;
    }
    announce(message ?? stuckText());
    render();
  }

  function oneMore(): void {
    if (!game || game.done) return;
    armedAgain = false;
    const next = addBottle(game, rule());
    if (!next) message = game.extra > 0 ? d.game.extraUsed : d.game.noExtra;
    else {
      game = next;
      up = null;
      hint = null;
      hintFor = null;
      way = null;
      message = d.game.added;
      save();
      lookAhead();
    }
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

  /** Free play: leave this game for a new deal (a begun one counts as played). */
  function newFree(): void {
    if (!game || game.way !== 'free' || !open) return;
    const diff = game.difficulty!;
    if (!game.done && started(game)) store.saveStats(recordLeft(store.loadStats(), diff));
    store.dropPlay(diff);
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
    store.dropPlay('level');
    if (open === 'level') openGame('level');
  }

  function finish(): void {
    if (!game || !open) return;
    stopClock();
    const g = game;
    store.saveStats(recordWon(store.loadStats(), g));
    if (g.way === 'level') store.saveReached(Math.max(store.loadReached(), g.level! + 1));
    if (g.way === 'daily') store.saveDayResult(today, { moves: g.moves, clean: clean(g) });
    if (g.way === 'free') store.dropPlay(g.difficulty!);
    else store.savePlay(g);
    if (!tipDone) {
      tipDone = true;
      store.saveTipDone();
    }
    hint = null;
    stuck = null;
    message = null;
    render();
    const lines = [plural(lang, g.moves, d.end.moves, { n: g.moves })];
    if (clean(g)) lines.push(d.end.clean);
    else {
      if (g.undos) lines.push(plural(lang, g.undos, d.end.undos, { n: g.undos }));
      if (g.hints) lines.push(plural(lang, g.hints, d.end.hints, { n: g.hints }));
      if (g.extra) lines.push(d.end.extra);
    }
    if (settings.time) lines.push(fmt(d.end.time, { time: clockText(g.ms) }));
    let share: ShareText | null = null;
    if (g.way === 'daily') {
      const n = streak(Object.keys(store.loadDays()), today);
      lines.push(plural(lang, n, d.end.streak, { n }));
      const params = { name: POUR.name, date: dateText(today, 'medium'), moves: g.moves };
      const text = clean(g) ? fmt(d.end.shareClean, params) : fmt(d.end.share, params);
      share = { label: d.end.copy, done: d.end.copied, text: POUR.links.game ? `${text}\n${POUR.links.game}` : text };
    }
    const home = { label: d.end.home, action: () => closeRoute('') };
    endDialog.open({
      title: d.end.title,
      highlight: g.way === 'daily' ? `${d.game.daily} · ${dateText(today, 'long')}` : titleText(g),
      lines,
      share,
      secondary: g.way === 'daily' ? null : home,
      primary: g.way === 'level' ? { label: d.end.next, action: nextLevel } : g.way === 'free' ? { label: d.end.new, action: newFree } : home,
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
    else renderHome();
  }

  // ---------- keys ----------
  document.addEventListener('keydown', (event) => {
    if (!open || !game || menuDialog.el.open || endDialog.el.open || document.querySelector('dialog[open]')) return;
    const letter = letterOf(event);
    if ((event.ctrlKey || event.metaKey) && letter === 'z') {
      event.preventDefault();
      undoPour();
      return;
    }
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (letter === 'h') askHint();
    else if (event.key === 'Escape') putDown();
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
  if (!currentRoute() && isRoute(last)) restoreRoute('', last);
  else show();
}
