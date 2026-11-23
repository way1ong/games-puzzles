// A piece drawn as a small grid of cells (in the tray and while dragging).
import type { Cells } from '../core/shapes.ts';
import { h } from '../../../shared/ui/dom.ts';

export function pieceSize(cells: Cells): { rows: number; cols: number } {
  return {
    rows: Math.max(...cells.map(([r]) => r)) + 1,
    cols: Math.max(...cells.map(([, c]) => c)) + 1,
  };
}

/** `code` — the shape's 1-based number (colour and pattern); `cellPx` — size of one cell. */
export function pieceElement(cells: Cells, code: number, cellPx: number, gapPx: number): HTMLElement {
  const { rows, cols } = pieceSize(cells);
  const el = h('div', { class: 'piece', 'aria-hidden': 'true' });
  el.style.gridTemplateColumns = `repeat(${cols}, ${cellPx}px)`;
  el.style.gridTemplateRows = `repeat(${rows}, ${cellPx}px)`;
  el.style.gap = `${gapPx}px`;
  const filled = new Set(cells.map(([r, c]) => `${r},${c}`));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      el.append(h('span', { class: filled.has(`${r},${c}`) ? `blk s${code}` : 'gap' }));
    }
  }
  return el;
}
