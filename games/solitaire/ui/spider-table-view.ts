// Spider's table on the screen (docs/solitaire/SPEC.md, "Павук"): ten columns, the stock and the runs gone home, laid
// out for the room there is (spider-layout.ts); every card is a button. A touch is a tap (the run that starts with the
// card goes to its best place) or a drag (the run follows the finger, lifted above it, and lands where it is let go);
// the keys move between cards and places. The table only shows and passes on what the player does: the game decides.
import { h, svg } from '../../../shared/ui/dom.ts';
import { courtSymbols } from '../art/courts.ts';
import { suitSymbols } from '../art/suits.ts';
import type { SpiderSuits } from '../config.ts';
import { SOLITAIRE } from '../config.ts';
import { SPIDER_DECK, canMoveRun, faceOf, runStart, type Spider, type SpiderCard } from '../core/spider.ts';
import { createCardView, type CardView } from './card-view.ts';
import { fmt, plural, type Dict } from './i18n.ts';
import { cardName } from './names.ts';
import { laySpider, type SpiderLayout } from './spider-layout.ts';

const SVG_NS = 'http://www.w3.org/2000/svg';
const COLS = SOLITAIRE.spider.columns;
/** A finger that moves farther than this before it lets go drags, px. */
const DRAG_START = 8;
/** A card lifted by a finger rises above it by this share of its height, so the finger does not hide it. */
const LIFT = 0.35;
/** A click that comes this soon after a touch was that touch (already handled), ms. */
const CLICK_AFTER_TOUCH_MS = 600;

export type SpiderTarget = { kind: 'card'; column: number; index: number } | { kind: 'stock' } | { kind: 'empty'; column: number };

export interface SpiderTableHandlers {
  /** A card or a place was tapped, or chosen with the keys. */
  tap(target: SpiderTarget): void;
  /** Cards were dragged from a column onto another; false — the move was refused (they go back). */
  drop(from: number, index: number, to: number): boolean;
}

export interface SpiderMarks {
  /** What a hint shows: the run to move and where, or the stock. */
  hint: { from: number; index: number; to: number } | 'stock' | null;
}

export interface SpiderTableView {
  el: HTMLElement;
  render(g: Spider, marks: SpiderMarks, d: Dict, lang: string): void;
  /** Shakes what cannot move (no motion when the system asks for less). */
  refuse(target: SpiderTarget): void;
  hasFocus(): boolean;
  /** Moves the keys' focus the way of an arrow (onto the table first); true if it moved. */
  step(dir: 'left' | 'right' | 'up' | 'down'): boolean;
}

/** Where a card is: a column and its index there, the stock, or home. */
type Loc = { at: 'column'; column: number; index: number } | { at: 'stock' } | { at: 'home' };

interface Press {
  id: number;
  x0: number;
  y0: number;
  target: SpiderTarget;
  /** The cards that would move if this becomes a drag (lowest first), and from where. */
  moving: SpiderCard[];
  from: number;
  index: number;
  dragging: boolean;
  lift: number;
  drop: number | null;
}

export function createSpiderTableView(handlers: SpiderTableHandlers): SpiderTableView {
  const el = h('div', { class: 'table table--spider', role: 'group' });
  const sprite = svg(`<svg xmlns="${SVG_NS}" class="table__sprite" aria-hidden="true" focusable="false">${suitSymbols()}${courtSymbols()}</svg>`);
  const stockSlot = h('button', { class: 'slot slot--stock', type: 'button', tabindex: -1 });
  const homeSlot = h('div', { class: 'slot slot--runs', role: 'img' });
  const columnSlots = Array.from({ length: COLS }, () => h('button', { class: 'slot slot--column', type: 'button', tabindex: -1 }));
  const dropMark = h('div', { class: 'drop-mark', 'aria-hidden': 'true', hidden: true });
  el.append(sprite, homeSlot, ...columnSlots, stockSlot, dropMark);

  let views: CardView[] = [];
  let viewSuits: SpiderSuits | null = null;
  let game: Spider | null = null;
  let layout: SpiderLayout | null = null;
  let offsetX = 0;
  let where = new Map<SpiderCard, Loc>();
  let lastMarks: SpiderMarks = { hint: null };
  let lastDict: Dict | null = null;
  let lastLang = 'en';
  /** What the cards were last laid out for: when it changes (a new deal, another size), they jump, not slide. */
  let laidFor = '';
  let press: Press | null = null;
  let lastTouchUp = -Infinity;
  /** What the keys stand on: "card:N", "stock", "column:I". */
  let focusKey = 'stock';

  new ResizeObserver(() => {
    if (game && lastDict) render(game, lastMarks, lastDict, lastLang);
  }).observe(el);

  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /** The cards' buttons for a number of suits: the faces change with it. */
  function cardsFor(suits: SpiderSuits): void {
    if (viewSuits === suits) return;
    for (const v of views) v.el.remove();
    views = Array.from({ length: SPIDER_DECK }, (_, id) => createCardView(faceOf(id, suits), id));
    viewSuits = suits;
    stockSlot.before(...views.map((v) => v.el));
    laidFor = '';
  }

  // ---------- what is where ----------
  function locate(g: Spider): Map<SpiderCard, Loc> {
    const map = new Map<SpiderCard, Loc>();
    g.columns.forEach((col, column) => col.forEach((card, index) => map.set(card, { at: 'column', column, index })));
    for (const card of g.stock) map.set(card, { at: 'stock' });
    for (const run of g.home) for (const card of run) map.set(card, { at: 'home' });
    return map;
  }

  function targetOfElement(node: Element | null): SpiderTarget | null {
    const cardEl = node?.closest<HTMLElement>('.card');
    if (cardEl?.dataset.card) {
      const loc = where.get(Number(cardEl.dataset.card));
      if (!loc) return null;
      if (loc.at === 'stock') return { kind: 'stock' };
      if (loc.at === 'column') return { kind: 'card', column: loc.column, index: loc.index };
      return null;
    }
    const slot = node?.closest<HTMLElement>('.slot');
    if (slot === stockSlot) return { kind: 'stock' };
    const column = columnSlots.indexOf(slot as HTMLButtonElement);
    return column >= 0 ? { kind: 'empty', column } : null;
  }

  // ---------- drawing ----------
  const place = (node: HTMLElement, x: number, y: number) => {
    node.style.transform = `translate(${x + offsetX}px, ${y}px)`;
  };

  function render(g: Spider, marks: SpiderMarks, d: Dict, lang: string): void {
    cardsFor(g.suits);
    game = g;
    lastMarks = marks;
    lastDict = d;
    lastLang = lang;
    where = locate(g);
    const room = { width: el.clientWidth, height: el.clientHeight };
    if (room.width <= 0 || room.height <= 0) return;
    const lay = laySpider(g, room);
    layout = lay;
    const key = `${room.width}x${room.height}:${g.seed}:${g.suits}:${g.daily ?? ''}`;
    if (key !== laidFor) {
      laidFor = key;
      el.classList.add('is-instant');
      requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove('is-instant')));
    }
    offsetX = Math.max(0, (room.width - lay.width) / 2);
    el.style.setProperty('--cw', `${lay.w}px`);
    el.style.setProperty('--ch', `${lay.h}px`);
    el.classList.toggle('is-side', lay.arrangement === 'side');

    const hint = marks.hint;
    const hintCards = new Set<SpiderCard>(hint && hint !== 'stock' ? g.columns[hint.from]!.slice(hint.index) : []);
    const nextDeal = new Set(g.stock.slice(0, COLS));

    // the cards
    const focusable = new Map<string, HTMLElement>();
    for (const v of views) {
      const card = Number(v.el.dataset.card);
      const spot = lay.cards.get(card)!;
      const loc = where.get(card)!;
      if (!press?.dragging || !press.moving.includes(card)) place(v.el, spot.x, spot.y);
      v.el.style.zIndex = String(spot.z);
      v.paint(d);
      v.el.classList.toggle('is-down', !spot.up);
      v.el.classList.toggle('is-hint', hintCards.has(card) || (hint === 'stock' && nextDeal.has(card)));
      v.el.classList.remove('is-target');
      if (loc.at === 'column' && spot.up) {
        v.el.setAttribute('aria-label', fmt(d.game.column, { card: cardName(faceOf(card, g.suits), d), n: loc.column + 1 }));
        v.el.removeAttribute('aria-hidden');
        focusable.set(`card:${card}`, v.el);
      } else {
        v.el.removeAttribute('aria-label');
        v.el.setAttribute('aria-hidden', 'true');
      }
    }

    // the stock: a place of its own over its cards, so it is one button whatever is left in it
    const deals = Math.ceil(g.stock.length / COLS);
    const top = { x: lay.stock.x + Math.max(0, deals - 1) * lay.stockStep.x, y: lay.stock.y + Math.max(0, deals - 1) * lay.stockStep.y };
    place(stockSlot, top.x, top.y);
    stockSlot.classList.toggle('is-empty', deals === 0);
    stockSlot.classList.toggle('is-hint', hint === 'stock');
    stockSlot.setAttribute('aria-label', deals > 0 ? plural(lang, deals, d.spider.stock, { n: deals }) : d.spider.stockNone);
    focusable.set('stock', stockSlot);

    // the runs home, in words
    place(homeSlot, lay.home.x, lay.home.y);
    homeSlot.setAttribute('aria-label', fmt(d.spider.homes, { n: g.home.length, all: SOLITAIRE.spider.runs }));

    columnSlots.forEach((slot, i) => {
      place(slot, lay.columns[i]!.x, lay.columns[i]!.y);
      const empty = g.columns[i]!.length === 0;
      slot.setAttribute('aria-label', fmt(d.game.columnEmpty, { n: i + 1 }));
      slot.toggleAttribute('aria-hidden', !empty);
      slot.classList.toggle('is-target', !!hint && hint !== 'stock' && hint.to === i && empty);
      if (empty) focusable.set(`column:${i}`, slot);
    });
    // a hint's target column with cards: its top card shows it
    if (hint && hint !== 'stock') {
      const topCard = g.columns[hint.to]!.at(-1);
      if (topCard !== undefined) views[topCard]!.el.classList.add('is-target');
    }

    // one stop of the Tab key on the table
    if (!focusable.has(focusKey)) focusKey = firstFocus(g, focusable);
    for (const [k, node] of focusable) node.tabIndex = k === focusKey ? 0 : -1;
    for (const v of views) if (!focusable.has(`card:${v.el.dataset.card}`)) v.el.tabIndex = -1;
    for (const slot of columnSlots) if (![...focusable.values()].includes(slot)) slot.tabIndex = -1;
  }

  function firstFocus(g: Spider, focusable: Map<string, HTMLElement>): string {
    for (let i = 0; i < g.columns.length; i++) {
      const topCard = g.columns[i]!.at(-1);
      if (topCard !== undefined && focusable.has(`card:${topCard}`)) return `card:${topCard}`;
    }
    return 'stock';
  }

  // ---------- touch and mouse ----------
  function lifted(p: Press, dx: number, dy: number): void {
    if (!layout) return;
    for (const card of p.moving) {
      const spot = layout.cards.get(card)!;
      place(views[card]!.el, spot.x + dx, spot.y + dy - p.lift);
    }
    // where it would land: under the middle of the lowest card moved
    const first = layout.cards.get(p.moving[0]!)!;
    const cx = first.x + dx + layout.w / 2;
    const cy = first.y + dy - p.lift + layout.h / 2;
    p.drop = dropAt(cx, cy, p);
    showDrop(p.drop);
  }

  function dropAt(x: number, y: number, p: Press): number | null {
    if (!layout || !game) return null;
    const { w, h } = layout;
    let best: number | null = null;
    let bestDist = Infinity;
    for (let i = 0; i < layout.columns.length; i++) {
      const col = layout.columns[i]!;
      const dist = Math.abs(x - (col.x + w / 2));
      if (dist > w * 0.75 || y < col.y - h * 0.25) continue;
      if (dist < bestDist && canMoveRun(game, game.suits, p.from, p.index, i)) {
        best = i;
        bestDist = dist;
      }
    }
    return best;
  }

  function showDrop(to: number | null): void {
    if (to === null || !layout || !game) {
      dropMark.hidden = true;
      return;
    }
    const topCard = game.columns[to]!.at(-1);
    const { x, y } = topCard === undefined ? layout.columns[to]! : layout.cards.get(topCard)!;
    dropMark.hidden = false;
    place(dropMark, x, y);
  }

  el.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || press || !game) return;
    const target = targetOfElement(e.target as Element);
    if (!target) return;
    let moving: SpiderCard[] = [];
    let from = -1;
    let index = 0;
    if (target.kind === 'card' && target.index >= runStart(game, game.suits, target.column)) {
      moving = game.columns[target.column]!.slice(target.index);
      from = target.column;
      index = target.index;
    }
    press = { id: e.pointerId, x0: e.clientX, y0: e.clientY, target, moving, from, index, dragging: false, lift: 0, drop: null };
    el.setPointerCapture(e.pointerId);
  });
  // A finger on the table is handled here alone (pointer events above): no gestures of the browser for it, else a quick
  // drag counts as a fling and the browser swallows the next tap on a button for a moment (.claude/rules/design.md).
  el.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });

  el.addEventListener('pointermove', (e) => {
    const p = press;
    if (!p || e.pointerId !== p.id) return;
    const dx = e.clientX - p.x0;
    const dy = e.clientY - p.y0;
    if (!p.dragging) {
      if (Math.hypot(dx, dy) < DRAG_START || p.moving.length === 0) return;
      p.dragging = true;
      p.lift = e.pointerType === 'touch' && layout ? layout.h * LIFT : 0;
      el.classList.add('is-dragging');
      for (const [k, card] of p.moving.entries()) {
        views[card]!.el.classList.add('is-lifted');
        views[card]!.el.style.zIndex = String(1000 + k);
      }
    }
    lifted(p, dx, dy);
  });

  function endPress(e: PointerEvent, cancelled: boolean): void {
    const p = press;
    if (!p || e.pointerId !== p.id) return;
    press = null;
    if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    lastTouchUp = performance.now();
    el.classList.remove('is-dragging');
    for (const card of p.moving) views[card]!.el.classList.remove('is-lifted');
    dropMark.hidden = true;
    if (p.dragging) {
      const moved = !cancelled && p.drop !== null ? handlers.drop(p.from, p.index, p.drop) : false;
      if (!moved && game && lastDict) render(game, lastMarks, lastDict, lastLang);
      return;
    }
    if (!cancelled) handlers.tap(p.target);
  }

  el.addEventListener('pointerup', (e) => endPress(e, false));
  el.addEventListener('pointercancel', (e) => endPress(e, true));
  // Keys (Enter, Space) and assistive technology press buttons with a click alone; a click right after a touch is
  // that touch, already handled.
  el.addEventListener('click', (e) => {
    if (performance.now() - lastTouchUp < CLICK_AFTER_TOUCH_MS) return;
    const target = targetOfElement(e.target as Element);
    if (target) handlers.tap(target);
  });
  el.addEventListener('focusin', (e) => {
    const node = e.target as HTMLElement;
    if (node.dataset.card) focusKey = `card:${node.dataset.card}`;
    else if (node === stockSlot) focusKey = 'stock';
    else if (columnSlots.includes(node as HTMLButtonElement)) focusKey = `column:${columnSlots.indexOf(node as HTMLButtonElement)}`;
  });

  // ---------- keys ----------
  /** The middle of what can be seen of a place: a covered card shows only its top strip. */
  function centreOf(node: HTMLElement): { x: number; y: number } {
    const r = node.getBoundingClientRect();
    const card = node.dataset.card ? Number(node.dataset.card) : null;
    if (card !== null && game) {
      const loc = where.get(card);
      if (loc?.at === 'column') {
        const next = game.columns[loc.column]![loc.index + 1];
        if (next !== undefined) {
          const below = views[next]!.el.getBoundingClientRect();
          return { x: r.left + r.width / 2, y: (r.top + below.top) / 2 };
        }
      }
    }
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  function step(dir: 'left' | 'right' | 'up' | 'down'): boolean {
    const nodes = [...el.querySelectorAll<HTMLElement>('.card:not([aria-hidden]), .slot--column:not([aria-hidden]), .slot--stock')];
    const current = el.contains(document.activeElement) ? (document.activeElement as HTMLElement) : null;
    if (!current) {
      const start = nodes.find((n) => n.tabIndex === 0) ?? nodes[0];
      start?.focus();
      return !!start;
    }
    const from = centreOf(current);
    let best: HTMLElement | null = null;
    let bestScore = Infinity;
    for (const node of nodes) {
      if (node === current) continue;
      const c = centreOf(node);
      const dx = c.x - from.x;
      const dy = c.y - from.y;
      const ahead = dir === 'right' ? dx : dir === 'left' ? -dx : dir === 'down' ? dy : -dy;
      const aside = dir === 'right' || dir === 'left' ? Math.abs(dy) : Math.abs(dx);
      if (ahead <= 1) continue;
      const score = ahead + 2 * aside;
      if (score < bestScore) {
        best = node;
        bestScore = score;
      }
    }
    if (!best) return false;
    for (const node of nodes) node.tabIndex = node === best ? 0 : -1;
    best.focus();
    return true;
  }

  return {
    el,
    render,
    refuse(target) {
      if (reducedMotion() || !game) return;
      let nodes: HTMLElement[] = [];
      if (target.kind === 'card') nodes = game.columns[target.column]!.slice(target.index).map((c) => views[c]!.el);
      else if (target.kind === 'stock') nodes = [stockSlot];
      for (const node of nodes) {
        node.classList.remove('is-refused');
        void node.offsetWidth; // restart the animation
        node.classList.add('is-refused');
      }
    },
    hasFocus() {
      return el.contains(document.activeElement);
    },
    step,
  };
}
