// The tools under the grid (one-handed play): what a tap puts — paint or a cross — "Undo", the hint (free and without
// limits, decision of 25.11) and, on a grid that is zoomed, the whole picture. Each has a sign and a word.
import { h } from '../../../shared/ui/dom.ts';
import type { Mode } from '../core/play.ts';
import type { Dict } from './i18n.ts';
import { crossSign, fillSign, hintSign, undoSign, wholeSign } from './icons.ts';

export interface ToolActions {
  mode(mode: Mode): void;
  undo(): void;
  hint(): void;
  whole(): void;
}

export interface ToolsState {
  mode: Mode;
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
      fill.button.setAttribute('aria-pressed', String(state.mode === 'fill'));
      cross.button.setAttribute('aria-pressed', String(state.mode === 'cross'));
      // Nothing to undo: the button says so when pressed rather than vanish under the finger.
      undo.button.setAttribute('aria-disabled', String(!state.canUndo));
      whole.button.hidden = !state.zoomable;
      whole.button.setAttribute('aria-pressed', String(state.whole));
      el.classList.toggle('tools--whole', state.zoomable);
    },
  };
}
