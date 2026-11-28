// Carrying a piece (docs/jigsaw/SPEC.md, "Як грати"): lifted from the tray, the piece takes its size on the board and
// follows the finger — above it, so the finger does not hide it (.claude/rules/design.md), at the mouse's point. The
// board shows the place under the piece's middle. Let go: near its own place the piece glides into it; anywhere else
// it glides back to the tray. With "reduce motion" there is no gliding.
import { h, svg } from '../../../shared/ui/dom.ts';
import { JIGSAW } from '../config.ts';

/** A finger's piece rides this far above the finger (its lowest knob), CSS px (C). */
const TOUCH_LIFT_PX = 28;
/** How long a piece glides into its place or back, ms (none with "reduce motion"). */
const GLIDE_MS = 140;

export interface DragDeps {
  /** A piece's size on the board now, CSS px. */
  cellPx(): number;
  /** The board's point (in pieces) under a point of the screen; null off the part of the board seen. */
  boardPoint(clientX: number, clientY: number): { x: number; y: number } | null;
  /** The place under the carried piece's middle changed (null — off the board). */
  over(piece: number, place: number | null): void;
  /**
   * Let go at (x, y) of the board: whether the piece went into its place — then the piece's drawing box there on the
   * screen (its square and the margin round it); null — not here.
   */
  drop(piece: number, x: number, y: number): DOMRect | null;
  /** Let go off the board, or not near its place: its drawing box in the tray (null — not on the page seen). */
  back(piece: number): DOMRect | null;
  /** The carrying ended either way. */
  ended(piece: number): void;
  art(piece: number): string;
}

const still = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function createDrag(deps: DragDeps) {
  const layer = h('div', { class: 'lift-layer', 'aria-hidden': 'true' });
  let carry: { piece: number; id: number; el: HTMLElement; size: number; touch: boolean; cols: number; place: number | null } | null = null;

  /** The middle of a piece carried by a pointer at (x, y): above a finger, at the mouse's point. */
  function middleOf(c: { size: number; touch: boolean }, x: number, y: number): { x: number; y: number } {
    return c.touch ? { x, y: y - c.size / 2 - TOUCH_LIFT_PX } : { x, y };
  }

  function put(el: HTMLElement, mx: number, my: number, size: number): void {
    el.style.transform = `translate(${Math.round(mx - size / 2)}px, ${Math.round(my - size / 2)}px)`;
  }

  function move(e: PointerEvent): void {
    if (!carry || e.pointerId !== carry.id) return;
    const m = middleOf(carry, e.clientX, e.clientY);
    put(carry.el, m.x, m.y, carry.size);
    const p = deps.boardPoint(m.x, m.y);
    const place = p ? Math.floor(p.y) * carry.cols + Math.floor(p.x) : null;
    if (place !== carry.place) {
      carry.place = place;
      deps.over(carry.piece, place);
    }
  }

  /** The lifted piece glides onto a piece's drawing box on the screen (in its place, or in the tray) and is gone. */
  function glide(el: HTMLElement, to: DOMRect | null): void {
    if (!to || still()) {
      el.remove();
      return;
    }
    el.classList.add('is-gliding');
    el.style.width = `${to.width}px`;
    el.style.height = `${to.height}px`;
    el.style.transform = `translate(${Math.round(to.left)}px, ${Math.round(to.top)}px)`;
    window.setTimeout(() => el.remove(), GLIDE_MS);
  }

  function finish(e: PointerEvent, cancelled: boolean): void {
    if (!carry || e.pointerId !== carry.id) return;
    const c = carry;
    carry = null;
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', cancel);
    deps.over(c.piece, null);
    const m = middleOf(c, e.clientX, e.clientY);
    const p = cancelled ? null : deps.boardPoint(m.x, m.y);
    const into = p ? deps.drop(c.piece, p.x, p.y) : null;
    glide(c.el, into ?? deps.back(c.piece));
    deps.ended(c.piece);
  }

  const up = (e: PointerEvent) => finish(e, false);
  const cancel = (e: PointerEvent) => finish(e, true);

  return {
    layer,
    /** Lifts a piece under a pointer that is moving from it; `cols` — pieces across the board. */
    start(piece: number, e: PointerEvent, cols: number): void {
      if (carry) return;
      const size = Math.round(deps.cellPx() * (1 + 2 * JIGSAW.margin));
      const el = h('div', { class: 'lift' });
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
      el.append(svg(deps.art(piece)));
      layer.append(el);
      carry = { piece, id: e.pointerId, el, size, touch: e.pointerType === 'touch', cols, place: null };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', cancel);
      move(e);
    },
    carrying: (): number | null => carry?.piece ?? null,
  };
}
