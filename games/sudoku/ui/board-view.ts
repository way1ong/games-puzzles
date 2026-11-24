// The board on the screen: 81 buttons, row by row. Each shows its digit or its notes; classes carry what is
// highlighted (the chosen cell, its row, column and box, the same digit, mistakes, a hint). The board only
// shows: the game decides, the screen passes taps on.
import { h } from '../../../shared/ui/dom.ts';
import type { Game } from '../core/game.ts';
import { BOX, CELLS, SIZE, bit, colOf, rowOf } from '../core/grid.ts';

/** What a hint shows on the board. */
export interface HintMarks {
  /** Where the digit goes. */
  target: number | null;
  /** The cells the step rests on. */
  cells: ReadonlySet<number>;
  /** A wing's pivot: the cell the two others depend on. */
  pivot: number | null;
  /** The cells of the rows, columns or boxes the step looks at. */
  area: ReadonlySet<number>;
  /** Candidates shown instead of the player's notes while the step is explained. */
  cands: ReadonlyMap<number, number>;
  /** Candidates the step removes (shown struck through). */
  struck: ReadonlyMap<number, number>;
  /** Wrong digits the hint points at. */
  bad: ReadonlySet<number>;
}

export interface BoardMarks {
  selected: number | null;
  /** The chosen cell's row, column and box. */
  peers: ReadonlySet<number>;
  /** A digit shown stronger wherever it is (0 — none). */
  same: number;
  /** Digits marked as mistakes (repeated or wrong). */
  bad: ReadonlySet<number>;
  hint: HintMarks | null;
}

export interface BoardView {
  el: HTMLElement;
  render(game: Game, marks: BoardMarks, label: (cell: number) => string): void;
  /** Moves the keyboard focus to the cell. */
  focus(cell: number): void;
  /** Lights the cells up for a moment (a finished row, column or box). */
  flash(cells: readonly number[]): void;
}

interface CellParts {
  button: HTMLButtonElement;
  digit: HTMLSpanElement;
  notes: HTMLSpanElement;
  note: HTMLSpanElement[];
}

export function createBoardView(onCell: (cell: number) => void): BoardView {
  const parts: CellParts[] = [];
  const el = h('div', { class: 'board', role: 'group' });
  for (let cell = 0; cell < CELLS; cell++) {
    const r = rowOf(cell);
    const c = colOf(cell);
    const note = Array.from({ length: SIZE }, () => h('span', { class: 'note' }));
    const digit = h('span', { class: 'cell__digit' });
    // Spaces between the notes: the cell's name lists them as they are seen ("notes 1, 3, 8").
    const notes = h('span', { class: 'cell__notes', 'aria-hidden': 'true' }, ...note.flatMap((n) => [n, ' ']));
    const edges = [c % BOX === BOX - 1 && c < SIZE - 1 ? 'edge-r' : '', r % BOX === BOX - 1 && r < SIZE - 1 ? 'edge-b' : '']
      .filter(Boolean)
      .join(' ');
    const button = h('button', { class: `cell ${edges}`.trim(), type: 'button', tabindex: -1 }, digit, notes);
    button.dataset.cell = String(cell);
    parts.push({ button, digit, notes, note });
    el.append(button);
  }

  el.addEventListener('click', (event) => {
    const target = (event.target as HTMLElement).closest<HTMLButtonElement>('.cell');
    if (target?.dataset.cell) onCell(Number(target.dataset.cell));
  });

  return {
    el,
    render(game, marks, label) {
      const hint = marks.hint;
      const tabCell = marks.selected ?? 0;
      for (let cell = 0; cell < CELLS; cell++) {
        const p = parts[cell]!;
        const digit = game.digits[cell]!;
        const given = game.givens[cell] !== '0';
        const shown = hint?.cands.get(cell);
        const notes = digit ? 0 : (shown ?? game.notes[cell]!);
        const struck = hint?.struck.get(cell) ?? 0;
        p.digit.textContent = digit ? String(digit) : '';
        p.digit.hidden = !digit;
        p.notes.hidden = !!digit || !notes;
        p.notes.classList.toggle('is-hint', shown !== undefined);
        for (let d = 1; d <= SIZE; d++) {
          const n = p.note[d - 1]!;
          const on = (notes & bit(d)) !== 0;
          n.textContent = on ? String(d) : '';
          n.classList.toggle('is-same', on && d === marks.same);
          n.classList.toggle('is-struck', on && (struck & bit(d)) !== 0);
        }
        const c = p.button.classList;
        c.toggle('is-given', given);
        c.toggle('is-user', !!digit && !given);
        c.toggle('is-selected', cell === marks.selected);
        c.toggle('is-peer', marks.peers.has(cell));
        c.toggle('is-same', !!digit && digit === marks.same);
        c.toggle('is-bad', marks.bad.has(cell) || !!hint?.bad.has(cell));
        c.toggle('is-area', !!hint?.area.has(cell));
        c.toggle('is-pattern', !!hint?.cells.has(cell));
        c.toggle('is-pivot', hint?.pivot === cell);
        c.toggle('is-target', hint?.target === cell);
        p.button.tabIndex = cell === tabCell ? 0 : -1;
        p.button.setAttribute('aria-label', label(cell));
      }
    },
    focus(cell) {
      parts[cell]?.button.focus();
    },
    flash(cells) {
      for (const cell of cells) {
        const b = parts[cell]?.button;
        if (!b) continue;
        b.classList.remove('is-flash');
        void b.offsetWidth; // restart the animation
        b.classList.add('is-flash');
      }
    },
  };
}
