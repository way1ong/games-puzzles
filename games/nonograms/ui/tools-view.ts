// The tools under the grid (one-handed play): what a tap puts — paint or a cross; in a picture in colour, one of its
// paints or the cross ("Кольорові малюнки") — "Undo", the hint (free and without limits, decision of 25.11) and, on a
// grid that is zoomed, the whole picture. Each has a sign and a word; a paint has its swatch (colour and pattern) and
// its name for screen readers.
import { h } from '../../../shared/ui/dom.ts';
import type { Mode } from '../core/play.ts';
import { fmt, type Dict } from './i18n.ts';
import { crossSign, fillSign, hintSign, undoSign, wholeSign } from './icons.ts';
import { dress, type PaintLook } from './paint.ts';

export interface ToolActions {
  mode(mode: Mode): void;
  /** A paint chosen (from 1): what a tap puts in a colour picture. */
  paint(paint: number): void;
  undo(): void;
  hint(): void;
  whole(): void;
}

export interface ToolsState {
  mode: Mode;
  /** A picture in colour: its paints' looks (the same list while the picture is open) and names, and the one chosen
   * (from 1); null — black and white. */
  paints: { looks: readonly PaintLook[]; names: readonly string[] } | null;
  paint: number;
  canUndo: boolean;
  /** The grid can be zoomed: "Whole picture" is there, pressed while all of the grid is seen. */
  zoomable: boolean;
  whole: boolean;
}

export interface ToolsView {
  el: HTMLElement;
  render(state: ToolsState, d: Dict): void;
}

export function createToolsView(actions: ToolActions): ToolsView {
  const tool = (sign: SVGSVGElement, run: () => void, extra = '') => {
    const label = h('span', { class: 'tool__label' });
    const button = h('button', { class: `tool ${extra}`.trim(), type: 'button' }, sign, label);
    button.addEventListener('click', run);
    return { button, label };
  };
  const fill = tool(fillSign(), () => actions.mode('fill'), 'tool--mode');
  const cross = tool(crossSign(), () => actions.mode('cross'), 'tool--mode');
  const modes = h('div', { class: 'modes', role: 'group' }, fill.button, cross.button);
  const undo = tool(undoSign(), actions.undo);
  const hint = tool(hintSign(), actions.hint);
  const whole = tool(wholeSign(), actions.whole);
  const el = h('div', { class: 'tools', role: 'group' }, modes, undo.button, hint.button, whole.button);
  /** The paints' buttons of the picture open now, and the looks they were made for. */
  let paintButtons: HTMLButtonElement[] = [];
  let paintsFor: readonly PaintLook[] | null = null;

  function setPaints(looks: readonly PaintLook[] | null): void {
    if (looks === paintsFor) return;
    paintsFor = looks;
    for (const b of paintButtons) b.remove();
    paintButtons = (looks ?? []).map((look, i) => {
      const swatch = h('span', { class: 'swatch', 'aria-hidden': 'true' });
      dress(swatch, look);
      const b = h('button', { class: 'tool tool--mode tool--paint', type: 'button' }, swatch);
      b.addEventListener('click', () => actions.paint(i + 1));
      return b;
    });
    for (const b of paintButtons) modes.insertBefore(b, cross.button);
    fill.button.hidden = looks !== null;
    modes.classList.toggle('modes--paints', looks !== null);
  }

  return {
    el,
    render(state, d) {
      el.setAttribute('aria-label', d.tools.label);
      modes.setAttribute('aria-label', d.tools.mode);
      fill.label.textContent = d.tools.fill;
      cross.label.textContent = d.tools.cross;
      undo.label.textContent = d.tools.undo;
      hint.label.textContent = d.tools.hint;
      whole.label.textContent = d.tools.whole;
      fill.button.setAttribute('aria-pressed', String(state.mode === 'fill' && !state.paints));
      cross.button.setAttribute('aria-pressed', String(state.mode === 'cross'));
      setPaints(state.paints?.looks ?? null);
      paintButtons.forEach((b, i) => {
        b.setAttribute('aria-label', fmt(d.tools.paint, { colour: state.paints?.names[i] ?? '' }));
        b.setAttribute('aria-pressed', String(state.mode === 'fill' && state.paint === i + 1));
      });
      // Nothing to undo: the button says so when pressed rather than vanish under the finger.
      undo.button.setAttribute('aria-disabled', String(!state.canUndo));
      whole.button.hidden = !state.zoomable;
      whole.button.setAttribute('aria-pressed', String(state.whole));
      el.classList.toggle('tools--whole', state.zoomable);
    },
  };
}
