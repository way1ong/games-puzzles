// The card table on the screen (docs/solitaire/SPEC.md, "Екрани й керування"): the stock, the waste, the foundations
// and the seven columns, laid out for the room there is (layout.ts); every card is a button that moves to its place.
// A touch is a tap (the card goes to its best place) or a drag (the card follows the finger, lifted above it, and lands
// where it is let go); the keys move between cards and places. The table only shows and passes on what the player
// does: the game decides.
import { h, svg } from '../../../shared/ui/dom.ts';
import { suitSymbolId, suitSymbols } from '../art/suits.ts';
import { SOLITAIRE } from '../config.ts';
import { DECK, SUITS, cardOf, type Card } from '../core/cards.ts';
import { canMove, movingCards, stockLeft, type Klondike, type Place } from '../core/klondike.ts';
import { createCardView, type CardView } from './card-view.ts';
import { fmt, plural, type Dict } from './i18n.ts';
import { turnSign } from './icons.ts';
import { layTable, type TableLayout } from './layout.ts';
import { cardName } from './names.ts';

const SVG_NS = 'http://www.w3.org/2000/svg';
/** A finger that moves farther than this before it lets go drags, px. */
const DRAG_START = 8;
/** A card lifted by a finger rises above it by this share of its height, so the finger does not hide it. */
const LIFT = 0.35;
/** A click that comes this soon after a touch was that touch (already handled), ms. */
const CLICK_AFTER_TOUCH_MS = 600;

export type Target = { kind: 'card'; place: Place; index: number } | { kind: 'stock' } | { kind: 'empty'; place: Place };

export interface TableHandlers {
  /** A card or a place was tapped, or chosen with the keys. */
  tap(target: Target): void;
  /** Cards were dragged from a place onto another; false — the move was refused (they go back). */
  drop(from: Place, index: number, to: Place): boolean;
}

export interface TableMarks {
  /** What a hint shows: the card to move and where, or the stock. */
  hint: { from: Place; index: number; to: Place } | 'stock' | null;
  leftHand: boolean;
}

export interface TableView {
  el: HTMLElement;
  render(g: Klondike, marks: TableMarks, d: Dict, lang: string): void;
  /** Shakes what cannot move (no motion when the system asks for less). */
  refuse(target: Target): void;
  hasFocus(): boolean;
  /** Moves the keys' focus the way of an arrow (onto the table first); true if it moved. */
  step(dir: 'left' | 'right' | 'up' | 'down'): boolean;
}

/** Where a card is: a place and its index there (for a column, from the bottom), or in the stock. */
type Loc = { place: Place; index: number } | { place: 'stock'; index: number };

interface Press {
  id: number;
  x0: number;
  y0: number;
  target: Target;
  /** The cards that would move if this becomes a drag (lowest first), and from where. */
  moving: Card[];
  from: Place | null;
  index: number;
  dragging: boolean;
  lift: number;
  drop: Place | null;
}

export function createTableView(handlers: TableHandlers): TableView {
  const el = h('div', { class: 'table', role: 'group' });
  const sprite = svg(`<svg xmlns="${SVG_NS}" class="table__sprite" aria-hidden="true" focusable="false">${suitSymbols()}</svg>`);
  const views: CardView[] = Array.from({ length: DECK }, (_, c) => createCardView(c));
  const stockSlot = h('button', { class: 'slot slot--stock', type: 'button', tabindex: -1 }, turnSign());
  const wasteSlot = h('div', { class: 'slot slot--waste', 'aria-hidden': 'true' });
  const homeSlots = SUITS.map((suit) => {
    const mark = document.createElementNS(SVG_NS, 'svg');
    mark.setAttribute('class', 'slot__suit');
    mark.setAttribute('viewBox', '0 0 100 100');
    mark.setAttribute('aria-hidden', 'true');
    mark.setAttribute('focusable', 'false');
    const use = document.createElementNS(SVG_NS, 'use');
    use.setAttribute('href', `#${suitSymbolId(suit)}`);
    mark.append(use);
    return h('button', { class: 'slot slot--home', type: 'button', tabindex: -1 }, mark);
  });
  const columnSlots = Array.from({ length: SOLITAIRE.klondike.columns }, () => h('button', { class: 'slot slot--column', type: 'button', tabindex: -1 }));
  const dropMark = h('div', { class: 'drop-mark', 'aria-hidden': 'true', hidden: true });
  el.append(sprite, wasteSlot, ...homeSlots, ...columnSlots, ...views.map((v) => v.el), stockSlot, dropMark);

  let game: Klondike | null = null;
  let layout: TableLayout | null = null;
  let offsetX = 0;
  let where = new Map<Card, Loc>();
  let lastMarks: TableMarks = { hint: null, leftHand: false };
  let lastDict: Dict | null = null;
  let lastLang = 'en';
  /** What the cards were last laid out for: when it changes (a new deal, another size), they jump, not slide. */
  let laidFor = '';
  let press: Press | null = null;
  let lastTouchUp = -Infinity;
  /** What the keys stand on: "card:N", "stock", "home:S", "column:I". */
  let focusKey = 'stock';

  new ResizeObserver(() => {
    if (game && lastDict) render(game, lastMarks, lastDict, lastLang);
  }).observe(el);

  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- what is where ----------
  function locate(g: Klondike): Map<Card, Loc> {
    const map = new Map<Card, Loc>();
    g.columns.forEach((col, i) => col.forEach((card, k) => map.set(card, { place: { kind: 'column', index: i }, index: k })));
    g.talon.forEach((card, k) => map.set(card, k < g.pos ? { place: { kind: 'waste' }, index: k } : { place: 'stock', index: k }));
    g.foundations.forEach((rank, s) => {
      for (let r = 1; r <= rank; r++) map.set(cardOf(s, r), { place: { kind: 'foundation', suit: s }, index: r - 1 });
    });
    return map;
  }

  /** The target a card's button stands for: the stock, a face-down card, or the card that would move. */
  function targetOf(card: Card): Target | null {
    const loc = where.get(card);
    if (!loc || !game) return null;
    if (loc.place === 'stock') return { kind: 'stock' };
    if (loc.place.kind === 'waste') return { kind: 'card', place: loc.place, index: game.pos - 1 };
    if (loc.place.kind === 'foundation') return { kind: 'card', place: loc.place, index: game.foundations[loc.place.suit]! - 1 };
    return { kind: 'card', place: loc.place, index: loc.index };
  }

  function targetOfElement(node: Element | null): Target | null {
    const cardEl = node?.closest<HTMLElement>('.card');
    if (cardEl?.dataset.card) return targetOf(Number(cardEl.dataset.card));
    const slot = node?.closest<HTMLElement>('.slot');
    if (!slot) return null;
    if (slot === stockSlot) return { kind: 'stock' };
    const home = homeSlots.indexOf(slot as HTMLButtonElement);
    if (home >= 0) return { kind: 'empty', place: { kind: 'foundation', suit: home } };
    const column = columnSlots.indexOf(slot as HTMLButtonElement);
    if (column >= 0) return { kind: 'empty', place: { kind: 'column', index: column } };
    return null;
  }

  // ---------- drawing ----------
  const place = (node: HTMLElement, x: number, y: number) => {
    node.style.transform = `translate(${x + offsetX}px, ${y}px)`;
  };

  function render(g: Klondike, marks: TableMarks, d: Dict, lang: string): void {
    game = g;
    lastMarks = marks;
    lastDict = d;
    lastLang = lang;
    where = locate(g);
    const room = { width: el.clientWidth, height: el.clientHeight };
    if (room.width <= 0 || room.height <= 0) return;
    const lay = layTable(g, room, marks.leftHand);
    layout = lay;
    const key = `${room.width}x${room.height}:${g.seed}:${g.daily ?? ''}:${marks.leftHand}`;
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
    const hintCards = new Set<Card>();
    if (hint && hint !== 'stock') for (const c of movingCards(g, hint.from, hint.index) ?? []) hintCards.add(c);

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
      v.el.classList.toggle('is-hint', hintCards.has(card));
      let label: string | null = null;
      if (loc.place !== 'stock' && spot.up) {
        const name = cardName(card, d);
        if (loc.place.kind === 'column') label = fmt(d.game.column, { card: name, n: loc.place.index + 1 });
        else if (loc.place.kind === 'waste' && loc.index === g.pos - 1) label = fmt(d.game.waste, { card: name });
        else if (loc.place.kind === 'foundation' && loc.index === g.foundations[loc.place.suit]! - 1) label = fmt(d.game.foundation, { card: name });
      }
      if (label) {
        v.el.setAttribute('aria-label', label);
        v.el.removeAttribute('aria-hidden');
        focusable.set(`card:${card}`, v.el);
      } else {
        v.el.removeAttribute('aria-label');
        v.el.setAttribute('aria-hidden', 'true');
      }
    }

    // the places
    place(stockSlot, lay.stock.x, lay.stock.y);
    stockSlot.classList.toggle('is-empty', stockLeft(g) === 0);
    stockSlot.classList.toggle('can-turn', stockLeft(g) === 0 && g.pos > 0);
    stockSlot.classList.toggle('is-hint', hint === 'stock');
    stockSlot.setAttribute(
      'aria-label',
      stockLeft(g) > 0 ? plural(lang, stockLeft(g), d.game.stock, { n: stockLeft(g) }) : g.pos > 0 ? d.game.stockTurn : d.game.stockNone,
    );
    focusable.set('stock', stockSlot);
    place(wasteSlot, lay.waste.x, lay.waste.y);
    homeSlots.forEach((slot, s) => {
      place(slot, lay.foundations[s]!.x, lay.foundations[s]!.y);
      const empty = g.foundations[s] === 0;
      slot.setAttribute('aria-label', fmt(d.game.foundationEmpty, { suit: d.cards.suits[SUITS[s]!] }));
      slot.toggleAttribute('aria-hidden', !empty);
      slot.classList.toggle('is-target', !!hint && hint !== 'stock' && hint.to.kind === 'foundation' && hint.to.suit === s);
      if (empty) focusable.set(`home:${s}`, slot);
    });
    columnSlots.forEach((slot, i) => {
      place(slot, lay.columns[i]!.x, lay.columns[i]!.y);
      const empty = g.columns[i]!.length === 0;
      slot.setAttribute('aria-label', fmt(d.game.columnEmpty, { n: i + 1 }));
      slot.toggleAttribute('aria-hidden', !empty);
      slot.classList.toggle('is-target', !!hint && hint !== 'stock' && hint.to.kind === 'column' && hint.to.index === i && empty);
      if (empty) focusable.set(`column:${i}`, slot);
    });
    // a hint's target column with cards: its top card shows it
    for (const v of views) v.el.classList.remove('is-target');
    if (hint && hint !== 'stock') {
      const to = hint.to;
      const top =
        to.kind === 'column' ? g.columns[to.index]!.at(-1) : to.kind === 'foundation' && g.foundations[to.suit]! > 0 ? cardOf(to.suit, g.foundations[to.suit]!) : undefined;
      if (top !== undefined) views[top]!.el.classList.add('is-target');
    }

    // one stop of the Tab key on the table
    if (!focusable.has(focusKey)) focusKey = firstFocus(g, focusable);
    for (const [key, node] of focusable) node.tabIndex = key === focusKey ? 0 : -1;
    for (const v of views) if (!focusable.has(`card:${v.el.dataset.card}`)) v.el.tabIndex = -1;
    for (const slot of [...homeSlots, ...columnSlots]) if (![...focusable.values()].includes(slot)) slot.tabIndex = -1;
  }

  function firstFocus(g: Klondike, focusable: Map<string, HTMLElement>): string {
    for (let i = 0; i < g.columns.length; i++) {
      const top = g.columns[i]!.at(-1);
      if (top !== undefined && focusable.has(`card:${top}`)) return `card:${top}`;
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

  function dropAt(x: number, y: number, p: Press): Place | null {
    if (!layout || !game || !p.from) return null;
    const { w, h } = layout;
    const near = (bx: number, by: number) => Math.abs(x - (bx + w / 2)) <= w * 0.75 && Math.abs(y - (by + h / 2)) <= h * 0.75;
    for (let s = 0; s < layout.foundations.length; s++) {
      const to: Place = { kind: 'foundation', suit: s };
      if (near(layout.foundations[s]!.x, layout.foundations[s]!.y) && canMove(game, p.from, p.index, to)) return to;
    }
    let best: Place | null = null;
    let bestDist = Infinity;
    for (let i = 0; i < layout.columns.length; i++) {
      const col = layout.columns[i]!;
      const dist = Math.abs(x - (col.x + w / 2));
      if (dist > w * 0.75 || y < col.y - h * 0.25) continue;
      const to: Place = { kind: 'column', index: i };
      if (dist < bestDist && canMove(game, p.from, p.index, to)) {
        best = to;
        bestDist = dist;
      }
    }
    return best;
  }

  function showDrop(to: Place | null): void {
    if (!to || !layout || !game) {
      dropMark.hidden = true;
      return;
    }
    let x: number;
    let y: number;
    if (to.kind === 'foundation') ({ x, y } = layout.foundations[to.suit]!);
    else if (to.kind === 'column') {
      const top = game.columns[to.index]!.at(-1);
      ({ x, y } = top === undefined ? layout.columns[to.index]! : layout.cards.get(top)!);
    } else return;
    dropMark.hidden = false;
    place(dropMark, x, y);
  }

  el.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || press || !game) return;
    const target = targetOfElement(e.target as Element);
    if (!target) return;
    let moving: Card[] = [];
    let from: Place | null = null;
    let index = 0;
    if (target.kind === 'card') {
      const cards = movingCards(game, target.place, target.index);
      if (cards) {
        moving = cards;
        from = target.place;
        index = target.index;
      }
    }
    press = { id: e.pointerId, x0: e.clientX, y0: e.clientY, target, moving, from, index, dragging: false, lift: 0, drop: null };
    el.setPointerCapture(e.pointerId);
  });
  // A finger on the table is handled here alone (pointer events above): no gestures of the browser for it. Otherwise
  // a quick drag of a card counts as a fling, and the browser swallows the next tap on a button for a moment — the
  // «Зібрати все» that has just shown up under the table did nothing (found by the finger tests).
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
      const moved = !cancelled && p.drop && p.from ? handlers.drop(p.from, p.index, p.drop) : false;
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
    else if (homeSlots.includes(node as HTMLButtonElement)) focusKey = `home:${homeSlots.indexOf(node as HTMLButtonElement)}`;
    else if (columnSlots.includes(node as HTMLButtonElement)) focusKey = `column:${columnSlots.indexOf(node as HTMLButtonElement)}`;
  });

  // ---------- keys ----------
  /** The middle of what can be seen of a place: a covered card shows only its top strip. */
  function centreOf(node: HTMLElement): { x: number; y: number } | null {
    if (!layout || !game) return null;
    const r = node.getBoundingClientRect();
    const card = node.dataset.card ? Number(node.dataset.card) : null;
    if (card !== null) {
      const loc = where.get(card);
      if (loc && loc.place !== 'stock' && loc.place.kind === 'column') {
        const next = game.columns[loc.place.index]![loc.index + 1];
        if (next !== undefined) {
          const below = views[next]!.el.getBoundingClientRect();
          return { x: r.left + r.width / 2, y: (r.top + below.top) / 2 };
        }
      }
    }
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  function step(dir: 'left' | 'right' | 'up' | 'down'): boolean {
    const nodes = [...el.querySelectorAll<HTMLElement>('.card:not([aria-hidden]), .slot:not([aria-hidden]):not(.slot--waste)')];
    const current = el.contains(document.activeElement) ? (document.activeElement as HTMLElement) : null;
    if (!current) {
      const start = nodes.find((n) => n.tabIndex === 0) ?? nodes[0];
      start?.focus();
      return !!start;
    }
    const from = centreOf(current);
    if (!from) return false;
    let best: HTMLElement | null = null;
    let bestScore = Infinity;
    for (const node of nodes) {
      if (node === current) continue;
      const c = centreOf(node);
      if (!c) continue;
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
      if (target.kind === 'card') {
        const cards = movingCards(game, target.place, target.index);
        const loc = target.place.kind === 'column' ? game.columns[target.place.index]![target.index] : undefined;
        nodes = (cards ?? (loc !== undefined ? [loc] : [])).map((c) => views[c]!.el);
      } else if (target.kind === 'stock') nodes = [stockSlot];
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
