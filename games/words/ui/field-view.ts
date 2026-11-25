// The Word Field on the screen: the cells, the words placed (each its own colour, joined by a line — colour and
// pattern), the cells a hint shows (numbered), and the word being made. A word is made by sliding a finger (or
// the mouse) from cell to touching cell — a cell counts once the finger is near its middle, so a slide past a
// corner does not catch the cell beside it, and going back to the previous cell takes the last one off — or by
// tapping the cells one by one. On a screen wider than tall a tall field is shown turned (rows as columns): the
// same puzzle, as touching cells stay touching. The cells are drawn for the eyes; readers of the screen get the
// field as text from the screen module.
import { h } from '../../../shared/ui/dom.ts';
import { touching, type Field } from '../core/field.ts';
import type { Placed } from '../core/field-play.ts';
import type { InputMode } from './storage.ts';

/** On the way, a cell counts within this share of its side from its middle (C). */
const REACH = 0.42;
/** Colours of the words placed, taken in turn so that touching words differ (tokens --fw-1 … --fw-4). */
export const HUES = 4;

export interface FieldViewState {
  field: Field;
  placed: readonly Placed[];
  /** The colour (1 … HUES) of each placed word. */
  hues: readonly number[];
  hint: { path: readonly number[]; shown: number } | null;
  /** The word being made: cells in order. */
  path: readonly number[];
  input: InputMode;
}

export interface FieldActions {
  /** The word being made changed. */
  change(path: number[]): void;
  /** A slide ended: check the word. */
  submit(path: number[]): void;
}

export interface FieldView {
  el: HTMLElement;
  render(state: FieldViewState): void;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

export function createFieldView(actions: FieldActions): FieldView {
  const lines = document.createElementNS(SVG_NS, 'svg');
  lines.setAttribute('class', 'field__lines');
  lines.setAttribute('aria-hidden', 'true');
  const grid = h('div', { class: 'field__grid' });
  const el = h('div', { class: 'field', 'aria-hidden': 'true' }, lines, grid);

  let state: FieldViewState | null = null;
  let cells: HTMLElement[] = [];
  let shapeKey = '';
  let turned = false;
  /** A slide in progress: the pointer that began it, the cells reached, the pointer's last place. */
  let slide: { pointer: number; path: number[]; moved: boolean; x: number; y: number } | null = null;

  const free = (i: number) => !!state && !state.placed.some((p) => p.path.includes(i));

  /** Where a cell is drawn: turned fields swap rows and columns. */
  const place = (i: number, field: Field) => {
    const r = Math.floor(i / field.cols);
    const c = i % field.cols;
    return turned ? { row: c, col: r } : { row: r, col: c };
  };

  function centre(i: number): { x: number; y: number; size: number } {
    const b = cells[i]!.getBoundingClientRect();
    return { x: b.left + b.width / 2, y: b.top + b.height / 2, size: b.width };
  }

  /** The cell whose middle is within reach of the point, if any. */
  function cellAt(x: number, y: number, reach: number): number | null {
    for (let i = 0; i < cells.length; i++) {
      const c = centre(i);
      if (Math.abs(c.x - x) <= c.size * reach && Math.abs(c.y - y) <= c.size * reach && Math.hypot(c.x - x, c.y - y) <= c.size * reach * 1.15) return i;
    }
    return null;
  }

  /** The slide reached a cell: added if it touches the last one, or — back on the previous one — the last comes off. */
  function reach(i: number | null): void {
    if (!slide || i === null || !state) return;
    const path = slide.path;
    if (path.at(-2) === i) path.pop();
    else if (!path.includes(i) && free(i) && touching(state.field.cols, path.at(-1)!, i)) path.push(i);
    else return;
    slide.moved = true;
    actions.change([...path]);
  }

  grid.addEventListener('pointerdown', (event) => {
    if (!state || (event.pointerType === 'mouse' && event.button !== 0)) return;
    if (slide) {
      event.preventDefault();
      return;
    }
    const i = cellAt(event.clientX, event.clientY, 0.5);
    if (i === null || !free(i)) return;
    event.preventDefault();
    grid.setPointerCapture(event.pointerId);
    slide = { pointer: event.pointerId, path: [i], moved: false, x: event.clientX, y: event.clientY };
  });

  grid.addEventListener('pointermove', (event) => {
    if (!slide || event.pointerId !== slide.pointer || !state || state.input === 'tap') return;
    const from = { x: slide.x, y: slide.y };
    const dx = event.clientX - from.x;
    const dy = event.clientY - from.y;
    const size = cells[0] ? centre(0).size : 40;
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / ((size * REACH) / 3)));
    for (let k = 1; k <= steps; k++) reach(cellAt(from.x + (dx * k) / steps, from.y + (dy * k) / steps, REACH));
    slide.x = event.clientX;
    slide.y = event.clientY;
    if (slide.moved) drawLines();
  });

  const finish = (event: PointerEvent, cancelled: boolean) => {
    if (!slide || event.pointerId !== slide.pointer) return;
    const { path, moved } = slide;
    slide = null;
    if (cancelled) actions.change([...(state?.path ?? [])]);
    else if (moved) actions.submit([...path]);
    else if (state?.input !== 'swipe') tap(path[0]!);
    drawLines();
  };
  grid.addEventListener('pointerup', (event) => finish(event, false));
  grid.addEventListener('pointercancel', (event) => finish(event, true));

  /** A tap: the cell is added after a touching last cell, taken off if it is the last, else a new word begins. */
  function tap(i: number): void {
    if (!state || !free(i)) return;
    const path = [...state.path];
    if (path.at(-1) === i) path.pop();
    else if (path.length && !path.includes(i) && touching(state.field.cols, path.at(-1)!, i)) path.push(i);
    else if (!path.includes(i)) path.splice(0, path.length, i);
    actions.change(path);
  }

  // No click handler: a finger's or a mouse's tap is handled on lifting it, and the click the browser sends after
  // it would count it twice. (The cells are not keyboard buttons: the keyboard types words instead.)

  function drawLines(): void {
    if (!state) return;
    const box = el.getBoundingClientRect();
    lines.setAttribute('viewBox', `0 0 ${Math.max(1, box.width)} ${Math.max(1, box.height)}`);
    const pointsOf = (path: readonly number[]) =>
      path
        .map((i) => {
          const c = centre(i);
          return `${(c.x - box.left).toFixed(1)},${(c.y - box.top).toFixed(1)}`;
        })
        .join(' ');
    const shapes: SVGElement[] = [];
    state.placed.forEach((p, k) => {
      const line = document.createElementNS(SVG_NS, 'polyline');
      line.setAttribute('class', `field__line fw-${state!.hues[k] ?? 1}`);
      line.setAttribute('points', pointsOf(p.path));
      shapes.push(line);
    });
    const making = slide ? slide.path : state.path;
    if (making.length > 1) {
      const line = document.createElementNS(SVG_NS, 'polyline');
      line.setAttribute('class', 'field__line field__line--making');
      line.setAttribute('points', pointsOf(making));
      shapes.push(line);
    }
    lines.replaceChildren(...shapes);
  }

  function build(field: Field): void {
    cells = field.cells.map((tile) => h('span', { class: `fw-cell${tile.length > 1 ? ' is-pair' : ''}` }, tile.toUpperCase()));
    grid.replaceChildren(...cells);
  }

  function layout(field: Field): void {
    const box = el.parentElement?.getBoundingClientRect();
    const wantTurned = !!box && box.width > box.height && field.rows > field.cols;
    if (wantTurned !== turned || !cells.length) turned = wantTurned;
    const cols = turned ? field.rows : field.cols;
    const rows = turned ? field.cols : field.rows;
    el.style.setProperty('--cols', String(cols));
    el.style.setProperty('--rows', String(rows));
    el.classList.toggle('is-turned', turned);
    cells.forEach((cell, i) => {
      const at = place(i, field);
      cell.style.gridRow = String(at.row + 1);
      cell.style.gridColumn = String(at.col + 1);
    });
  }

  // The stage's size decides whether the field turns.
  const resize = new ResizeObserver(() => {
    if (!state) return;
    layout(state.field);
    drawLines();
  });
  queueMicrotask(() => el.parentElement && resize.observe(el.parentElement));

  return {
    el,
    render(next) {
      const key = `${next.field.cols}x${next.field.rows}:${next.field.cells.join('')}`;
      state = next;
      if (key !== shapeKey) {
        shapeKey = key;
        build(next.field);
      }
      if (el.parentElement) resize.observe(el.parentElement);
      layout(next.field);
      const hueOf = new Map<number, number>();
      next.placed.forEach((p, k) => p.path.forEach((c) => hueOf.set(c, next.hues[k] ?? 1)));
      const making = new Set(slide ? slide.path : next.path);
      const shown = new Map<number, number>();
      if (next.hint) next.hint.path.slice(0, next.hint.shown).forEach((c, k) => shown.set(c, k + 1));
      cells.forEach((cell, i) => {
        const hue = hueOf.get(i);
        cell.className = ['fw-cell', next.field.cells[i]!.length > 1 ? 'is-pair' : '', hue ? `is-placed fw-${hue}` : '', making.has(i) ? 'is-making' : '', shown.has(i) ? 'is-hinted' : '']
          .filter(Boolean)
          .join(' ');
        if (shown.has(i)) cell.dataset.step = String(shown.get(i));
        else delete cell.dataset.step;
      });
      el.classList.toggle('field--tap', next.input === 'tap');
      requestAnimationFrame(drawLines);
    },
  };
}
