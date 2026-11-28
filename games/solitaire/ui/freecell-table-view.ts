// FreeCell's table on the screen (docs/solitaire/SPEC.md, "Вільні клітинки"): the free cells, the foundations and the
// eight columns, laid out for the room there is (freecell-layout.ts); every card is a button. A touch is a tap (the
// cards from the touched one up go to their best place) or a drag (they follow the finger, lifted above it, and land
// where they are let go: a column, a free cell, a foundation); the keys move between cards and places. The cards that
// went home by themselves after a move fly there one after another. The table only shows and passes on what the player
// does: the game decides.
import { h, svg } from '../../../shared/ui/dom.ts';
import { courtSymbols } from '../art/courts.ts';
import { suitSymbolId, suitSymbols } from '../art/suits.ts';
import { FREE_CELLS, SOLITAIRE } from '../config.ts';
import { DECK, SUITS, cardOf, type Card } from '../core/cards.ts';
import { canMove, movingCards, type FreeCell, type FreePlace } from '../core/freecell.ts';
import { createCardView, type CardView } from './card-view.ts';
import { layFreeCell, type FreeLayout } from './freecell-layout.ts';
import { fmt, type Dict } from './i18n.ts';
import { cardName } from './names.ts';

const SVG_NS = 'http://www.w3.org/2000/svg';
/** A finger that moves farther than this before it lets go drags, px. */
const DRAG_START = 8;
/** A card lifted by a finger rises above it by this share of its height, so the finger does not hide it. */
const LIFT = 0.35;
/** A click that comes this soon after a touch was that touch (already handled), ms. */
const CLICK_AFTER_TOUCH_MS = 600;
/** The cards that go home by themselves fly one after another, this far apart, ms. */
const FLY_STEP_MS = 70;

export type FreeTarget = { kind: 'card'; place: FreePlace; index: number } | { kind: 'empty'; place: FreePlace };

export interface FreeTableHandlers {
  /** A card or a place was tapped, or chosen with the keys. */
  tap(target: FreeTarget): void;
  /** Cards were dragged from a place onto another; false — the move was refused (they go back). */
  drop(from: FreePlace, index: number, to: FreePlace): boolean;
}

export interface FreeMarks {
  /** What a hint shows: the cards to move and where. */
  hint: { from: FreePlace; index: number; to: FreePlace } | null;
  /** The cards that have just gone home by themselves, in order: they fly one after another. */
  flying: readonly Card[];
}

export interface FreeTableView {
  el: HTMLElement;
  render(g: FreeCell, marks: FreeMarks, d: Dict): void;
  /** Shakes what cannot move (no motion when the system asks for less). */
  refuse(target: FreeTarget): void;
  hasFocus(): boolean;
  /** Moves the keys' focus the way of an arrow (onto the table first); true if it moved. */
  step(dir: 'left' | 'right' | 'up' | 'down'): boolean;
}

/** Where a card is: a place, and its index there (for a column, from the bottom). */
type Loc = { place: FreePlace; index: number };

interface Press {
  id: number;
  x0: number;
  y0: number;
  target: FreeTarget;
  /** The cards that would move if this becomes a drag (lowest first), and from where. */
  moving: Card[];
  from: FreePlace | null;
  index: number;
  dragging: boolean;
  lift: number;
  drop: FreePlace | null;
}

const samePlace = (a: FreePlace, b: FreePlace): boolean =>
  a.kind === b.kind && (a.kind === 'foundation' ? a.suit === (b as { suit: number }).suit : a.index === (b as { index: number }).index);

export function createFreeTableView(handlers: FreeTableHandlers): FreeTableView {
  const el = h('div', { class: 'table table--freecell', role: 'group' });
  const sprite = svg(`<svg xmlns="${SVG_NS}" class="table__sprite" aria-hidden="true" focusable="false">${suitSymbols()}${courtSymbols()}</svg>`);
  const views: CardView[] = Array.from({ length: DECK }, (_, c) => createCardView(c));
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
  const cellSlots = Array.from({ length: Math.max(...FREE_CELLS) }, () => h('button', { class: 'slot slot--cell', type: 'button', tabindex: -1 }));
  const columnSlots = Array.from({ length: SOLITAIRE.freecell.columns }, () => h('button', { class: 'slot slot--column', type: 'button', tabindex: -1 }));
  const dropMark = h('div', { class: 'drop-mark', 'aria-hidden': 'true', hidden: true });
  el.append(sprite, ...homeSlots, ...cellSlots, ...columnSlots, ...views.map((v) => v.el), dropMark);

  let game: FreeCell | null = null;
  let layout: FreeLayout | null = null;
  let offsetX = 0;
  let where = new Map<Card, Loc>();
  let lastMarks: FreeMarks = { hint: null, flying: [] };
  let lastDict: Dict | null = null;
  /** What the cards were last laid out for: when it changes (a new deal, another size), they jump, not slide. */
  let laidFor = '';
  let press: Press | null = null;
  let lastTouchUp = -Infinity;
  /** What the keys stand on: "card:N", "cell:K", "home:S", "column:I". */
  let focusKey = '';

  new ResizeObserver(() => {
    if (game && lastDict) render(game, { ...lastMarks, flying: [] }, lastDict);
  }).observe(el);

  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- what is where ----------
  function locate(g: FreeCell): Map<Card, Loc> {
    const map = new Map<Card, Loc>();
    g.columns.forEach((col, i) => col.forEach((card, k) => map.set(card, { place: { kind: 'column', index: i }, index: k })));
    g.cells.forEach((card, k) => {
      if (card !== null) map.set(card, { place: { kind: 'cell', index: k }, index: 0 });
    });
    g.foundations.forEach((rank, s) => {
      for (let r = 1; r <= rank; r++) map.set(cardOf(s, r), { place: { kind: 'foundation', suit: s }, index: r - 1 });
    });
    return map;
  }

  function targetOfElement(node: Element | null): FreeTarget | null {
    const cardEl = node?.closest<HTMLElement>('.card');
    if (cardEl?.dataset.card) {
      const loc = where.get(Number(cardEl.dataset.card));
      return loc ? { kind: 'card', place: loc.place, index: loc.index } : null;
    }
    const slot = node?.closest<HTMLElement>('.slot');
    if (!slot) return null;
    const home = homeSlots.indexOf(slot as HTMLButtonElement);
    if (home >= 0) return { kind: 'empty', place: { kind: 'foundation', suit: home } };
    const cell = cellSlots.indexOf(slot as HTMLButtonElement);
    if (cell >= 0) return { kind: 'empty', place: { kind: 'cell', index: cell } };
    const column = columnSlots.indexOf(slot as HTMLButtonElement);
    return column >= 0 ? { kind: 'empty', place: { kind: 'column', index: column } } : null;
  }

  // ---------- drawing ----------
  const place = (node: HTMLElement, x: number, y: number) => {
    node.style.transform = `translate(${x + offsetX}px, ${y}px)`;
  };

  function render(g: FreeCell, marks: FreeMarks, d: Dict): void {
    game = g;
    lastMarks = marks;
    lastDict = d;
    where = locate(g);
    const room = { width: el.clientWidth, height: el.clientHeight };
    if (room.width <= 0 || room.height <= 0) return;
    const lay = layFreeCell(g, room);
    layout = lay;
    const key = `${room.width}x${room.height}:${g.seed}:${g.cells.length}:${g.daily ?? ''}`;
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
    const hintCards = new Set<Card>(hint ? (movingCards(g, hint.from, hint.index) ?? []) : []);
    const flyOrder = new Map(reducedMotion() ? [] : marks.flying.map((card, k) => [card, k + 1] as const));

    // the cards
    const focusable = new Map<string, HTMLElement>();
    for (const v of views) {
      const card = Number(v.el.dataset.card);
      const spot = lay.cards.get(card)!;
      const loc = where.get(card)!;
      const fly = flyOrder.get(card);
      v.el.style.transitionDelay = fly ? `${fly * FLY_STEP_MS}ms` : '';
      if (!press?.dragging || !press.moving.includes(card)) place(v.el, spot.x, spot.y);
      v.el.style.zIndex = String(spot.z);
      v.paint(d);
      v.el.classList.remove('is-down');
      v.el.classList.toggle('is-hint', hintCards.has(card));
      v.el.classList.remove('is-target');
      let label: string | null = null;
      const name = cardName(card, d);
      if (loc.place.kind === 'column') label = fmt(d.game.column, { card: name, n: loc.place.index + 1 });
      else if (loc.place.kind === 'cell') label = fmt(d.freecell.cellCard, { card: name, n: loc.place.index + 1 });
      else if (loc.index === g.foundations[loc.place.suit]! - 1) label = fmt(d.game.foundation, { card: name });
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
    const targetIs = (p: FreePlace) => !!hint && samePlace(hint.to, p);
    homeSlots.forEach((slot, s) => {
      place(slot, lay.foundations[s]!.x, lay.foundations[s]!.y);
      const empty = g.foundations[s] === 0;
      slot.setAttribute('aria-label', fmt(d.game.foundationEmpty, { suit: d.cards.suits[SUITS[s]!] }));
      slot.toggleAttribute('aria-hidden', !empty);
      slot.classList.toggle('is-target', targetIs({ kind: 'foundation', suit: s }));
      if (empty) focusable.set(`home:${s}`, slot);
    });
    cellSlots.forEach((slot, k) => {
      const box = lay.cells[k];
      slot.hidden = !box;
      if (!box) return;
      place(slot, box.x, box.y);
      const empty = g.cells[k] === null;
      slot.setAttribute('aria-label', fmt(d.freecell.cellEmpty, { n: k + 1 }));
      slot.toggleAttribute('aria-hidden', !empty);
      slot.classList.toggle('is-target', empty && targetIs({ kind: 'cell', index: k }));
      if (empty) focusable.set(`cell:${k}`, slot);
    });
    columnSlots.forEach((slot, i) => {
      place(slot, lay.columns[i]!.x, lay.columns[i]!.y);
      const empty = g.columns[i]!.length === 0;
      slot.setAttribute('aria-label', fmt(d.game.columnEmpty, { n: i + 1 }));
      slot.toggleAttribute('aria-hidden', !empty);
      slot.classList.toggle('is-target', empty && targetIs({ kind: 'column', index: i }));
      if (empty) focusable.set(`column:${i}`, slot);
    });
    // a hint's target with a card on it: that card shows it
    if (hint) {
      const to = hint.to;
      const top =
        to.kind === 'column' ? g.columns[to.index]!.at(-1) : to.kind === 'foundation' && g.foundations[to.suit]! > 0 ? cardOf(to.suit, g.foundations[to.suit]!) : undefined;
      if (top !== undefined) views[top]!.el.classList.add('is-target');
    }

    // one stop of the Tab key on the table
    if (!focusable.has(focusKey)) focusKey = firstFocus(g, focusable);
    for (const [k, node] of focusable) node.tabIndex = k === focusKey ? 0 : -1;
    for (const v of views) if (!focusable.has(`card:${v.el.dataset.card}`)) v.el.tabIndex = -1;
    const stops = new Set(focusable.values());
    for (const slot of [...homeSlots, ...cellSlots, ...columnSlots]) if (!stops.has(slot)) slot.tabIndex = -1;
  }

  function firstFocus(g: FreeCell, focusable: Map<string, HTMLElement>): string {
    for (let i = 0; i < g.columns.length; i++) {
      const top = g.columns[i]!.at(-1);
      if (top !== undefined && focusable.has(`card:${top}`)) return `card:${top}`;
    }
    return focusable.keys().next().value ?? '';
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
    p.drop = dropAt(first.x + dx + layout.w / 2, first.y + dy - p.lift + layout.h / 2, p);
    showDrop(p.drop);
  }

  function dropAt(x: number, y: number, p: Press): FreePlace | null {
    if (!layout || !game || !p.from) return null;
    const { w, h } = layout;
    const from = p.from;
    const near = (bx: number, by: number) => Math.abs(x - (bx + w / 2)) <= w * 0.75 && Math.abs(y - (by + h / 2)) <= h * 0.75;
    for (let s = 0; s < layout.foundations.length; s++) {
      const to: FreePlace = { kind: 'foundation', suit: s };
      if (near(layout.foundations[s]!.x, layout.foundations[s]!.y) && canMove(game, from, p.index, to)) return to;
    }
    for (let k = 0; k < layout.cells.length; k++) {
      const to: FreePlace = { kind: 'cell', index: k };
      if (near(layout.cells[k]!.x, layout.cells[k]!.y) && canMove(game, from, p.index, to)) return to;
    }
    let best: FreePlace | null = null;
    let bestDist = Infinity;
    for (let i = 0; i < layout.columns.length; i++) {
      const col = layout.columns[i]!;
      const dist = Math.abs(x - (col.x + w / 2));
      if (dist > w * 0.75 || y < col.y - h * 0.25) continue;
      const to: FreePlace = { kind: 'column', index: i };
      if (dist < bestDist && canMove(game, from, p.index, to)) {
        best = to;
        bestDist = dist;
      }
    }
    return best;
  }

  function showDrop(to: FreePlace | null): void {
    if (!to || !layout || !game) {
      dropMark.hidden = true;
      return;
    }
    let box;
    if (to.kind === 'foundation') box = layout.foundations[to.suit]!;
    else if (to.kind === 'cell') box = layout.cells[to.index]!;
    else {
      const top = game.columns[to.index]!.at(-1);
      box = top === undefined ? layout.columns[to.index]! : layout.cards.get(top)!;
    }
    dropMark.hidden = false;
    place(dropMark, box.x, box.y);
  }

  el.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || press || !game) return;
    const target = targetOfElement(e.target as Element);
    if (!target) return;
    let moving: Card[] = [];
    let from: FreePlace | null = null;
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
        views[card]!.el.style.transitionDelay = '';
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
      if (!moved && game && lastDict) render(game, { ...lastMarks, flying: [] }, lastDict);
      return;
    }
    if (!cancelled) handlers.tap(p.target);
  }

  el.addEventListener('pointerup', (e) => endPress(e, false));
  el.addEventListener('pointercancel', (e) => endPress(e, true));
  // Keys (Enter, Space) and assistive technology press buttons with a click alone; a click right after a touch is that
  // touch, already handled.
  el.addEventListener('click', (e) => {
    if (performance.now() - lastTouchUp < CLICK_AFTER_TOUCH_MS) return;
    const target = targetOfElement(e.target as Element);
    if (target) handlers.tap(target);
  });
  el.addEventListener('focusin', (e) => {
    const node = e.target as HTMLElement;
    if (node.dataset.card) focusKey = `card:${node.dataset.card}`;
    else if (homeSlots.includes(node as HTMLButtonElement)) focusKey = `home:${homeSlots.indexOf(node as HTMLButtonElement)}`;
    else if (cellSlots.includes(node as HTMLButtonElement)) focusKey = `cell:${cellSlots.indexOf(node as HTMLButtonElement)}`;
    else if (columnSlots.includes(node as HTMLButtonElement)) focusKey = `column:${columnSlots.indexOf(node as HTMLButtonElement)}`;
  });

  // ---------- keys ----------
  /** The middle of what can be seen of a place: a covered card shows only its top strip. */
  function centreOf(node: HTMLElement): { x: number; y: number } {
    const r = node.getBoundingClientRect();
    const card = node.dataset.card ? Number(node.dataset.card) : null;
    if (card !== null && game) {
      const loc = where.get(card);
      if (loc?.place.kind === 'column') {
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
    const nodes = [...el.querySelectorAll<HTMLElement>('.card:not([aria-hidden]), .slot:not([aria-hidden]):not([hidden])')];
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
      if (target.kind === 'card') {
        const cards = movingCards(game, target.place, target.index);
        const own = target.place.kind === 'column' ? game.columns[target.place.index]!.slice(target.index) : target.place.kind === 'cell' ? [game.cells[target.place.index]!] : [];
        nodes = (cards ?? own).filter((c) => c !== null).map((c) => views[c]!.el);
      }
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
