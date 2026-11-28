// The tray (docs/jigsaw/SPEC.md, "Як грати"): the pieces not yet in place, in the tray's order, a page at a time —
// as many as its room holds, turned with ‹ ›, no scrolling (a finger would catch what it should not). ‹ › stand
// under the pieces or beside them, whichever leaves room for more (a phone on its side: beside). A piece in the tray
// is never smaller than a finger wants (rule 6), and as large as on the board up to a size while a page still holds
// enough of them. A tap takes a piece (again — gives it back); a finger moving from a piece lifts it — the carrying is
// the screen's then. The keys: the tray is one Tab stop, arrows walk its pieces (and on to the next or the last
// page), Enter or Space takes one.
import { h, svg } from '../../../shared/ui/dom.ts';
import { JIGSAW } from '../config.ts';

/** The page's rem when the player's text size is the browser's own: the tray's pieces grow with larger text, up to
 * this much (the large mode's size and a little more). */
const BASE_REM = 16;
const MAX_SCALE = 1.25;
/** A page of the tray should hold at least this many pieces before they may be larger than the least. */
const FEW = 4;
/** The gap between two pieces in the tray, CSS px; ‹ › — their height under the pieces, their width beside them, and
 * the gap to the pieces, rem (styles/app.css). */
const GAP_PX = 4;
const NAV_REM = 2.75;
const NAV_SIDE_REM = 2.75;
const GAP_REM = 0.375;

export interface TrayShow {
  /** The pieces in the tray, in its order. */
  pieces: readonly number[];
  taken: number | null;
  hint: number | null;
  /** One piece's drawing (SVG text), sized by its place in the tray. */
  art(piece: number): string;
  label(piece: number): string;
  texts: { label: string; prev: string; next: string; page(n: number, total: number): string };
}

export interface TrayActions {
  /** A short tap on a piece, or Enter or Space (`keys`). */
  tap(piece: number, keys: boolean): void;
  /** A piece lifted by a finger or the mouse moving from it: carrying it is the screen's from here. */
  lift(piece: number, event: PointerEvent): void;
}

export function createTrayView(actions: TrayActions) {
  const grid = h('div', { class: 'tray__pieces', role: 'group' });
  const prev = h('button', { class: 'tray__turn', type: 'button' }, h('span', { 'aria-hidden': 'true' }, '‹'));
  const next = h('button', { class: 'tray__turn', type: 'button' }, h('span', { 'aria-hidden': 'true' }, '›'));
  prev.classList.add('tray__prev');
  next.classList.add('tray__next');
  const count = h('span', { class: 'tray__count' });
  const el = h('div', { class: 'tray' }, grid, prev, count, next);

  let show: TrayShow | null = null;
  /** The size of a piece without its knobs on the board now (CSS px): the tray's are as large, within bounds. */
  let boardCell = 0;
  let page = 0;
  let perPage = 1;
  let slotPx = 0;
  let slots: HTMLButtonElement[] = [];
  /** What the page shows: its pieces and their size, so that it is built again only when that changes. */
  let drawn = '';
  let active = 0;
  let press: { piece: number; id: number; x: number; y: number } | null = null;

  // a finger in the tray belongs to the game (.claude/rules/design.md)
  grid.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });

  /**
   * The tray's pieces: their size, and how many a page holds — the whole room when all fit, else less the room of
   * ‹ › (under the pieces or beside them, whichever holds more). The size: as on the board within the tray's bounds,
   * smaller while a page would hold fewer than `tray.page` pieces (or all that are left), never under the least.
   */
  function measure(count: number): void {
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    // the pieces grow with the large mode, not with very large system text (that is for reading)
    const scale = Math.min(rem / BASE_REM, MAX_SCALE);
    const w = el.clientWidth;
    const hgt = el.clientHeight;
    // whole pieces only: a pixel or two short of a row is no row (it would be cut off)
    const across = (room: number, slot: number) => Math.max(0, Math.floor((room - 2 + GAP_PX) / (slot + GAP_PX)));
    const fit = (slot: number) => {
      const all = across(w, slot) * across(hgt, slot);
      if (count <= all) return { per: all, cols: across(w, slot), way: 'all' as const };
      const under = across(w, slot) * across(hgt - (NAV_REM + GAP_REM) * rem, slot);
      const besideCols = across(w - 2 * (NAV_SIDE_REM + GAP_REM) * rem, slot);
      const beside = besideCols * across(hgt, slot);
      return beside > under ? { per: beside, cols: besideCols, way: 'side' as const } : { per: under, cols: across(w, slot), way: 'under' as const };
    };
    const slotOf = (body: number) => Math.round(body * (1 + 2 * JIGSAW.margin));
    // the least size of the player's text; on a screen too small for a few pieces of it, the least of all (rule 6)
    const smallest = JIGSAW.tray.least;
    let least = Math.round(smallest * scale);
    if (least > smallest && fit(slotOf(least)).per < Math.min(count, FEW)) least = smallest;
    const largest = Math.round(Math.min(JIGSAW.tray.most * scale, Math.max(least, boardCell)));
    const want = Math.min(count, JIGSAW.tray.page);
    let body = least;
    for (let b = largest; b > least; b -= 2) {
      if (fit(slotOf(b)).per >= want) {
        body = b;
        break;
      }
    }
    slotPx = slotOf(body);
    // one column of the page (a phone upright): the tray keeps room for rows enough, however large the text around it —
    // then the page scrolls (styles/app.css sets how many rows; on a phone on its side and a computer none)
    const rowsMin = parseInt(getComputedStyle(el).getPropertyValue('--rows-min'), 10) || 0;
    el.style.minHeight = rowsMin ? `${rowsMin * (slotPx + GAP_PX) + (NAV_REM + GAP_REM) * rem}px` : '';
    const f = fit(slotPx);
    // a room too small for even one piece: one, beside ‹ › (the page scrolls to it)
    perPage = Math.max(1, f.per);
    el.dataset.way = f.per ? f.way : 'side';
    el.style.setProperty('--slot', `${slotPx}px`);
    el.style.setProperty('--tray-cols', String(Math.max(1, f.cols)));
  }

  function pagesOf(s: TrayShow): number {
    return Math.max(1, Math.ceil(s.pieces.length / perPage));
  }

  function draw(): void {
    const s = show;
    if (!s) return;
    measure(s.pieces.length);
    const total = pagesOf(s);
    page = Math.min(page, total - 1);
    const onPage = s.pieces.slice(page * perPage, (page + 1) * perPage);
    const key = `${slotPx}|${onPage.join()}`;
    if (key !== drawn) {
      drawn = key;
      slots = onPage.map((piece) => {
        const b = h('button', { class: 'slot', type: 'button', tabindex: -1 });
        b.dataset.piece = String(piece);
        b.append(svg(s.art(piece)));
        return b;
      });
      grid.replaceChildren(...slots);
      active = Math.min(active, Math.max(0, slots.length - 1));
    }
    slots.forEach((b, i) => {
      const piece = Number(b.dataset.piece);
      b.tabIndex = i === active ? 0 : -1;
      b.classList.toggle('is-taken', s.taken === piece);
      b.classList.toggle('is-hint', s.hint === piece);
      b.setAttribute('aria-pressed', String(s.taken === piece));
      b.setAttribute('aria-label', s.label(piece));
    });
    grid.setAttribute('aria-label', s.texts.label);
    count.textContent = s.texts.page(page + 1, total);
    prev.setAttribute('aria-label', s.texts.prev);
    next.setAttribute('aria-label', s.texts.next);
    prev.disabled = page === 0;
    next.disabled = page >= total - 1;
  }

  function turn(by: number, focusAt: 'first' | 'last' | null = null): void {
    if (!show) return;
    const total = pagesOf(show);
    const to = Math.min(total - 1, Math.max(0, page + by));
    if (to === page) return;
    page = to;
    active = 0;
    draw();
    if (focusAt) {
      active = focusAt === 'first' ? 0 : slots.length - 1;
      draw();
      slots[active]?.focus();
    }
  }

  prev.addEventListener('click', () => turn(-1));
  next.addEventListener('click', () => turn(1));

  // ---------- fingers and the mouse ----------
  grid.addEventListener('pointerdown', (e) => {
    const slot = (e.target as HTMLElement).closest<HTMLElement>('.slot');
    if (!slot || (e.pointerType === 'mouse' && e.button !== 0)) return;
    press = { piece: Number(slot.dataset.piece), id: e.pointerId, x: e.clientX, y: e.clientY };
    slot.setPointerCapture(e.pointerId);
  });

  grid.addEventListener('pointermove', (e) => {
    const p = press;
    if (!p || p.id !== e.pointerId) return;
    if (Math.hypot(e.clientX - p.x, e.clientY - p.y) < JIGSAW.dragStart) return;
    press = null;
    actions.lift(p.piece, e);
  });

  grid.addEventListener('pointerup', (e) => {
    const p = press;
    press = null;
    if (p && p.id === e.pointerId) actions.tap(p.piece, false);
  });
  grid.addEventListener('pointercancel', () => (press = null));

  // the keys press a button with no pointer; a pointer's click is handled above
  grid.addEventListener('click', (e) => {
    const slot = (e.target as HTMLElement).closest<HTMLElement>('.slot');
    if (slot && e.detail === 0) actions.tap(Number(slot.dataset.piece), true);
  });

  grid.addEventListener('keydown', (e) => {
    const step = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[e.key];
    if (!step || !show) return;
    e.preventDefault();
    const to = active + step;
    if (to < 0) turn(-1, 'last');
    else if (to >= slots.length) turn(1, 'first');
    else {
      active = to;
      draw();
      slots[active]?.focus();
    }
  });

  grid.addEventListener('focusin', (e) => {
    const i = slots.indexOf((e.target as HTMLElement).closest<HTMLButtonElement>('.slot')!);
    if (i >= 0 && i !== active) {
      active = i;
      slots.forEach((b, j) => (b.tabIndex = j === active ? 0 : -1));
    }
  });

  new ResizeObserver(() => {
    if (!show) return;
    drawn = '';
    draw();
  }).observe(el);

  return {
    el,
    render(s: TrayShow): void {
      show = s;
      draw();
    },
    /** The board's piece size changed (zoom, another room): the tray's pieces follow it within their bounds. */
    setBoardCell(px: number): void {
      if (Math.round(px) === Math.round(boardCell)) return;
      boardCell = px;
      if (show) draw();
    },
    /** Turns to the page that holds a piece (the hint's). */
    showPiece(piece: number): void {
      if (!show) return;
      const i = show.pieces.indexOf(piece);
      if (i < 0) return;
      const to = Math.floor(i / perPage);
      if (to !== page) {
        page = to;
        draw();
      }
    },
    /** A piece's place in the tray on the screen; null when it is not on the page seen. */
    slotRect(piece: number): DOMRect | null {
      const b = slots.find((s) => Number(s.dataset.piece) === piece);
      return b ? b.getBoundingClientRect() : null;
    },
    /** Hides a piece's place while it is carried. */
    setCarried(piece: number | null): void {
      for (const b of slots) b.classList.toggle('is-carried', Number(b.dataset.piece) === piece);
    },
    focus(piece?: number): void {
      if (piece !== undefined) {
        const i = slots.findIndex((s) => Number(s.dataset.piece) === piece);
        if (i >= 0) active = i;
      }
      slots.forEach((b, j) => (b.tabIndex = j === active ? 0 : -1));
      slots[active]?.focus();
    },
    /** Back to the first page (a new puzzle). */
    reset(): void {
      page = 0;
      active = 0;
      drawn = '';
    },
  };
}

export type TrayView = ReturnType<typeof createTrayView>;
