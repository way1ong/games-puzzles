// The room on the screen: one SVG in a box that scrolls with the browser's own scrolling. Size — buttons,
// two fingers, Ctrl + wheel; a touch — a tap or a click; from the keyboard — a pointer moved by the arrows.
// It tells the screen where the player touched; what was found is decided by the rules (core/game.ts).
import { h, svg } from '../../../shared/ui/dom.ts';
import { sceneSvg } from '../art/scene.ts';
import { DETECTIVE } from '../config.ts';
import type { CaseDef } from '../core/cases.ts';
import type { Placed } from '../core/placement.ts';
import { sizeOf, type ThingId } from '../core/things.ts';

const { width: W, height: H } = DETECTIVE.scene;
const SVG_NS = 'http://www.w3.org/2000/svg';
/** The keyboard pointer keeps this far (CSS px) from the edges of what is visible. */
const POINTER_MARGIN = 48;
/** How long a found thing fades and a mark of a touch stays, ms (the same values drive the CSS). */
const FADE_MS = 350;
/** After two fingers leave the screen the browser may still send a click: it is not a touch on a thing. */
const AFTER_PINCH_MS = 350;
/** A mouse press that moves farther than this (CSS px) is a drag of the room, not a click. */
const DRAG_START = 5;

export interface RoomTexts {
  room: string;
  keys: string;
  zoomIn: string;
  zoomOut: string;
}

export interface RoomTouch {
  /** Scene units. */
  x: number;
  y: number;
  /** How far from a thing still counts, scene units (it grows when the room is shown small). */
  tolerance: number;
  byKey: boolean;
}

export interface RoomView {
  el: HTMLElement;
  /** A thing has been found: it fades out of the room. */
  remove(thing: ThingId): void;
  /** A touch that found nothing leaves a small mark for a moment. */
  miss(x: number, y: number): void;
  /** A ring around a thing; the room scrolls to show it. */
  hint(placed: Placed): void;
  /** "Found 3 of 10", shown under the room. */
  setCount(text: string): void;
  setBig(big: boolean): void;
  destroy(): void;
}

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function shape<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, String(value));
  return el;
}

export function createRoomView(def: CaseDef, found: readonly ThingId[], texts: RoomTexts, startBig: boolean, onTouch: (touch: RoomTouch) => void): RoomView {
  const scene = svg(sceneSvg({ ...def, found }, { 'aria-hidden': 'true', focusable: 'false' }));
  const scroll = h('div', { class: 'room__scroll', tabindex: 0, role: 'group', 'aria-label': texts.room, 'aria-describedby': 'room-keys' });
  scroll.append(scene);
  const farther = h('button', { class: 'icon-btn', type: 'button', 'aria-label': texts.zoomOut }, h('span', { class: 'icon-minus', 'aria-hidden': 'true' }));
  const closer = h('button', { class: 'icon-btn', type: 'button', 'aria-label': texts.zoomIn }, h('span', { class: 'icon-plus', 'aria-hidden': 'true' }));
  // The size buttons stand under the room, not over it: nothing may cover a corner where a thing lies.
  const count = h('span', { class: 'room__count' });
  const bar = h('div', { class: 'room__bar' }, count, h('div', { class: 'room__zoom' }, farther, closer));
  // The scrolling box fills its holder without taking part in the layout: however big the room is drawn,
  // the page around it keeps its shape.
  const el = h('div', { class: 'room' }, h('div', { class: 'room__view' }, scroll), bar, h('p', { id: 'room-keys', class: 'visually-hidden' }, texts.keys));
  const marks = scene.querySelector('.scene__marks') as SVGGElement;

  let big = startBig;
  /** CSS pixels per scene unit; 0 — not laid out yet. */
  let scale = 0;
  /** The scale that shows the whole room, and the one that fills the box. */
  let contain = 0;
  let cover = 0;
  let pointer: { x: number; y: number; el: SVGGElement } | null = null;
  let hinted: { thing: ThingId; el: SVGGElement } | null = null;
  let ignoreClicksUntil = 0;

  const clamp = (s: number) => Math.min(DETECTIVE.maxScale, Math.max(contain, s));

  /** `keep` — a point of the room (scene units) that stays at this place of the box (CSS px from its corner). */
  function setScale(next: number, keep?: { x: number; y: number; px: number; py: number }): void {
    const anchor = keep ?? {
      x: scale ? (scroll.scrollLeft + scroll.clientWidth / 2) / scale : W / 2,
      y: scale ? (scroll.scrollTop + scroll.clientHeight / 2) / scale : H / 2,
      px: scroll.clientWidth / 2,
      py: scroll.clientHeight / 2,
    };
    scale = clamp(next);
    scene.setAttribute('width', String(Math.round(W * scale)));
    scene.setAttribute('height', String(Math.round(H * scale)));
    scroll.scrollLeft = anchor.x * scale - anchor.px;
    scroll.scrollTop = anchor.y * scale - anchor.py;
    farther.disabled = scale <= contain * 1.001;
    closer.disabled = scale >= DETECTIVE.maxScale * 0.999;
    if (pointer) pointer.el.setAttribute('transform', `translate(${pointer.x} ${pointer.y}) scale(${1 / scale})`);
  }

  function layout(): void {
    const w = scroll.clientWidth;
    const hgt = scroll.clientHeight;
    if (!w || !hgt) return;
    contain = Math.min(w / W, hgt / H);
    cover = Math.max(w / W, hgt / H);
    // The box has changed (the list under the room grew, the phone was turned): the room keeps its size and
    // its place, only never smaller than the whole room.
    if (scale) setScale(scale);
    else opening();
  }

  /** The size a room opens with: a wide screen shows it whole; a phone fills its height, the room scrolls sideways. */
  function opening(): void {
    const base = contain >= DETECTIVE.wholeRoomScale ? contain : cover;
    scale = 0;
    setScale(base * (big ? DETECTIVE.bigZoom : 1));
  }

  const observer = new ResizeObserver(layout);
  observer.observe(scroll);

  function zoom(factor: number, keep?: { x: number; y: number; px: number; py: number }): void {
    if (!scale) return;
    setScale(scale * factor, keep);
  }
  closer.addEventListener('click', () => zoom(DETECTIVE.zoomStep));
  farther.addEventListener('click', () => zoom(1 / DETECTIVE.zoomStep));

  /** A point of the screen in scene units. */
  function toScene(clientX: number, clientY: number): { x: number; y: number } {
    const box = scene.getBoundingClientRect();
    return { x: (clientX - box.left) / scale, y: (clientY - box.top) / scale };
  }
  const inBox = (clientX: number, clientY: number) => {
    const box = scroll.getBoundingClientRect();
    return { px: clientX - box.left, py: clientY - box.top };
  };

  // ---------- touch and click ----------
  scene.addEventListener('click', (event) => {
    if (!scale || performance.now() < ignoreClicksUntil) return;
    const { x, y } = toScene(event.clientX, event.clientY);
    onTouch({ x, y, tolerance: DETECTIVE.hitRadiusPx / scale, byKey: false });
  });

  // two fingers: closer and farther around the point between them
  let pinch: { distance: number; scale: number; x: number; y: number } | null = null;
  const spread = (t: TouchList) => Math.hypot((t[0] as Touch).clientX - (t[1] as Touch).clientX, (t[0] as Touch).clientY - (t[1] as Touch).clientY);
  const middle = (t: TouchList) => ({
    clientX: ((t[0] as Touch).clientX + (t[1] as Touch).clientX) / 2,
    clientY: ((t[0] as Touch).clientY + (t[1] as Touch).clientY) / 2,
  });
  scroll.addEventListener(
    'touchstart',
    (event) => {
      if (event.touches.length !== 2 || !scale) return;
      const mid = middle(event.touches);
      pinch = { distance: spread(event.touches), scale, ...toScene(mid.clientX, mid.clientY) };
    },
    { passive: true },
  );
  scroll.addEventListener(
    'touchmove',
    (event) => {
      if (!pinch || event.touches.length !== 2) return;
      event.preventDefault();
      const mid = middle(event.touches);
      setScale((pinch.scale * spread(event.touches)) / pinch.distance, { x: pinch.x, y: pinch.y, ...inBox(mid.clientX, mid.clientY) });
    },
    { passive: false },
  );
  const endPinch = () => {
    if (!pinch) return;
    pinch = null;
    ignoreClicksUntil = performance.now() + AFTER_PINCH_MS;
  };
  scroll.addEventListener('touchend', endPinch);
  scroll.addEventListener('touchcancel', endPinch);

  // Ctrl + wheel (and a pinch on a laptop's touchpad)
  scroll.addEventListener(
    'wheel',
    (event) => {
      if (!event.ctrlKey || !scale) return;
      event.preventDefault();
      zoom(Math.exp(-event.deltaY * 0.01), { ...toScene(event.clientX, event.clientY), ...inBox(event.clientX, event.clientY) });
    },
    { passive: false },
  );

  // the mouse drags the room when it is bigger than the box
  let drag: { x: number; y: number; left: number; top: number; moved: boolean } | null = null;
  scroll.addEventListener('pointerdown', (event) => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    drag = { x: event.clientX, y: event.clientY, left: scroll.scrollLeft, top: scroll.scrollTop, moved: false };
  });
  scroll.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < DRAG_START) return;
    drag.moved = true;
    scroll.classList.add('is-dragged');
    scroll.scrollLeft = drag.left - dx;
    scroll.scrollTop = drag.top - dy;
  });
  const endDrag = () => {
    // The click that ends a drag is not a touch on a thing.
    if (drag?.moved) ignoreClicksUntil = performance.now() + 50;
    drag = null;
    scroll.classList.remove('is-dragged');
  };
  scroll.addEventListener('pointerup', endDrag);
  scroll.addEventListener('pointerleave', endDrag);
  scroll.addEventListener('pointercancel', endDrag);

  // ---------- keyboard ----------
  function showPointer(): void {
    if (pointer || !scale) return;
    const node = shape('g', { class: 'pointer' });
    node.append(
      shape('circle', { r: 14, class: 'mark-edge' }),
      shape('circle', { r: 14, class: 'mark-line' }),
      shape('path', { d: 'M-22 0 H-8 M8 0 H22 M0 -22 V-8 M0 8 V22', class: 'mark-edge' }),
      shape('path', { d: 'M-22 0 H-8 M8 0 H22 M0 -22 V-8 M0 8 V22', class: 'mark-line' }),
    );
    marks.append(node);
    pointer = { x: (scroll.scrollLeft + scroll.clientWidth / 2) / scale, y: (scroll.scrollTop + scroll.clientHeight / 2) / scale, el: node };
    movePointer(0, 0);
  }

  function movePointer(dx: number, dy: number): void {
    if (!pointer) return;
    pointer.x = Math.min(W, Math.max(0, pointer.x + dx));
    pointer.y = Math.min(H, Math.max(0, pointer.y + dy));
    pointer.el.setAttribute('transform', `translate(${pointer.x} ${pointer.y}) scale(${1 / scale})`);
    // keep it in sight
    const px = pointer.x * scale - scroll.scrollLeft;
    const py = pointer.y * scale - scroll.scrollTop;
    const marginX = Math.min(POINTER_MARGIN, scroll.clientWidth / 4);
    const marginY = Math.min(POINTER_MARGIN, scroll.clientHeight / 4);
    if (px < marginX) scroll.scrollLeft = pointer.x * scale - marginX;
    if (px > scroll.clientWidth - marginX) scroll.scrollLeft = pointer.x * scale - scroll.clientWidth + marginX;
    if (py < marginY) scroll.scrollTop = pointer.y * scale - marginY;
    if (py > scroll.clientHeight - marginY) scroll.scrollTop = pointer.y * scale - scroll.clientHeight + marginY;
  }

  scroll.addEventListener('keydown', (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey || !scale) return;
    const step = event.shiftKey ? DETECTIVE.cursorBigStep : DETECTIVE.cursorStep;
    const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const move = moves[event.key];
    if (move) {
      if (pointer) movePointer(move[0], move[1]);
      else showPointer();
    } else if (event.key === 'Enter' || event.key === ' ') {
      if (!pointer) showPointer();
      else onTouch({ x: pointer.x, y: pointer.y, tolerance: DETECTIVE.hitRadiusPx / scale, byKey: true });
    } else if (event.key === '+' || event.key === '=') zoom(DETECTIVE.zoomStep);
    else if (event.key === '-' || event.key === '_') zoom(1 / DETECTIVE.zoomStep);
    else return;
    event.preventDefault();
  });
  scroll.addEventListener('blur', () => {
    pointer?.el.remove();
    pointer = null;
  });

  // ---------- marks ----------
  /** A mark that the page removes after a moment (at once when motion is reduced and nothing would move). */
  function flash(node: SVGElement): void {
    marks.append(node);
    window.setTimeout(() => node.remove(), FADE_MS);
  }

  function clearHint(): void {
    hinted?.el.remove();
    hinted = null;
  }

  return {
    el,
    remove(thing) {
      const node = scene.querySelector<SVGGElement>(`[data-thing="${thing}"]`);
      if (hinted?.thing === thing) clearHint();
      if (!node) return;
      if (reducedMotion()) {
        node.remove();
        return;
      }
      node.classList.add('is-found');
      window.setTimeout(() => node.remove(), FADE_MS);
      const placed = def.things.find((p) => p.thing === thing);
      if (placed) flash(shape('circle', { cx: placed.x, cy: placed.y - sizeOf(thing).h / 2, r: 30, class: 'found-flash' }));
    },
    miss(x, y) {
      flash(shape('circle', { cx: x, cy: y, r: scale ? 9 / scale : 9, class: 'miss' }));
    },
    hint(placed) {
      clearHint();
      const cx = placed.x;
      const cy = placed.y - sizeOf(placed.thing).h / 2;
      const node = shape('g', { class: 'hint', transform: `translate(${cx} ${cy})` });
      node.append(shape('circle', { r: DETECTIVE.hintRadius, class: 'mark-edge' }), shape('circle', { r: DETECTIVE.hintRadius, class: 'mark-line' }));
      marks.append(node);
      hinted = { thing: placed.thing, el: node };
      scroll.scrollTo({ left: cx * scale - scroll.clientWidth / 2, top: cy * scale - scroll.clientHeight / 2, behavior: reducedMotion() ? 'auto' : 'smooth' });
    },
    setCount(text) {
      count.textContent = text;
    },
    setBig(next) {
      big = next;
      if (contain) opening();
    },
    destroy() {
      observer.disconnect();
    },
  };
}
