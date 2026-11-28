// The board of "Clear the way" (docs/slide/SPEC.md, "Звільни шлях", "Керування"): the ground with its frame and the
// way out, every piece a button over its cells. A finger drags a piece along itself: it follows, stops at other
// pieces and the frame, and when let go stands on the nearest cell. Without dragging: tap a piece, then a free cell
// on its line. The keys: arrows walk the pieces (one Tab stop), Enter takes a piece, arrows then move it, Enter or Esc
// puts it down. The hint marks a piece and the place it goes to. Pieces glide to their places (not with "reduce
// motion"); the player's piece sails out at the end.
import { h } from '../../../shared/ui/dom.ts';
import { FRAME, groundSvg, pieceSvg, type PieceKind } from '../art/pieces.ts';
import { SLIDE, type Theme } from '../config.ts';
import { reachOf, type Move, type Places, type Puzzle } from '../core/unblock.ts';

export interface UnblockShow {
  puzzle: Puzzle;
  places: Places;
  theme: Theme;
  /** The piece taken (by a tap or Enter). */
  taken: number | null;
  hint: Move | null;
  done: boolean;
  /** Each piece's name for screen readers. */
  label(piece: number): string;
  exitLabel: string;
}

export interface UnblockActions {
  move(move: Move): void;
  /** A piece is taken (tapped or Enter) or put down (null). */
  take(piece: number | null): void;
  /** A tap on a piece that cannot move at all. */
  stuck(piece: number): void;
}

/** Pixels a finger travels before a press becomes a drag (C). */
const DRAG_PX = 8;

export const kindOf = (puzzle: Puzzle, piece: number): PieceKind => (piece === 0 ? 'own' : puzzle.pieces[piece]!.length >= 3 ? 'long' : 'short');

export function createUnblockView(actions: UnblockActions) {
  const ground = h('div', { class: 'yard__ground-wrap', 'aria-hidden': 'true' });
  const cells = h('div', { class: 'yard__cells' });
  const ghost = h('div', { class: 'ghost', 'aria-hidden': 'true', hidden: true });
  const exit = h('span', { class: 'visually-hidden' });
  const el = h('div', { class: 'yard', role: 'group' }, ground, cells, exit);
  el.style.setProperty('--frame', String(FRAME));
  el.style.setProperty('--size', String(SLIDE.unblock.size));
  let show: UnblockShow | null = null;
  let drawn = '';
  let buttons: HTMLButtonElement[] = [];
  let active = 0;
  /** A press on a piece: where along the piece's line it began, the piece's place then and its reach. */
  interface Drag {
    piece: number;
    id: number;
    start: number;
    at: number;
    least: number;
    most: number;
    moved: boolean;
  }
  let drag: Drag | null = null;

  // a finger on the board belongs to the game (.claude/rules/design.md)
  el.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });

  const size = SLIDE.unblock.size;

  function setActive(i: number, focus: boolean): void {
    active = Math.max(0, Math.min(buttons.length - 1, i));
    buttons.forEach((b, j) => (b.tabIndex = j === active ? 0 : -1));
    if (focus) buttons[active]?.focus();
  }

  /** Where a piece stands, in cells, as CSS. */
  function place(b: HTMLElement, puzzle: Puzzle, piece: number, at: number): void {
    const p = puzzle.pieces[piece]!;
    b.style.setProperty('--x', String(p.across ? at : p.line));
    b.style.setProperty('--y', String(p.across ? p.line : at));
  }

  function make(s: UnblockShow): void {
    drawn = `${s.theme}|${s.puzzle.pieces.map((p) => `${p.across}${p.line}${p.length}`).join()}`;
    el.dataset.theme = s.theme;
    ground.innerHTML = groundSvg(s.theme, size, SLIDE.unblock.exitRow);
    buttons = s.puzzle.pieces.map((p, i) => {
      const b = h('button', { class: `piece piece--${kindOf(s.puzzle, i)}`, type: 'button', tabindex: -1, 'data-piece': i });
      // a boat's bow, a bar's grain: half of them the other way round, the same for the same puzzle
      b.innerHTML = pieceSvg(s.theme, kindOf(s.puzzle, i), p.length, p.across, i > 0 && (i + p.line) % 2 === 1);
      b.style.setProperty('--w', String(p.across ? p.length : 1));
      b.style.setProperty('--h', String(p.across ? 1 : p.length));
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

  /** The cell of the board under a point of the screen, or null outside the cells. */
  function cellAt(x: number, y: number): number | null {
    const box = cells.getBoundingClientRect();
    const c = Math.floor(((x - box.left) / box.width) * size);
    const r = Math.floor(((y - box.top) / box.height) * size);
    return c >= 0 && r >= 0 && c < size && r < size ? r * size + c : null;
  }

  function down(e: PointerEvent, piece: number): void {
    if (!show || show.done || e.button !== 0) return;
    const p = show.puzzle.pieces[piece]!;
    const { least, most } = reachOf(show.puzzle, show.places, piece);
    const at = show.places[piece]!;
    drag = { piece, id: e.pointerId, start: p.across ? e.clientX : e.clientY, at, least, most, moved: false };
    buttons[piece]!.setPointerCapture(e.pointerId);
    setActive(piece, false);
  }

  /** How far a drag has gone, in cells along the piece, kept within its reach. */
  function offset(e: PointerEvent, d: Drag): number {
    if (!show) return 0;
    const p = show.puzzle.pieces[d.piece]!;
    const cell = cells.getBoundingClientRect().width / size;
    const raw = ((p.across ? e.clientX : e.clientY) - d.start) / cell;
    return Math.max(d.least - d.at, Math.min(d.most - d.at, raw));
  }

  /** A piece shown off its place by `cells` along itself (a drag, or what is left of one while it snaps). */
  function shift(piece: number, cells: number): void {
    const across = show?.puzzle.pieces[piece]?.across ?? true;
    const b = buttons[piece]!;
    b.style.setProperty('--dx', String(across ? cells : 0));
    b.style.setProperty('--dy', String(across ? 0 : cells));
  }

  function moveTo(e: PointerEvent): void {
    if (!drag || e.pointerId !== drag.id || !show) return;
    const p = show.puzzle.pieces[drag.piece]!;
    if (!drag.moved && Math.abs((p.across ? e.clientX : e.clientY) - drag.start) < DRAG_PX) return;
    drag.moved = true;
    buttons[drag.piece]!.classList.add('is-dragged');
    shift(drag.piece, offset(e, drag));
  }

  function up(e: PointerEvent): void {
    if (!drag || e.pointerId !== drag.id || !show) return;
    const d = drag;
    drag = null;
    const b = buttons[d.piece]!;
    if (d.moved) {
      // the piece stands on the nearest cell at once, shown where the finger left it; then it glides the rest
      const o = offset(e, d);
      const step = Math.round(o);
      shift(d.piece, o - step);
      if (step) actions.move({ piece: d.piece, to: d.at + step });
      requestAnimationFrame(() => {
        b.classList.remove('is-dragged');
        shift(d.piece, 0);
      });
      return;
    }
    // a tap: take the piece (again — put it down); a piece that cannot move says so
    if (d.least === d.most) {
      actions.stuck(d.piece);
      return;
    }
    actions.take(show.taken === d.piece ? null : d.piece);
  }

  function cancel(): void {
    if (!drag) return;
    buttons[drag.piece]?.classList.remove('is-dragged');
    shift(drag.piece, 0);
    drag = null;
  }

  // A tap on a free cell while a piece is taken: the piece goes there, if it lies on its line and nothing is between.
  // Pointer events, not "click": a finger's touches are the game's own here, so the browser makes no clicks of them.
  let tapOnCells: { id: number; x: number; y: number } | null = null;
  cells.addEventListener('pointerdown', (e) => {
    tapOnCells = (e.target as HTMLElement).closest('.piece') || e.button !== 0 ? null : { id: e.pointerId, x: e.clientX, y: e.clientY };
  });
  cells.addEventListener('pointerup', (e) => {
    const t = tapOnCells;
    tapOnCells = null;
    if (!t || t.id !== e.pointerId || Math.hypot(e.clientX - t.x, e.clientY - t.y) >= DRAG_PX) return;
    if (!show || show.taken === null) return;
    const cell = cellAt(e.clientX, e.clientY);
    if (cell === null) return;
    const p = show.puzzle.pieces[show.taken]!;
    const [r, c] = [Math.floor(cell / size), cell % size];
    if (p.across ? r !== p.line : c !== p.line) return;
    const along = p.across ? c : r;
    const at = show.places[show.taken]!;
    const to = along < at ? along : along >= at + p.length ? along - p.length + 1 : at;
    const { least, most } = reachOf(show.puzzle, show.places, show.taken);
    if (to !== at && to >= least && to <= most) actions.move({ piece: show.taken, to });
  });

  /** The nearest piece the other way of an arrow from the active one. */
  function nextPiece(dx: number, dy: number): number | null {
    if (!show) return null;
    const centre = (i: number) => {
      const p = show!.puzzle.pieces[i]!;
      const at = show!.places[i]!;
      return p.across ? [at + p.length / 2, p.line + 0.5] : [p.line + 0.5, at + p.length / 2];
    };
    const [x0, y0] = centre(active) as [number, number];
    let best: number | null = null;
    let bestScore = Infinity;
    for (let i = 0; i < buttons.length; i++) {
      if (i === active) continue;
      const [x, y] = centre(i) as [number, number];
      const ahead = (x - x0) * dx + (y - y0) * dy;
      if (ahead <= 0) continue;
      const side = Math.abs((x - x0) * dy) + Math.abs((y - y0) * dx);
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
    const arrows: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const a = arrows[event.key];
    if (a) {
      event.preventDefault();
      if (show.taken !== null) {
        // a taken piece moves one cell along itself, if the arrow is along it
        const p = show.puzzle.pieces[show.taken]!;
        const step = p.across ? a[0] : a[1];
        if (!step) return;
        const to = show.places[show.taken]! + step;
        const { least, most } = reachOf(show.puzzle, show.places, show.taken);
        if (to >= least && to <= most) actions.move({ piece: show.taken, to });
        return;
      }
      const next = nextPiece(a[0], a[1]);
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
    render(s: UnblockShow): void {
      const key = `${s.theme}|${s.puzzle.pieces.map((p) => `${p.across}${p.line}${p.length}`).join()}`;
      if (key !== drawn || buttons.length !== s.puzzle.pieces.length) make(s);
      show = s;
      el.dataset.theme = s.theme;
      el.classList.toggle('is-done', s.done);
      s.puzzle.pieces.forEach((_, i) => {
        const b = buttons[i]!;
        place(b, s.puzzle, i, s.places[i]!);
        b.classList.toggle('is-taken', s.taken === i);
        b.classList.toggle('is-hint', s.hint?.piece === i);
        b.setAttribute('aria-pressed', String(s.taken === i));
        b.setAttribute('aria-label', s.label(i));
      });
      if (s.hint) {
        const p = s.puzzle.pieces[s.hint.piece]!;
        ghost.hidden = false;
        place(ghost, s.puzzle, s.hint.piece, s.hint.to);
        ghost.style.setProperty('--w', String(p.across ? p.length : 1));
        ghost.style.setProperty('--h', String(p.across ? 1 : p.length));
      } else ghost.hidden = true;
      exit.textContent = s.exitLabel;
      if (s.taken !== null) setActive(s.taken, false);
    },
  };
}

export type UnblockView = ReturnType<typeof createUnblockView>;
