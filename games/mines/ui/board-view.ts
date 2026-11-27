// The field on the screen (docs/mines/SPEC.md, "Керування"): a button for each cell, row by row. A short touch or a
// click is a tap; a long press or the mouse's right button is a hold (what each does — open or flag — the game decides
// by the switch under the field). A big field opens zoomed in: one finger moves it, two zoom it, as do the wheel and
// Ctrl with the wheel; in a field too small to touch, a tap zooms in. The field only shows and passes the touches on.
import { h } from '../../../shared/ui/dom.ts';
import { MINES, type Theme } from '../config.ts';
import { CLOSED_CELL, FLAG } from '../core/play.ts';
import { artUse } from './art.ts';
import { cellAt, clampView, frameOf, measures, openView, panBy, showCell, zoomAround, type Frame, type View } from './zoom.ts';

/** How fast the wheel zooms with Ctrl: the cell grows e-fold over this many pixels of the wheel. */
const WHEEL_ZOOM_PX = 400;
/** A wheel's step in lines, in pixels (some mice count lines). */
const WHEEL_LINE_PX = 16;

export interface BoardShow {
  /** The numbers of the field; null — no field yet (the player is to choose the first place): all closed. */
  numbers: Uint8Array | null;
  /** Mines (or flowers) shown: after one was opened, or at the end. */
  hidden: ReadonlySet<number>;
  /** The one opened by the player. */
  boom: number | null;
  /** Flags shown as wrong. */
  wrong: ReadonlySet<number>;
  /** A hint: safe cells, mines, the numbers it rests on. */
  hintSafe: ReadonlySet<number>;
  hintMine: ReadonlySet<number>;
  hintFrom: ReadonlySet<number>;
  done: boolean;
  theme: Theme;
}

export interface BoardActions {
  /** A short touch, a click, Enter or Space on a cell. */
  tap(cell: number): void;
  /** A long press or the mouse's right button on a cell. */
  hold(cell: number): void;
  /** The field was moved or zoomed by a gesture. */
  viewChanged(): void;
  /** The field has been measured anew (a new field, another room): whether it can be zoomed may have changed. */
  measured(): void;
}

export interface BoardView {
  el: HTMLElement;
  /** A new field: its size; opens whole or zoomed in, as the player saw this level last. */
  setField(cols: number, rows: number, whole: boolean, around: number | null): void;
  render(cells: string, show: BoardShow, label: (cell: number) => string): void;
  zoomable(): boolean;
  isWhole(): boolean;
  /** Shows the whole field, or zooms in around the cell of the keys. */
  setWhole(whole: boolean): void;
  /** The cell of the keys. */
  active(): number;
  /** Moves the keys' cell (and the view to it). */
  step(dr: number, dc: number): void;
  /** Moves a zoomed field as little as needed for a cell to be seen (a hint's place). */
  reveal(cell: number): void;
  focus(): void;
}

type Gesture =
  | { kind: 'press'; id: number; cell: number | null; x0: number; y0: number; x: number; y: number; moved: boolean; held: boolean; timer: number; mouse: boolean }
  | { kind: 'pinch'; a: number; b: number; d0: number; mx: number; my: number; view0: View }
  /** Fingers still down after a pinch: nothing until they are all lifted. */
  | { kind: 'rest' };

export function createBoardView(actions: BoardActions): BoardView {
  const el = h('div', { class: 'board' });
  const grid = h('div', { class: 'grid', role: 'group' });
  const clip = h('div', { class: 'board__clip' }, grid);
  el.append(clip);

  let cols = 0;
  let rows = 0;
  let cells: HTMLButtonElement[] = [];
  /** What each cell shows now, so that only the cells that change are drawn again. */
  let drawn: string[] = [];
  let frame: Frame | null = null;
  let view: View = { cell: 0, x: 0, y: 0 };
  /** Open the next layout whole (else zoomed in), around a cell; null — a layout has been made, keep the view. */
  let opening: { whole: boolean; around: number | null } | null = null;
  let activeCell = 0;
  let lastShow: BoardShow | null = null;
  let gesture: Gesture | null = null;
  const pointers = new Map<number, { x: number; y: number }>();
  /** A finger or the mouse is on the field: the click that follows it is not a tap of the keys. */
  let pointerClick = false;

  // ---------- building ----------
  function setField(c: number, r: number, whole: boolean, around: number | null): void {
    if (c !== cols || r !== rows) {
      cols = c;
      rows = r;
      cells = Array.from({ length: c * r }, (_, i) => {
        const b = h('button', { class: 'cell', type: 'button', tabindex: i === 0 ? 0 : -1 });
        b.dataset.cell = String(i);
        return b;
      });
      grid.replaceChildren(...cells);
    }
    drawn = cells.map(() => '');
    el.style.setProperty('--cols', String(c));
    activeCell = Math.min(activeCell, c * r - 1);
    gesture = null;
    pointers.clear();
    opening = { whole, around };
    layout();
  }

  // ---------- measures ----------
  function layout(): void {
    if (!cells.length) return;
    const rect = el.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const before = frame;
    // whole pixels: a room a fraction short of a whole cell more would drop the cell a size (the rest is clipped)
    const next = frameOf(cols, rows, { w: Math.round(rect.width), h: Math.round(rect.height) }, rem);
    if (opening) {
      view = openView(next, opening.whole, opening.around);
      opening = null;
    } else if (before && view.cell <= before.limits.fit) {
      view = openView(next, true, null);
    } else {
      view = clampView(next, view);
    }
    frame = next;
    applyView();
    actions.measured();
  }

  function applyView(): void {
    if (!frame) return;
    const m = measures(frame, view.cell);
    const px = (n: number) => `${n}px`;
    el.style.setProperty('--cell', px(view.cell));
    Object.assign(clip.style, { left: px(m.left), top: px(m.top), width: px(m.gridW), height: px(m.gridH) });
    Object.assign(grid.style, { width: px(cols * view.cell), height: px(rows * view.cell), transform: `translate(${-view.x}px, ${-view.y}px)` });
    el.classList.toggle('is-zoomed', cols * view.cell > m.gridW + 0.5 || rows * view.cell > m.gridH + 0.5);
  }

  new ResizeObserver(() => layout()).observe(el);
  // The browser may scroll the clipped field by itself (to show a focused cell): the board moves it, not the browser.
  clip.addEventListener('scroll', () => {
    clip.scrollLeft = 0;
    clip.scrollTop = 0;
  });

  // ---------- showing ----------
  function render(state: string, show: BoardShow, label: (cell: number) => string): void {
    lastShow = show;
    el.classList.toggle('is-done', show.done);
    for (let i = 0; i < cells.length; i++) {
      const s = state[i] ?? CLOSED_CELL;
      const open = s !== CLOSED_CELL && s !== FLAG;
      const n = open && show.numbers ? show.numbers[i]! : -1;
      const hidden = show.hidden.has(i);
      const what = hidden && !open && s !== FLAG ? 'H' : hidden && open ? 'B' : s;
      const marks = [
        what,
        n,
        show.boom === i ? 'boom' : '',
        show.wrong.has(i) ? 'wrong' : '',
        show.hintSafe.has(i) ? 'safe' : '',
        show.hintMine.has(i) ? 'mine' : '',
        show.hintFrom.has(i) ? 'from' : '',
        show.theme,
      ].join('|');
      const b = cells[i]!;
      if (drawn[i] !== marks) {
        drawn[i] = marks;
        const c = b.classList;
        const isOpen = open && !hidden;
        c.toggle('is-open', isOpen);
        c.toggle('is-closed', !isOpen && !hidden);
        c.toggle('is-flag', s === FLAG);
        c.toggle('is-hidden', hidden);
        c.toggle('is-boom', show.boom === i);
        c.toggle('is-wrong', show.wrong.has(i));
        c.toggle('is-hint-safe', show.hintSafe.has(i));
        c.toggle('is-hint-mine', show.hintMine.has(i));
        c.toggle('is-hint-from', show.hintFrom.has(i));
        for (let k = 1; k <= 8; k++) c.toggle(`n${k}`, isOpen && n === k);
        if (hidden && s !== FLAG) b.replaceChildren(artUse('hidden', show.theme));
        else if (s === FLAG) b.replaceChildren(artUse('flag', show.theme));
        else if (isOpen && n > 0) b.replaceChildren(String(n));
        else b.replaceChildren();
      }
      b.tabIndex = i === activeCell ? 0 : -1;
      b.setAttribute('aria-label', label(i));
    }
  }

  // ---------- the keys ----------
  function showActive(): void {
    if (!frame) return;
    view = showCell(frame, view, activeCell);
    applyView();
  }

  function setActive(cell: number): void {
    cells[activeCell]?.setAttribute('tabindex', '-1');
    activeCell = cell;
    cells[cell]?.setAttribute('tabindex', '0');
  }

  grid.addEventListener('focusin', (event) => {
    const cell = (event.target as HTMLElement).closest<HTMLElement>('.cell')?.dataset.cell;
    if (cell === undefined) return;
    setActive(Number(cell));
    showActive();
  });

  grid.addEventListener('click', (event) => {
    if (pointerClick) return;
    const cell = (event.target as HTMLElement).closest<HTMLElement>('.cell')?.dataset.cell;
    if (cell !== undefined) actions.tap(Number(cell));
  });

  // ---------- fingers and the mouse ----------
  function at(event: PointerEvent | WheelEvent | MouseEvent): { x: number; y: number } {
    const r = el.getBoundingClientRect();
    return { x: event.clientX - r.left, y: event.clientY - r.top };
  }

  const zoomed = () => el.classList.contains('is-zoomed');

  function pressMark(cell: number | null, on: boolean): void {
    if (cell !== null) cells[cell]?.classList.toggle('is-pressed', on);
  }

  function stopPress(g: Extract<Gesture, { kind: 'press' }>): void {
    window.clearTimeout(g.timer);
    pressMark(g.cell, false);
  }

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
    if (mouse && event.button !== 0 && event.button !== 2) return;
    const p = at(event);
    pointers.set(event.pointerId, p);
    if (gesture?.kind === 'press') stopPress(gesture);
    if (pointers.size === 2 && !mouse) {
      startPinch();
      return;
    }
    if (pointers.size > 1) {
      gesture = { kind: 'rest' };
      return;
    }
    if (!frame) return;
    const cell = cellAt(frame, view, p.x, p.y);
    pointerClick = true;
    el.setPointerCapture(event.pointerId);
    // the mouse's right button: a hold at once
    if (mouse && event.button === 2) {
      gesture = null;
      if (cell !== null && !lastShow?.done) actions.hold(cell);
      return;
    }
    const g: Extract<Gesture, { kind: 'press' }> = { kind: 'press', id: event.pointerId, cell, x0: p.x, y0: p.y, x: p.x, y: p.y, moved: false, held: false, timer: 0, mouse };
    // Any size of cell opens and flags, however far the player zoomed out (a stylus reaches small cells; 27.11).
    if (cell !== null && !lastShow?.done) {
      pressMark(cell, true);
      g.timer = window.setTimeout(() => {
        if (gesture !== g || g.moved) return;
        g.held = true;
        pressMark(cell, false);
        actions.hold(cell);
      }, MINES.longPressMs);
    }
    gesture = g;
  });

  el.addEventListener('pointermove', (event) => {
    const p = at(event);
    if (pointers.has(event.pointerId)) pointers.set(event.pointerId, p);
    const g = gesture;
    if (!frame || !g) return;
    if (g.kind === 'press' && g.id === event.pointerId) {
      if (!g.moved && Math.hypot(p.x - g.x0, p.y - g.y0) < MINES.dragStart) return;
      if (!g.moved) {
        g.moved = true;
        stopPress(g);
      }
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
      stopPress(g);
      if (!cancelled && !g.moved && !g.held && g.cell !== null && frame) {
        if (!lastShow?.done) actions.tap(g.cell);
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
  // A long press is the game's: no menu of the browser (the right button flags).
  el.addEventListener('contextmenu', (event) => event.preventDefault());
  // A finger on the field is the game's alone: no scrolling, zooming or flinging of the page (a fling would swallow
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
    setField,
    render,
    zoomable: () => !!frame?.limits.zoomable,
    isWhole: () => !frame || view.cell <= frame.limits.fit,
    setWhole(whole) {
      if (!frame) return;
      view = openView(frame, whole, whole ? null : activeCell);
      applyView();
    },
    active: () => activeCell,
    step(dr, dc) {
      const row = Math.min(rows - 1, Math.max(0, Math.floor(activeCell / cols) + dr));
      const col = Math.min(cols - 1, Math.max(0, (activeCell % cols) + dc));
      setActive(row * cols + col);
      cells[activeCell]?.focus({ preventScroll: true });
      showActive();
    },
    reveal(cell) {
      if (!frame) return;
      view = showCell(frame, view, cell);
      applyView();
    },
    focus() {
      cells[activeCell]?.focus({ preventScroll: true });
    },
  };
}
