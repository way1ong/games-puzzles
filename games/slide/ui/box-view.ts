// The board of "The chest" (docs/slide/SPEC.md, "Скринька", "Керування"): the tray with its sides and the slot, every
// piece a button over its cells. A finger drags a piece up, down, left or right — the way the finger goes first, as
// far as the cells are free; back at its place, the piece can go another way — and when let go it stands on the
// nearest cell. Without dragging: tap a piece, then a free cell in line with it. The keys: arrows walk the pieces (one
// Tab stop), Enter takes a piece, arrows then move it a cell, Enter or Esc puts it down. The hint marks a piece and
// the place it goes to. Pieces glide to their places (not with "reduce motion"); the chest leaves through the slot at
// the end.
import { h } from '../../../shared/ui/dom.ts';
import { boxPieceSvg, trayGroundSvg } from '../art/chest.ts';
import { FRAME } from '../art/pieces.ts';
import { SLIDE } from '../config.ts';
import { reachOf, sizeOf, stepped, wayOf, type BoxMove, type BoxPuzzle, type Spots, type Way } from '../core/box.ts';

export interface BoxShow {
  /** The puzzle as in the set: a new one gets its pieces anew (they do not glide over from the last). */
  board: string;
  puzzle: BoxPuzzle;
  places: Spots;
  /** The piece taken (by a tap or Enter). */
  taken: number | null;
  hint: BoxMove | null;
  done: boolean;
  /** Each piece's name for screen readers. */
  label(piece: number): string;
  exitLabel: string;
}

export interface BoxActions {
  move(move: BoxMove): void;
  /** A piece is taken (tapped or Enter) or put down (null). */
  take(piece: number | null): void;
  /** A tap on a piece that cannot move at all. */
  stuck(piece: number): void;
}

/** Pixels a finger travels before a press becomes a drag (C, as in "Clear the way"). */
const DRAG_PX = 8;
/** A dragged piece nearer its place than this many cells may turn to the other way (C). */
const TURN_CELLS = 0.3;

const ARROWS: Record<string, Way> = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };

export function createBoxView(actions: BoxActions) {
  const { cols, rows, slot } = SLIDE.box;
  const ground = h('div', { class: 'yard__ground-wrap', 'aria-hidden': 'true' });
  const cells = h('div', { class: 'yard__cells' });
  const ghost = h('div', { class: 'ghost', 'aria-hidden': 'true', hidden: true });
  const exit = h('span', { class: 'visually-hidden' });
  const el = h('div', { class: 'yard yard--box', role: 'group' }, ground, cells, exit);
  el.style.setProperty('--frame', String(FRAME));
  el.style.setProperty('--cols', String(cols));
  el.style.setProperty('--rows', String(rows));
  ground.innerHTML = trayGroundSvg(cols, rows, slot, sizeOf('chest')[0]);
  let show: BoxShow | null = null;
  let drawn = '';
  let buttons: HTMLButtonElement[] = [];
  let active = 0;
  /** A press on a piece: where it began, the piece's place then, how far it can go each way, the way it is dragged. */
  interface Drag {
    piece: number;
    id: number;
    x: number;
    y: number;
    at: number;
    reach: Record<Way, number>;
    axis: 'x' | 'y' | null;
  }
  let drag: Drag | null = null;

  // a finger on the board belongs to the game (.claude/rules/design.md)
  el.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });

  function setActive(i: number, focus: boolean): void {
    active = Math.max(0, Math.min(buttons.length - 1, i));
    buttons.forEach((b, j) => (b.tabIndex = j === active ? 0 : -1));
    if (focus) buttons[active]?.focus();
  }

  /** Where a piece stands, in cells, as CSS. */
  function place(b: HTMLElement, spot: number): void {
    b.style.setProperty('--x', String(spot % cols));
    b.style.setProperty('--y', String(Math.floor(spot / cols)));
  }

  function make(s: BoxShow): void {
    drawn = s.board;
    buttons = s.puzzle.shapes.map((shape, i) => {
      const [w, hgt] = sizeOf(shape);
      const b = h('button', { class: `piece piece--${shape}`, type: 'button', tabindex: -1, 'data-piece': i });
      b.innerHTML = boxPieceSvg(shape, w, hgt);
      b.style.setProperty('--w', String(w));
      b.style.setProperty('--h', String(hgt));
      b.addEventListener('pointerdown', (e) => down(e, i));
      b.addEventListener('pointermove', (e) => moveTo(e));
      b.addEventListener('pointerup', (e) => up(e));
      b.addEventListener('pointercancel', () => cancel());
      b.addEventListener('click', (e) => {
        // keys (Enter, Space) press the button with no pointer
        if (e.detail === 0) actions.take(show?.taken === i ? null : i);
      });
      return b;
    });
    cells.replaceChildren(...buttons, ghost);
    setActive(0, false);
  }

  const cellPx = () => cells.getBoundingClientRect().width / cols;

  /** The cell of the board under a point of the screen, or null outside the cells. */
  function cellAt(x: number, y: number): number | null {
    const box = cells.getBoundingClientRect();
    const c = Math.floor(((x - box.left) / box.width) * cols);
    const r = Math.floor(((y - box.top) / box.height) * rows);
    return c >= 0 && r >= 0 && c < cols && r < rows ? r * cols + c : null;
  }

  function down(e: PointerEvent, piece: number): void {
    if (!show || show.done || e.button !== 0) return;
    drag = { piece, id: e.pointerId, x: e.clientX, y: e.clientY, at: show.places[piece]!, reach: reachOf(show.puzzle, show.places, piece), axis: null };
    buttons[piece]!.setPointerCapture(e.pointerId);
    setActive(piece, false);
  }

  /** How far a drag has gone along its way, in cells, kept within the piece's reach. */
  function offset(e: PointerEvent, d: Drag): number {
    const px = cellPx();
    if (d.axis === 'x') return Math.max(-d.reach.left, Math.min(d.reach.right, (e.clientX - d.x) / px));
    return Math.max(-d.reach.up, Math.min(d.reach.down, (e.clientY - d.y) / px));
  }

  /** The way a finger goes, in cells across and down: the axis it goes most along, if the piece can go so. */
  function chooseAxis(d: Drag, dx: number, dy: number): 'x' | 'y' {
    const free = (axis: 'x' | 'y') => (axis === 'x' ? (dx < 0 ? d.reach.left : d.reach.right) : dy < 0 ? d.reach.up : d.reach.down) > 0;
    const first = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
    const other = first === 'x' ? 'y' : 'x';
    return free(first) || !free(other) ? first : other;
  }

  /** A piece shown off its place (a drag, or what is left of one while it snaps). */
  function shift(piece: number, dx: number, dy: number): void {
    const b = buttons[piece]!;
    b.style.setProperty('--dx', String(dx));
    b.style.setProperty('--dy', String(dy));
  }

  function moveTo(e: PointerEvent): void {
    if (!drag || e.pointerId !== drag.id || !show) return;
    const [dx, dy] = [e.clientX - drag.x, e.clientY - drag.y];
    if (!drag.axis) {
      if (Math.hypot(dx, dy) < DRAG_PX) return;
      drag.axis = chooseAxis(drag, dx, dy);
      buttons[drag.piece]!.classList.add('is-dragged');
    } else if (Math.abs(offset(e, drag)) < TURN_CELLS) {
      // back at its place: the piece may turn to where the finger goes now
      drag.axis = chooseAxis(drag, dx, dy);
    }
    const o = offset(e, drag);
    shift(drag.piece, drag.axis === 'x' ? o : 0, drag.axis === 'y' ? o : 0);
  }

  function up(e: PointerEvent): void {
    if (!drag || e.pointerId !== drag.id || !show) return;
    const d = drag;
    drag = null;
    const b = buttons[d.piece]!;
    if (d.axis) {
      // the piece stands on the nearest cell at once, shown where the finger left it; then it glides the rest
      const o = offset(e, d);
      const step = Math.round(o);
      const rest = o - step;
      shift(d.piece, d.axis === 'x' ? rest : 0, d.axis === 'y' ? rest : 0);
      if (step) {
        const way: Way = d.axis === 'x' ? (step > 0 ? 'right' : 'left') : step > 0 ? 'down' : 'up';
        actions.move({ piece: d.piece, to: stepped(show.puzzle, d.at, way, Math.abs(step)) });
      }
      requestAnimationFrame(() => {
        b.classList.remove('is-dragged');
        shift(d.piece, 0, 0);
      });
      return;
    }
    // a tap: take the piece (again — put it down); a piece that cannot move says so
    if (Object.values(d.reach).every((n) => n === 0)) {
      actions.stuck(d.piece);
      return;
    }
    actions.take(show.taken === d.piece ? null : d.piece);
  }

  function cancel(): void {
    if (!drag) return;
    buttons[drag.piece]?.classList.remove('is-dragged');
    shift(drag.piece, 0, 0);
    drag = null;
  }

  /** Where the taken piece goes for a tap on a free cell: the nearest place covering it in line, or null. */
  function targetFor(cell: number): BoxMove | null {
    if (!show || show.taken === null) return null;
    const piece = show.taken;
    const [w, hgt] = sizeOf(show.puzzle.shapes[piece]!);
    const at = show.places[piece]!;
    const [x, y, c, r] = [at % cols, Math.floor(at / cols), cell % cols, Math.floor(cell / cols)];
    let to: number | null = null;
    if (r >= y && r < y + hgt) to = c < x ? at - (x - c) : c >= x + w ? at + (c - x - w + 1) : null;
    else if (c >= x && c < x + w) to = r < y ? at - (y - r) * cols : at + (r - y - hgt + 1) * cols;
    if (to === null) return null;
    const move = { piece, to };
    const w2 = wayOf(show.puzzle, show.places, move);
    return w2 && w2.cells <= reachOf(show.puzzle, show.places, piece)[w2.way] ? move : null;
  }

  // A tap on a free cell while a piece is taken: the piece goes there, if it is in line and nothing is between.
  // Pointer events, not "click": a finger's touches are the game's own here, so the browser makes no clicks of them.
  let tapOnCells: { id: number; x: number; y: number } | null = null;
  cells.addEventListener('pointerdown', (e) => {
    tapOnCells = (e.target as HTMLElement).closest('.piece') || e.button !== 0 ? null : { id: e.pointerId, x: e.clientX, y: e.clientY };
  });
  cells.addEventListener('pointerup', (e) => {
    const t = tapOnCells;
    tapOnCells = null;
    if (!t || t.id !== e.pointerId || Math.hypot(e.clientX - t.x, e.clientY - t.y) >= DRAG_PX) return;
    const cell = cellAt(e.clientX, e.clientY);
    const move = cell === null ? null : targetFor(cell);
    if (move) actions.move(move);
  });

  /** The nearest piece the way of an arrow from the active one. */
  function nextPiece(way: Way): number | null {
    if (!show) return null;
    const centre = (i: number) => {
      const [w, hgt] = sizeOf(show!.puzzle.shapes[i]!);
      const at = show!.places[i]!;
      return [(at % cols) + w / 2, Math.floor(at / cols) + hgt / 2] as const;
    };
    const [sx, sy] = way === 'left' ? [-1, 0] : way === 'right' ? [1, 0] : way === 'up' ? [0, -1] : [0, 1];
    const [x0, y0] = centre(active);
    let best: number | null = null;
    let bestScore = Infinity;
    for (let i = 0; i < buttons.length; i++) {
      if (i === active) continue;
      const [x, y] = centre(i);
      const ahead = (x - x0) * sx + (y - y0) * sy;
      if (ahead <= 0) continue;
      const side = Math.abs((x - x0) * sy) + Math.abs((y - y0) * sx);
      const score = ahead + 2 * side;
      if (score < bestScore) {
        bestScore = score;
        best = i;
      }
    }
    return best;
  }

  el.addEventListener('keydown', (event) => {
    if (!show) return;
    const way = ARROWS[event.key];
    if (way) {
      event.preventDefault();
      if (show.taken !== null) {
        // a taken piece moves one cell the way of the arrow, if it is free
        if (reachOf(show.puzzle, show.places, show.taken)[way] > 0) actions.move({ piece: show.taken, to: stepped(show.puzzle, show.places[show.taken]!, way, 1) });
        return;
      }
      const next = nextPiece(way);
      if (next !== null) setActive(next, true);
      return;
    }
    if (event.key === 'Escape' && show.taken !== null) {
      event.preventDefault();
      actions.take(null);
    }
  });

  return {
    el,
    focus(): void {
      buttons[active]?.focus();
    },
    render(s: BoxShow): void {
      if (s.board !== drawn || buttons.length !== s.puzzle.shapes.length) make(s);
      show = s;
      el.classList.toggle('is-done', s.done);
      s.puzzle.shapes.forEach((_, i) => {
        const b = buttons[i]!;
        place(b, s.places[i]!);
        b.classList.toggle('is-taken', s.taken === i);
        b.classList.toggle('is-hint', s.hint?.piece === i);
        b.setAttribute('aria-pressed', String(s.taken === i));
        b.setAttribute('aria-label', s.label(i));
      });
      if (s.hint) {
        const [w, hgt] = sizeOf(s.puzzle.shapes[s.hint.piece]!);
        ghost.hidden = false;
        place(ghost, s.hint.to);
        ghost.style.setProperty('--w', String(w));
        ghost.style.setProperty('--h', String(hgt));
      } else ghost.hidden = true;
      exit.textContent = s.exitLabel;
      if (s.taken !== null) setActive(s.taken, false);
    },
  };
}

export type BoxView = ReturnType<typeof createBoxView>;
