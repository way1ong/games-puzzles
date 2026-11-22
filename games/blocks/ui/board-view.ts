// The board on screen: size × size cells, the shadow of a piece being placed, lines it would clear,
// and a short flash of cleared lines.
import type { Cells } from '../core/shapes.ts';
import { h } from './dom.ts';

export interface Preview {
  cells: Cells;
  /** The piece's shape number: a fitting shadow is drawn in its colour. */
  code: number;
  row: number;
  col: number;
  ok: boolean;
  /** Rows and columns this placement would clear. */
  rows: number[];
  cols: number[];
}

export interface BoardView {
  el: HTMLElement;
  render(board: readonly number[], preview: Preview | null, flash: ReadonlySet<number>): void;
  /** The cell under a screen point, or null outside the board. */
  cellAt(clientX: number, clientY: number): { row: number; col: number } | null;
  /** Top-left corner of the cell grid on screen and the step from one cell to the next, in px. */
  geometry(): { left: number; top: number; step: number; cell: number; gap: number };
}

export function createBoardView(size: number, label: string): BoardView {
  const el = h('div', { class: 'board', role: 'img', 'aria-label': label });
  el.style.setProperty('--size', String(size));
  const cells: HTMLElement[] = [];
  for (let i = 0; i < size * size; i++) {
    const cell = h('span', { class: 'cell' });
    cells.push(cell);
    el.append(cell);
  }

  function geometry() {
    const first = cells[0]?.getBoundingClientRect();
    const second = cells[1]?.getBoundingClientRect();
    if (!first || !second) return { left: 0, top: 0, step: 0, cell: 0, gap: 0 };
    const step = second.left - first.left;
    return { left: first.left, top: first.top, step, cell: first.width, gap: step - first.width };
  }

  return {
    el,
    geometry,
    cellAt(clientX, clientY) {
      const g = geometry();
      if (g.step <= 0) return null;
      const col = Math.floor((clientX - g.left + g.gap / 2) / g.step);
      const row = Math.floor((clientY - g.top + g.gap / 2) / g.step);
      return row >= 0 && col >= 0 && row < size && col < size ? { row, col } : null;
    },
    render(board, preview, flash) {
      const shadow = new Set<number>();
      if (preview) {
        for (const [r, c] of preview.cells) {
          const rr = preview.row + r;
          const cc = preview.col + c;
          if (rr >= 0 && cc >= 0 && rr < size && cc < size) shadow.add(rr * size + cc);
        }
      }
      const lineRows = new Set(preview?.ok ? preview.rows : []);
      const lineCols = new Set(preview?.ok ? preview.cols : []);
      cells.forEach((cell, i) => {
        const value = board[i] ?? 0;
        const row = Math.floor(i / size);
        const col = i % size;
        const classes = ['cell'];
        if (value > 0) classes.push(`blk`, `s${value}`);
        if (shadow.has(i)) classes.push(...(preview?.ok ? ['ghost', `s${preview.code}`] : ['shadow-bad']));
        if (lineRows.has(row) || lineCols.has(col)) classes.push('will-clear');
        if (flash.has(i)) classes.push('flash');
        cell.className = classes.join(' ');
      });
    },
  };
}
