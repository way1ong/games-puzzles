// The pieces on offer: one slot per piece, a "turn" button under each in the calm mode.
import type { Cells, Piece } from '../core/shapes.ts';
import { shapeCode } from '../core/game.ts';
import { h } from './dom.ts';
import { pieceElement } from './piece-view.ts';

export interface TraySlot {
  el: HTMLElement;
  /** The area the player presses and drags. */
  grab: HTMLElement;
  turn: HTMLButtonElement;
}

export function createTray(count: number, label: string): { el: HTMLElement; slots: TraySlot[] } {
  const el = h('div', { class: 'tray', role: 'group', 'aria-label': label });
  el.style.setProperty('--count', String(count));
  const slots: TraySlot[] = [];
  for (let i = 0; i < count; i++) {
    const grab = h('div', { class: 'tray__grab' });
    const turn = h('button', { class: 'tray__turn', type: 'button' });
    const slot = h('div', { class: 'tray__slot' }, grab, turn);
    slots.push({ el: slot, grab, turn });
    el.append(slot);
  }
  return { el, slots };
}

export interface TrayOptions {
  /** Size of a cell of this piece in the tray, px (long pieces get smaller cells to fit the slot). */
  cellPx: (cells: Cells) => number;
  gapPx: number;
  selected: number | null;
  canTurn: boolean;
  pieceLabel: (n: number) => string;
  turnLabel: (n: number) => string;
  turnText: string;
}

export function renderTray(slots: TraySlot[], tray: readonly (Piece | null)[], opts: TrayOptions): void {
  slots.forEach((slot, i) => {
    const piece = tray[i] ?? null;
    slot.grab.replaceChildren();
    slot.el.classList.toggle('is-empty', piece === null);
    slot.el.classList.toggle('is-selected', opts.selected === i && piece !== null);
    if (piece) slot.grab.append(pieceElement(piece.cells, shapeCode(piece.shape), opts.cellPx(piece.cells), opts.gapPx));
    slot.grab.setAttribute('aria-label', opts.pieceLabel(i + 1));
    slot.grab.setAttribute('role', 'button');
    slot.grab.tabIndex = piece ? 0 : -1;
    slot.grab.setAttribute('aria-pressed', String(opts.selected === i && piece !== null));
    // Calm mode only; under a placed piece the button is invisible (and not focusable) but keeps its place.
    slot.turn.hidden = !opts.canTurn;
    slot.turn.style.visibility = piece ? '' : 'hidden';
    slot.turn.textContent = opts.turnText;
    slot.turn.setAttribute('aria-label', opts.turnLabel(i + 1));
  });
}
