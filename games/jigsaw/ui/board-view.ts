// The board on the screen (docs/jigsaw/SPEC.md, "Поле й наближення", "Керування"): the picture put together so far —
// the pieces in place cut out of it along their outlines, with thin seams — over the board's ground and, when chosen,
// the pale picture. A tap puts the taken piece; a big board can be zoomed: two fingers, Ctrl with the wheel, the keys
// + and −; a zoomed board moves under one finger, the wheel and the arrows. The places are buttons for the keys
// (one Tab stop). Marks: the hint's place, the place under a piece being carried, the picture shown whole.
import { h } from '../../../shared/ui/dom.ts';
import { JIGSAW } from '../config.ts';
import { clampView, frameOf, measures, openView, panBy, pointAt, showPlace, zoomAround, type Frame, type View } from './zoom.ts';

const NS = 'http://www.w3.org/2000/svg';
/** How fast the wheel zooms with Ctrl: the piece grows e-fold over this many pixels of the wheel. */
const WHEEL_ZOOM_PX = 400;
/** A wheel's step in lines, in pixels (some mice count lines). */
const WHEEL_LINE_PX = 16;
/** One press of + or −: the piece grows or shrinks by this much. */
const KEY_ZOOM = 1.4;

export interface BoardShow {
  /** The picture, as an address of an image. */
  picture: string;
  /** Each piece's outline, in the board's coordinates. */
  outlines: readonly string[];
  placed: readonly number[];
  ghost: boolean;
  /** The hint's piece: its place is marked. */
  hint: number | null;
  /** The whole picture over the board. */
  whole: boolean;
  done: boolean;
  /** The board's name, and each place's, for screen readers. */
  boardLabel: string;
  label(place: number): string;
  pictureLabel: string;
}

export interface BoardActions {
  /** A tap at (x, y) of the board, in pieces. */
  tap(x: number, y: number): void;
  /** Enter or Space on a place (the keys). */
  key(place: number): void;
  /** Esc on the board. */
  escape(): void;
  /** The board was moved or zoomed, or measured anew (whether it can be zoomed may have changed). */
  viewChanged(): void;
}

type Gesture =
  | { kind: 'press'; id: number; x0: number; y0: number; x: number; y: number; moved: boolean }
  | { kind: 'pinch'; a: number; b: number; d0: number; mx: number; my: number; view0: View }
  /** Fingers still down after a pinch: nothing until they are all lifted. */
  | { kind: 'rest' };

const make = <K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string> = {}): SVGElementTagNameMap[K] => {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
};

export function createBoardView(actions: BoardActions) {
  const el = h('div', { class: 'board' });
  const svg = make('svg', { class: 'sheet', 'aria-hidden': 'true', focusable: 'false', preserveAspectRatio: 'none' });
  const clip = make('clipPath', { id: 'jigsaw-placed' });
  const ground = make('rect', { class: 'sheet__ground', x: '0', y: '0' });
  const ghost = make('image', { class: 'sheet__ghost', x: '0', y: '0', preserveAspectRatio: 'none' });
  const placedImage = make('image', { class: 'sheet__placed', x: '0', y: '0', preserveAspectRatio: 'none', 'clip-path': 'url(#jigsaw-placed)' });
  const seams = make('path', { class: 'sheet__seams' });
  const fresh = make('path', { class: 'sheet__fresh' });
  const shadow = make('path', { class: 'sheet__shadow' });
  const hintLight = make('path', { class: 'sheet__hint-light' });
  const hintDark = make('path', { class: 'sheet__hint-dark' });
  const defs = make('defs');
  defs.append(clip);
  svg.append(defs, ground, ghost, placedImage, seams, fresh, shadow, hintLight, hintDark);
  const places = h('div', { class: 'board__places', role: 'group' });
  const sheet = h('div', { class: 'board__sheet' }, svg as unknown as HTMLElement, places);
  const clipBox = h('div', { class: 'board__clip' }, sheet);
  const whole = h('img', { class: 'board__whole', alt: '', hidden: true });
  el.append(clipBox, whole);

  let cols = 0;
  let rows = 0;
  let buttons: HTMLButtonElement[] = [];
  let frame: Frame | null = null;
  let view: View = { cell: 0, x: 0, y: 0 };
  let active = 0;
  let show: BoardShow | null = null;
  /** What is drawn: the picture and the pieces in place, so that only what changed is drawn again. */
  let drawnPicture = '';
  let drawnPlaced: readonly number[] = [];
  let gesture: Gesture | null = null;
  const pointers = new Map<number, { x: number; y: number }>();
  /** A finger or the mouse is on the board: the click that follows is not the keys'. */
  let pointerClick = false;

  // ---------- building ----------
  function setBoard(c: number, r: number): void {
    cols = c;
    rows = r;
    svg.setAttribute('viewBox', `0 0 ${c} ${r}`);
    for (const x of [ground, ghost, placedImage]) {
      x.setAttribute('width', String(c));
      x.setAttribute('height', String(r));
    }
    buttons = Array.from({ length: c * r }, (_, i) => {
      const b = h('button', { class: 'place', type: 'button', tabindex: i === 0 ? 0 : -1 });
      b.dataset.place = String(i);
      return b;
    });
    places.replaceChildren(...buttons);
    el.style.setProperty('--cols', String(c));
    el.style.setProperty('--rows', String(r));
    active = 0;
    drawnPlaced = [];
    drawnPicture = '';
    clip.replaceChildren();
    seams.setAttribute('d', '');
    fresh.setAttribute('d', '');
    gesture = null;
    pointers.clear();
    frame = null;
    layout();
  }

  // ---------- measures ----------
  function layout(): void {
    if (!cols) return;
    const rect = el.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const before = frame;
    const next = frameOf(cols, rows, { w: Math.round(rect.width), h: Math.round(rect.height) }, rem);
    // whole before stays whole (the room changed); zoomed stays zoomed as far as it can
    view = !before || view.cell <= before.limits.fit ? openView(next, true, null) : clampView(next, view);
    frame = next;
    applyView();
    actions.viewChanged();
  }

  function applyView(): void {
    if (!frame) return;
    const m = measures(frame, view.cell);
    const px = (n: number) => `${n}px`;
    el.style.setProperty('--cell', px(view.cell));
    Object.assign(clipBox.style, { left: px(m.left), top: px(m.top), width: px(m.gridW), height: px(m.gridH) });
    Object.assign(sheet.style, { width: px(cols * view.cell), height: px(rows * view.cell), transform: `translate(${-view.x}px, ${-view.y}px)` });
    el.classList.toggle('is-zoomed', cols * view.cell > m.gridW + 0.5 || rows * view.cell > m.gridH + 0.5);
  }

  new ResizeObserver(() => layout()).observe(el);
  // The browser may scroll the clipped board by itself (to show a focused place): the board moves it, not the browser.
  clipBox.addEventListener('scroll', () => {
    clipBox.scrollLeft = 0;
    clipBox.scrollTop = 0;
  });

  // ---------- showing ----------
  function render(s: BoardShow): void {
    show = s;
    if (s.picture !== drawnPicture) {
      drawnPicture = s.picture;
      ghost.setAttribute('href', s.picture);
      placedImage.setAttribute('href', s.picture);
      whole.src = s.picture;
    }
    // pieces put since the last drawing are added; anything else (another game, a game started anew) — drawn afresh
    const grows = drawnPlaced.length <= s.placed.length && drawnPlaced.every((p, i) => s.placed[i] === p);
    if (!grows) clip.replaceChildren();
    const from = grows ? drawnPlaced.length : 0;
    for (const p of s.placed.slice(from)) clip.append(make('path', { d: s.outlines[p]! }));
    if (from !== s.placed.length || !grows) seams.setAttribute('d', s.placed.map((p) => s.outlines[p]).join(''));
    // the piece put last shines a moment ("it fits")
    const last = grows && s.placed.length > drawnPlaced.length ? s.placed.at(-1)! : null;
    fresh.setAttribute('d', last === null ? '' : s.outlines[last]!);
    fresh.classList.remove('is-on');
    if (last !== null) {
      void fresh.getBoundingClientRect();
      fresh.classList.add('is-on');
    }
    drawnPlaced = s.placed.slice();
    ghost.classList.toggle('is-off', !s.ghost);
    const hint = s.hint === null ? '' : s.outlines[s.hint]!;
    hintLight.setAttribute('d', hint);
    hintDark.setAttribute('d', hint);
    el.classList.toggle('is-done', s.done);
    whole.hidden = !s.whole;
    whole.alt = s.whole ? s.pictureLabel : '';
    places.setAttribute('aria-label', s.boardLabel);
    const placed = new Set(s.placed);
    buttons.forEach((b, i) => {
      b.setAttribute('aria-label', s.label(i));
      b.classList.toggle('is-full', placed.has(i));
      b.classList.toggle('is-hint', s.hint === i);
    });
  }

  /** The place under a piece being carried, its outline moved there (null — none). */
  function setShadow(outline: string | null, home: number, place: number | null): void {
    if (outline === null || place === null) {
      shadow.setAttribute('d', '');
      return;
    }
    shadow.setAttribute('d', outline);
    const dx = (place % cols) - (home % cols);
    const dy = Math.floor(place / cols) - Math.floor(home / cols);
    shadow.setAttribute('transform', `translate(${dx} ${dy})`);
  }

  // ---------- the keys ----------
  function setActive(place: number): void {
    buttons[active]?.setAttribute('tabindex', '-1');
    active = place;
    buttons[place]?.setAttribute('tabindex', '0');
  }

  function showActive(): void {
    if (!frame) return;
    view = showPlace(frame, view, active);
    applyView();
  }

  places.addEventListener('focusin', (event) => {
    const p = (event.target as HTMLElement).closest<HTMLElement>('.place')?.dataset.place;
    if (p === undefined) return;
    setActive(Number(p));
    showActive();
  });

  places.addEventListener('click', (event) => {
    if (pointerClick) return;
    const p = (event.target as HTMLElement).closest<HTMLElement>('.place')?.dataset.place;
    if (p !== undefined) actions.key(Number(p));
  });

  function zoomBy(factor: number): void {
    if (!frame?.limits.zoomable) return;
    const m = measures(frame, view.cell);
    // around the place of the keys, else the middle of what is seen
    const focused = places.contains(document.activeElement);
    const px = focused ? ((active % cols) + 0.5) * view.cell - view.x + m.left : m.left + m.gridW / 2;
    const py = focused ? (Math.floor(active / cols) + 0.5) * view.cell - view.y + m.top : m.top + m.gridH / 2;
    view = zoomAround(frame, view, view.cell * factor, px, py);
    applyView();
    actions.viewChanged();
  }

  el.addEventListener('keydown', (event) => {
    const arrows: Record<string, [number, number]> = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] };
    const a = arrows[event.key];
    if (a && places.contains(document.activeElement)) {
      event.preventDefault();
      step(a[0], a[1]);
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      actions.escape();
      return;
    }
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      zoomBy(KEY_ZOOM);
    } else if (event.key === '-' || event.key === '_') {
      event.preventDefault();
      zoomBy(1 / KEY_ZOOM);
    }
  });

  function step(dr: number, dc: number): void {
    const row = Math.min(rows - 1, Math.max(0, Math.floor(active / cols) + dr));
    const col = Math.min(cols - 1, Math.max(0, (active % cols) + dc));
    setActive(row * cols + col);
    buttons[active]?.focus({ preventScroll: true });
    showActive();
  }

  // ---------- fingers and the mouse ----------
  function at(event: PointerEvent | WheelEvent): { x: number; y: number } {
    const r = el.getBoundingClientRect();
    return { x: event.clientX - r.left, y: event.clientY - r.top };
  }

  const zoomed = () => el.classList.contains('is-zoomed');

  function startPinch(): void {
    const [a, b] = [...pointers.entries()];
    if (!a || !b || !frame?.limits.zoomable) {
      gesture = { kind: 'rest' };
      return;
    }
    const d0 = Math.hypot(a[1].x - b[1].x, a[1].y - b[1].y) || 1;
    gesture = { kind: 'pinch', a: a[0], b: b[0], d0, mx: (a[1].x + b[1].x) / 2, my: (a[1].y + b[1].y) / 2, view0: view };
  }

  el.addEventListener('pointerdown', (event) => {
    const mouse = event.pointerType === 'mouse';
    if (mouse && event.button !== 0) return;
    const p = at(event);
    pointers.set(event.pointerId, p);
    if (pointers.size === 2 && !mouse) {
      startPinch();
      return;
    }
    if (pointers.size > 1) {
      gesture = { kind: 'rest' };
      return;
    }
    pointerClick = true;
    el.setPointerCapture(event.pointerId);
    gesture = { kind: 'press', id: event.pointerId, x0: p.x, y0: p.y, x: p.x, y: p.y, moved: false };
  });

  el.addEventListener('pointermove', (event) => {
    const p = at(event);
    if (pointers.has(event.pointerId)) pointers.set(event.pointerId, p);
    const g = gesture;
    if (!frame || !g) return;
    if (g.kind === 'press' && g.id === event.pointerId) {
      if (!g.moved && Math.hypot(p.x - g.x0, p.y - g.y0) < JIGSAW.dragStart) return;
      g.moved = true;
      if (zoomed()) {
        view = panBy(frame, view, g.x - p.x, g.y - p.y);
        applyView();
      }
      g.x = p.x;
      g.y = p.y;
    } else if (g.kind === 'pinch') {
      const a = pointers.get(g.a);
      const b = pointers.get(g.b);
      if (!a || !b) return;
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      view = panBy(frame, zoomAround(frame, g.view0, g.view0.cell * (d / g.d0), g.mx, g.my), g.mx - mx, g.my - my);
      applyView();
    }
  });

  function endPointer(event: PointerEvent, cancelled: boolean): void {
    pointers.delete(event.pointerId);
    const g = gesture;
    if (g?.kind === 'press' && g.id === event.pointerId) {
      gesture = null;
      if (!cancelled && !g.moved && frame && !show?.done) {
        const point = pointAt(frame, view, g.x0, g.y0);
        if (point) actions.tap(point.x, point.y);
      } else if (g.moved && zoomed()) actions.viewChanged();
    } else if (g?.kind === 'pinch') {
      gesture = pointers.size ? { kind: 'rest' } : null;
      actions.viewChanged();
    } else if (!pointers.size) {
      gesture = null;
    }
    // The click a mouse makes after this comes in the same moment: let it pass by first.
    window.setTimeout(() => (pointerClick = false), 0);
  }

  el.addEventListener('pointerup', (event) => endPointer(event, false));
  el.addEventListener('pointercancel', (event) => endPointer(event, true));
  el.addEventListener('contextmenu', (event) => event.preventDefault());
  // A finger on the board is the game's alone: no scrolling, zooming or flinging of the page (a fling would swallow
  // the next tap on a button — .claude/rules/design.md).
  el.addEventListener('touchstart', (event) => event.preventDefault(), { passive: false });

  el.addEventListener(
    'wheel',
    (event) => {
      if (!frame?.limits.zoomable) return;
      event.preventDefault();
      const unit = event.deltaMode === 1 ? WHEEL_LINE_PX : 1;
      const p = at(event);
      if (event.ctrlKey || event.metaKey) {
        view = zoomAround(frame, view, view.cell * Math.exp((-event.deltaY * unit) / WHEEL_ZOOM_PX), p.x, p.y);
      } else {
        const sideways = event.shiftKey && !event.deltaX;
        view = panBy(frame, view, (sideways ? event.deltaY : event.deltaX) * unit, (sideways ? 0 : event.deltaY) * unit);
      }
      applyView();
      actions.viewChanged();
    },
    { passive: false },
  );

  return {
    el,
    setBoard,
    render,
    setShadow,
    /** The piece's size on the screen now, CSS px. */
    cellPx: (): number => view.cell,
    /** The point of the board (in pieces) under a point of the screen; null outside the part seen. */
    boardPoint(clientX: number, clientY: number): { x: number; y: number } | null {
      if (!frame) return null;
      const r = el.getBoundingClientRect();
      return pointAt(frame, view, clientX - r.left, clientY - r.top);
    },
    /** Where a piece's place is on the screen (its square), for a piece gliding into it. */
    placeRect(place: number): DOMRect {
      const r = clipBox.getBoundingClientRect();
      return new DOMRect(r.left + (place % cols) * view.cell - view.x, r.top + Math.floor(place / cols) * view.cell - view.y, view.cell, view.cell);
    },
    zoomable: (): boolean => !!frame?.limits.zoomable,
    isWhole: (): boolean => !frame || view.cell <= frame.limits.fit,
    /** Shows the whole board, or zooms in around the place of the keys. */
    setWhole(wholeBoard: boolean): void {
      if (!frame) return;
      view = openView(frame, wholeBoard, wholeBoard ? null : active);
      applyView();
      actions.viewChanged();
    },
    zoomBy,
    active: (): number => active,
    /** Moves a zoomed board as little as needed for a place to be seen (the hint's). */
    reveal(place: number): void {
      if (!frame) return;
      view = showPlace(frame, view, place);
      applyView();
    },
    focus(place?: number): void {
      if (place !== undefined) setActive(place);
      buttons[active]?.focus({ preventScroll: true });
      showActive();
    },
  };
}

export type BoardView = ReturnType<typeof createBoardView>;
