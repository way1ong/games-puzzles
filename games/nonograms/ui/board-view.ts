// The board on the screen (docs/nonograms/SPEC.md, "Керування", "Великі поля на телефоні — наближення"): the numbers
// beside the rows and above the columns, and the grid — a button for each cell, row by row, with the lines drawn over
// them (thicker every few cells). One finger or the mouse paints: a tap, or a stroke along a row or a column. Two
// fingers move and zoom a big grid, as do the mouse wheel and one finger on a strip of numbers; in a grid too small to
// paint, a tap zooms in. The board only shows and passes the strokes on: the game decides.
import { h, svg } from '../../../shared/ui/dom.ts';
import { NONOGRAMS, type Size } from '../config.ts';
import type { Axis, Clues } from '../core/clues.ts';
import { pathCells, wayOf, type Way } from '../core/path.ts';
import { CROSS, FILL, type Mark } from '../core/play.ts';
import { cellAt, clampView, limits, measuresOf, openView, panBy, rowWidthOf, showCell, zoomAround, type Frame, type View } from './zoom.ts';

/** How fast the wheel zooms with Ctrl: the cell grows e-fold over this many pixels of the wheel. */
const WHEEL_ZOOM_PX = 400;
/** A wheel's step in lines, in pixels (some mice count lines). */
const WHEEL_LINE_PX = 16;

export interface BoardShow {
  /** Cells shown as mistakes. */
  bad: ReadonlySet<number>;
  /** A hint: its line and the cells it fills and crosses, or the cell of a mistake. */
  hintLine: { axis: Axis; index: number } | null;
  hintFill: ReadonlySet<number>;
  hintCross: ReadonlySet<number>;
  hintCell: number | null;
  /** Lines whose numbers fade ("row3", "col0"). */
  faded: ReadonlySet<string>;
  /** The row and the column under the finger, the mouse or the keys are highlighted. */
  highlight: boolean;
  /** The solved picture: its colour for each cell (null — the picture's ink), crosses gone, no more moves. */
  done: boolean;
  colours: readonly (string | null)[] | null;
}

export interface BoardActions {
  /** A stroke goes on: its cells so far (one for a press); null — it was dropped (a second finger came). */
  preview(cells: number[] | null): void;
  /** The stroke is over: its cells. */
  commit(cells: number[]): void;
  /** A cell pressed by the keys or a screen reader. */
  tap(cell: number): void;
  /** The grid was zoomed or shown whole by a gesture. */
  viewChanged(): void;
  /** The board has been measured anew (a new picture, another room): whether it can be zoomed may have changed. */
  measured(): void;
}

export interface BoardView {
  el: HTMLElement;
  /** A new picture: the numbers and the cells; opens whole or zoomed in, as the player saw this size last. */
  setPuzzle(size: Size, clues: Clues, whole: boolean): void;
  render(marks: readonly Mark[], show: BoardShow, label: (cell: number) => string): void;
  /** Whether the grid can be zoomed (it fits whole only with small cells), and whether all of it is seen now. */
  zoomable(): boolean;
  isWhole(): boolean;
  /** Shows the whole grid, or zooms in around the cell of the keys. */
  setWhole(whole: boolean): void;
  /** The cell of the keys. */
  active(): number;
  /** Moves the keys' cell (and the view to it). */
  step(dr: number, dc: number): void;
  /** Moves a zoomed grid as little as needed for a cell to be seen (a hint's place). */
  reveal(cell: number): void;
  focus(): void;
}

type Gesture =
  | { kind: 'stroke'; id: number; start: number; x0: number; y0: number; way: Way | null; cells: number[]; moved: boolean }
  | { kind: 'pan'; id: number; x: number; y: number }
  | { kind: 'pinch'; a: number; b: number; d0: number; mx: number; my: number; view0: View }
  /** Fingers still down after a pinch: nothing until they are all lifted. */
  | { kind: 'rest' };

const lineKey = (axis: Axis, index: number) => `${axis}${index}`;

export function createBoardView(actions: BoardActions): BoardView {
  const el = h('div', { class: 'board' });
  const corner = h('div', { class: 'board__corner', 'aria-hidden': 'true' });
  const cols = h('div', { class: 'board__cols' });
  const rows = h('div', { class: 'board__rows' });
  const colsClip = h('div', { class: 'board__clip board__clip--cols', 'aria-hidden': 'true' }, cols);
  const rowsClip = h('div', { class: 'board__clip board__clip--rows', 'aria-hidden': 'true' }, rows);
  const grid = h('div', { class: 'grid', role: 'group' });
  const gridClip = h('div', { class: 'board__clip board__clip--grid' }, grid);
  const box = h('div', { class: 'board__box' }, corner, colsClip, rowsClip, gridClip);
  el.append(box);

  let size: Size = 5;
  let clues: Clues = { size: 5, rows: [], cols: [] };
  let cells: HTMLButtonElement[] = [];
  let colClues: HTMLElement[] = [];
  let rowClues: HTMLElement[] = [];
  let frame: Frame | null = null;
  let view: View = { cell: 0, x: 0, y: 0 };
  /** Open the next layout whole (else zoomed in); null — a layout has been made, keep the view. */
  let opening: boolean | null = null;
  let activeCell = 0;
  /** The cell last pressed or moved to by the keys: zooming in from the whole grid goes there (null — the middle). */
  let lastCell: number | null = null;
  /** The cell under the finger or the mouse; null — none (the keys' cell counts while the grid has the focus). */
  let pointerCell: number | null = null;
  let hasFocus = false;
  let lastShow: BoardShow | null = null;
  let gesture: Gesture | null = null;
  const pointers = new Map<number, { x: number; y: number }>();
  /** A finger or the mouse is on the grid: the click that follows it is not a tap of the keys. */
  let pointerClick = false;

  // ---------- building ----------
  function setPuzzle(s: Size, c: Clues, whole: boolean): void {
    size = s;
    clues = c;
    activeCell = 0;
    lastCell = null;
    pointerCell = null;
    gesture = null;
    pointers.clear();
    opening = whole;
    el.style.setProperty('--n', String(s));
    cells = Array.from({ length: s * s }, (_, i) => {
      const b = h('button', { class: 'cell', type: 'button', tabindex: i === 0 ? 0 : -1 });
      b.dataset.cell = String(i);
      return b;
    });
    const number = (n: number) => h('span', { class: n >= 10 ? 'clue__n is-wide' : 'clue__n' }, String(n));
    colClues = c.cols.map((clue) => h('div', { class: 'clue clue--col' }, ...(clue.length ? clue : [0]).map(number)));
    rowClues = c.rows.map((clue) => h('div', { class: 'clue clue--row' }, ...(clue.length ? clue : [0]).map(number)));
    cols.replaceChildren(...colClues);
    rows.replaceChildren(...rowClues);
    // Lines over the cells: thin between cells, thick every few cells and around; they scale with the grid.
    let thin = '';
    let thick = `M0 0H${s}V${s}H0Z`;
    for (let i = 1; i < s; i++) {
      const path = `M${i} 0V${s}M0 ${i}H${s}`;
      if (i % NONOGRAMS.thickEvery === 0) thick += path;
      else thin += path;
    }
    const lines = svg(
      `<svg xmlns="http://www.w3.org/2000/svg" class="grid__lines" viewBox="0 0 ${s} ${s}" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path class="grid__thin" d="${thin}" vector-effect="non-scaling-stroke"/><path class="grid__thick" d="${thick}" vector-effect="non-scaling-stroke"/></svg>`,
    );
    grid.replaceChildren(...cells, lines);
    lastShow = null;
    layout();
  }

  // ---------- measures ----------
  function counts() {
    return { rows: Math.max(...clues.rows.map(rowWidthOf)), cols: Math.max(1, ...clues.cols.map((clue) => clue.length)) };
  }

  function layout(): void {
    if (!cells.length) return;
    const rect = el.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const room = { w: rect.width, h: rect.height };
    const before = frame;
    const next: Frame = { size, counts: counts(), room, rem, limits: limits(size, counts(), room, rem) };
    if (opening !== null) {
      // A zoomed grid opens at its first row and column, as it is read.
      view = openView(next, opening, 0);
      opening = null;
    } else if (before && view.cell <= before.limits.fit) {
      view = openView(next, true, null);
    } else if (before) {
      // The same cell size and the same corner in sight: what is under the finger stays there.
      view = clampView(next, view);
    }
    frame = next;
    applyView();
    actions.measured();
  }

  function applyView(): void {
    if (!frame) return;
    const m = measuresOf(frame, view);
    const px = (n: number) => `${n}px`;
    const total = size * view.cell;
    el.style.setProperty('--cell', px(view.cell));
    el.style.setProperty('--clue-font', px(m.font));
    el.style.setProperty('--number-w', px(m.numberW));
    el.style.setProperty('--number-w2', px(m.numberW2));
    el.style.setProperty('--number-h', px(m.numberH));
    Object.assign(box.style, { left: px(m.left), top: px(m.top), width: px(m.rowsW + m.gridW), height: px(m.colsH + m.gridH) });
    Object.assign(corner.style, { width: px(m.rowsW), height: px(m.colsH) });
    Object.assign(colsClip.style, { left: px(m.rowsW), top: '0', width: px(m.gridW), height: px(m.colsH) });
    Object.assign(rowsClip.style, { left: '0', top: px(m.colsH), width: px(m.rowsW), height: px(m.gridH) });
    Object.assign(gridClip.style, { left: px(m.rowsW), top: px(m.colsH), width: px(m.gridW), height: px(m.gridH) });
    Object.assign(cols.style, { width: px(total), height: px(m.colsH), transform: `translateX(${-view.x}px)` });
    Object.assign(rows.style, { width: px(m.rowsW), height: px(total), transform: `translateY(${-view.y}px)` });
    Object.assign(grid.style, { width: px(total), height: px(total), transform: `translate(${-view.x}px, ${-view.y}px)` });
    el.classList.toggle('is-zoomed', total > m.gridW + 0.5 || total > m.gridH + 0.5);
  }

  new ResizeObserver(() => layout()).observe(el);
  // The browser may scroll a clipped strip by itself (to show a focused cell): the board moves it, not the browser.
  for (const clip of [gridClip, colsClip, rowsClip]) {
    clip.addEventListener('scroll', () => {
      clip.scrollLeft = 0;
      clip.scrollTop = 0;
    });
  }

  // ---------- showing ----------
  function cursorCell(): number | null {
    return pointerCell ?? (hasFocus ? activeCell : null);
  }

  function renderHighlight(): void {
    const on = !!lastShow?.highlight && !lastShow.done;
    const cur = on ? cursorCell() : null;
    const row = cur === null ? -1 : Math.floor(cur / size);
    const col = cur === null ? -1 : cur % size;
    cells.forEach((b, i) => b.classList.toggle('is-line', Math.floor(i / size) === row || i % size === col));
    rowClues.forEach((c, i) => c.classList.toggle('is-line', i === row));
    colClues.forEach((c, i) => c.classList.toggle('is-line', i === col));
  }

  function render(marks: readonly Mark[], show: BoardShow, label: (cell: number) => string): void {
    lastShow = show;
    const hl = show.hintLine;
    el.classList.toggle('is-done', show.done);
    cells.forEach((b, i) => {
      const m = marks[i];
      const c = b.classList;
      const colour = show.done ? (show.colours?.[i] ?? null) : null;
      c.toggle('is-fill', m === FILL);
      c.toggle('is-cross', m === CROSS && !show.done);
      c.toggle('is-colour', colour !== null);
      b.style.backgroundColor = colour ?? '';
      c.toggle('is-bad', show.bad.has(i));
      c.toggle('is-hint-line', !!hl && (hl.axis === 'row' ? Math.floor(i / size) === hl.index : i % size === hl.index));
      c.toggle('is-hint-fill', show.hintFill.has(i));
      c.toggle('is-hint-cross', show.hintCross.has(i));
      c.toggle('is-hint-cell', show.hintCell === i);
      b.tabIndex = i === activeCell ? 0 : -1;
      b.setAttribute('aria-label', label(i));
    });
    rowClues.forEach((c, i) => {
      c.classList.toggle('is-faded', show.faded.has(lineKey('row', i)));
      c.classList.toggle('is-hint', hl?.axis === 'row' && hl.index === i);
    });
    colClues.forEach((c, i) => {
      c.classList.toggle('is-faded', show.faded.has(lineKey('col', i)));
      c.classList.toggle('is-hint', hl?.axis === 'col' && hl.index === i);
    });
    renderHighlight();
  }

  function setPointerCell(cell: number | null): void {
    if (cell === pointerCell) return;
    pointerCell = cell;
    renderHighlight();
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
    lastCell = cell;
    cells[cell]?.setAttribute('tabindex', '0');
  }

  grid.addEventListener('focusin', (event) => {
    const cell = (event.target as HTMLElement).closest<HTMLElement>('.cell')?.dataset.cell;
    if (cell === undefined) return;
    hasFocus = true;
    setActive(Number(cell));
    showActive();
    renderHighlight();
  });
  grid.addEventListener('focusout', () => {
    hasFocus = false;
    renderHighlight();
  });

  grid.addEventListener('click', (event) => {
    if (pointerClick) return;
    const cell = (event.target as HTMLElement).closest<HTMLElement>('.cell')?.dataset.cell;
    if (cell !== undefined) actions.tap(Number(cell));
  });

  // ---------- fingers and the mouse ----------
  /** A point of the event in the room's own coordinates. */
  function at(event: PointerEvent | WheelEvent): { x: number; y: number } {
    const r = el.getBoundingClientRect();
    return { x: event.clientX - r.left, y: event.clientY - r.top };
  }

  /** Where a point is: on the grid, on a strip of numbers, or elsewhere. */
  function placeOf(x: number, y: number): 'grid' | 'numbers' | null {
    if (!frame) return null;
    if (cellAt(frame, view, x, y) !== null) return 'grid';
    const m = measuresOf(frame, view);
    const inCols = x >= m.left + m.rowsW && x < m.left + m.rowsW + m.gridW && y >= m.top && y < m.top + m.colsH;
    const inRows = x >= m.left && x < m.left + m.rowsW && y >= m.top + m.colsH && y < m.top + m.colsH + m.gridH;
    return inCols || inRows ? 'numbers' : null;
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
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const p = at(event);
    pointers.set(event.pointerId, p);
    if (pointers.size === 2 && event.pointerType === 'touch') {
      if (gesture?.kind === 'stroke') actions.preview(null);
      setPointerCell(null);
      startPinch();
      return;
    }
    if (pointers.size > 1) {
      if (gesture?.kind === 'stroke') actions.preview(null);
      gesture = { kind: 'rest' };
      return;
    }
    const place = placeOf(p.x, p.y);
    if (place === 'grid' && frame && !lastShow?.done) {
      pointerClick = true;
      const start = cellAt(frame, view, p.x, p.y)!;
      // Any size of cell paints, however far the player zoomed out (a stylus reaches small cells; decision of 27.11).
      gesture = { kind: 'stroke', id: event.pointerId, start, x0: p.x, y0: p.y, way: null, cells: [start], moved: false };
      el.setPointerCapture(event.pointerId);
      lastCell = start;
      setPointerCell(start);
      actions.preview([start]);
    } else if (place === 'numbers' && zoomed()) {
      gesture = { kind: 'pan', id: event.pointerId, x: p.x, y: p.y };
      el.setPointerCapture(event.pointerId);
    } else {
      gesture = null;
    }
  });

  el.addEventListener('pointermove', (event) => {
    const p = at(event);
    if (pointers.has(event.pointerId)) pointers.set(event.pointerId, p);
    if (!frame) return;
    const g = gesture;
    if (!g) {
      // The mouse over the grid lights its row and column up.
      if (event.pointerType === 'mouse' && !event.buttons) setPointerCell(cellAt(frame, view, p.x, p.y));
      return;
    }
    if (g.kind === 'stroke' && g.id === event.pointerId) {
      if (!g.moved && Math.hypot(p.x - g.x0, p.y - g.y0) < NONOGRAMS.dragStart) return;
      g.moved = true;
      const cell = cellAt(frame, view, p.x, p.y, true)!;
      g.way ??= wayOf(size, g.start, cell, p.x - g.x0, p.y - g.y0);
      const path = pathCells(size, g.start, cell, g.way);
      setPointerCell(path.at(-1) ?? g.start);
      if (path.length !== g.cells.length || path.some((c, i) => c !== g.cells[i])) {
        g.cells = path;
        actions.preview(path);
      }
    } else if (g.kind === 'pan' && g.id === event.pointerId) {
      view = panBy(frame, view, g.x - p.x, g.y - p.y);
      g.x = p.x;
      g.y = p.y;
      applyView();
    } else if (g.kind === 'pinch') {
      const a = pointers.get(g.a);
      const b = pointers.get(g.b);
      if (!a || !b) return;
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      const zoomedView = zoomAround(frame, g.view0, g.view0.cell * (d / g.d0), g.mx, g.my);
      view = panBy(frame, zoomedView, g.mx - mx, g.my - my);
      applyView();
    }
  });

  function endPointer(event: PointerEvent, cancelled: boolean): void {
    pointers.delete(event.pointerId);
    const g = gesture;
    if (g?.kind === 'stroke' && g.id === event.pointerId) {
      gesture = null;
      setPointerCell(event.pointerType === 'mouse' && !cancelled ? pointerCell : null);
      if (cancelled) actions.preview(null);
      else actions.commit(g.cells);
    } else if (g?.kind === 'pan' && g.id === event.pointerId) {
      gesture = null;
      actions.viewChanged();
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
  el.addEventListener('pointerleave', (event) => {
    if (event.pointerType === 'mouse' && !gesture) setPointerCell(null);
  });

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
    setPuzzle,
    render,
    zoomable: () => !!frame?.limits.zoomable,
    isWhole: () => !frame || view.cell <= frame.limits.fit,
    setWhole(whole) {
      if (!frame) return;
      view = openView(frame, whole, whole ? null : lastCell);
      applyView();
    },
    active: () => activeCell,
    step(dr, dc) {
      const row = Math.min(size - 1, Math.max(0, Math.floor(activeCell / size) + dr));
      const col = Math.min(size - 1, Math.max(0, (activeCell % size) + dc));
      setActive(row * size + col);
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
