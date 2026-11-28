// The board of the fifteen (docs/slide/SPEC.md, "П’ятнашки", "Керування"): every tile a button that keeps its element
// while it moves, so it glides to its new cell (not with "reduce motion"). A tap — or a stroke of the finger toward
// the gap — slides the tile with the tiles between; the keys walk the tiles (one Tab stop, arrows; Enter or Space
// slides). A tile shows its number, its part of the picture, or both; a tile on its own cell has a frame and a check
// mark; the hint marks a tile. The goal can be shown over the board — the tiles in order, or the whole picture; at the
// end the gap fills with the last part.
import { h } from '../../../shared/ui/dom.ts';
import type { Face } from '../config.ts';
import { homeOf, type Tiles } from '../core/fifteen.ts';
import { checkSign } from './icons.ts';

export interface FifteenShow {
  tiles: Tiles;
  face: Face;
  /** The picture (a data address) when the tiles show one. */
  picture: string | null;
  /** The tile the hint marks. */
  hint: number | null;
  /** The goal over the board: the whole picture, or with numbers alone the tiles in order. */
  whole: boolean;
  done: boolean;
  /** Each tile's name for screen readers, by its number and cell. */
  label(tile: number, cell: number): string;
  pictureLabel: string;
  goalLabel: string;
}

export interface FifteenActions {
  /** The tile at a cell is tapped (or stroked toward the gap). */
  tap(cell: number): void;
}

/** Pixels a finger travels before a press is a stroke, not a tap (C). */
const STROKE_PX = 12;

export function createFifteenView(actions: FifteenActions) {
  const el = h('div', { class: 'tiles', role: 'group' });
  const whole = h('div', { class: 'tiles__whole', role: 'img', hidden: true });
  /** The tiles in order (with numbers alone): what the board must come to. */
  const goal = h('div', { class: 'tiles__goal', role: 'img', hidden: true });
  const last = h('div', { class: 'tile tile--last', 'aria-hidden': 'true' });
  let size = 0;
  let buttons = new Map<number, HTMLButtonElement>();
  let tiles: Tiles = [];
  /** The tile the keys stand on: at first the one in the top left corner. */
  let active = 1;
  let fresh = true;
  let press: { id: number; x: number; y: number; cell: number } | null = null;

  // a finger on the board belongs to the game: no scrolling or zooming by the browser (.claude/rules/design.md)
  el.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });

  const cellOf = (tile: number) => tiles.indexOf(tile);

  function setActive(tile: number, focus: boolean): void {
    if (!buttons.has(tile)) return;
    active = tile;
    for (const [t, b] of buttons) b.tabIndex = t === active ? 0 : -1;
    if (focus) buttons.get(active)?.focus();
  }

  function make(n: number): void {
    size = n;
    el.style.setProperty('--n', String(n));
    buttons = new Map();
    for (let t = 1; t < n * n; t++) {
      const b = h(
        'button',
        { class: 'tile', type: 'button', tabindex: -1, 'data-tile': t },
        h('span', { class: 'tile__num' }, String(t)),
        h('span', { class: 'tile__ok', 'aria-hidden': 'true' }, checkSign()),
      );
      const home = homeOf(t, n);
      b.style.setProperty('--hr', String(Math.floor(home / n)));
      b.style.setProperty('--hc', String(home % n));
      b.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        press = { id: e.pointerId, x: e.clientX, y: e.clientY, cell: cellOf(t) };
        b.setPointerCapture(e.pointerId);
      });
      b.addEventListener('pointerup', (e) => {
        if (!press || press.id !== e.pointerId) return;
        const { x, y, cell } = press;
        press = null;
        setActive(t, false);
        const [dx, dy] = [e.clientX - x, e.clientY - y];
        if (Math.hypot(dx, dy) < STROKE_PX) {
          actions.tap(cell);
          return;
        }
        // a stroke counts only toward the gap
        const gap = tiles.indexOf(0);
        const [gr, gc, r, c] = [Math.floor(gap / size), gap % size, Math.floor(cell / size), cell % size];
        const along = Math.abs(dx) > Math.abs(dy) ? (gr === r ? Math.sign(gc - c) === Math.sign(dx) : false) : gc === c ? Math.sign(gr - r) === Math.sign(dy) : false;
        if (along) actions.tap(cell);
      });
      b.addEventListener('pointercancel', () => (press = null));
      // keys (Enter, Space) press the button with no pointer
      b.addEventListener('click', (e) => {
        if (e.detail === 0) actions.tap(cellOf(t));
      });
      buttons.set(t, b);
    }
    last.style.setProperty('--hr', String(n - 1));
    last.style.setProperty('--hc', String(n - 1));
    last.style.setProperty('--r', String(n - 1));
    last.style.setProperty('--c', String(n - 1));
    goal.replaceChildren(...Array.from({ length: n * n }, (_, cell) => h('span', { class: cell < n * n - 1 ? 'goal-tile' : 'goal-gap', 'aria-hidden': 'true' }, cell < n * n - 1 ? String(cell + 1) : '')));
    el.replaceChildren(...buttons.values(), last, whole, goal);
    fresh = true;
  }

  el.addEventListener('keydown', (event) => {
    const step: Record<string, [number, number]> = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] };
    const s = step[event.key];
    if (!s) return;
    event.preventDefault();
    const at = cellOf(active);
    let [r, c] = [Math.floor(at / size), at % size];
    // the next tile that way, over the gap
    for (;;) {
      r += s[0];
      c += s[1];
      if (r < 0 || c < 0 || r >= size || c >= size) return;
      const tile = tiles[r * size + c]!;
      if (tile) {
        setActive(tile, true);
        return;
      }
    }
  });

  return {
    el,
    focus(): void {
      buttons.get(active)?.focus();
    },
    render(show: FifteenShow): void {
      const n = Math.round(Math.sqrt(show.tiles.length));
      if (n !== size) make(n);
      tiles = show.tiles;
      el.dataset.face = show.face;
      el.classList.toggle('is-done', show.done);
      el.style.setProperty('--picture', show.picture ? `url("${show.picture}")` : 'none');
      show.tiles.forEach((tile, cell) => {
        if (!tile) return;
        const b = buttons.get(tile)!;
        b.style.setProperty('--r', String(Math.floor(cell / n)));
        b.style.setProperty('--c', String(cell % n));
        b.classList.toggle('is-hint', show.hint === tile);
        b.classList.toggle('is-home', cell === homeOf(tile, n));
        b.setAttribute('aria-label', show.label(tile, cell));
      });
      whole.hidden = !show.whole || !show.picture;
      whole.setAttribute('aria-label', show.pictureLabel);
      goal.hidden = !show.whole || !!show.picture;
      goal.setAttribute('aria-label', show.goalLabel);
      if (fresh || !buttons.has(active)) setActive(show.tiles.find((t) => t !== 0)!, false);
      fresh = false;
    },
  };
}

export type FifteenView = ReturnType<typeof createFifteenView>;
