// The tools under the table (one-handed play): hint, undo, new deal — free and without limits (decision of 25.11).
// Each has a sign and a word.
import { h } from '../../../shared/ui/dom.ts';
import type { Dict } from './i18n.ts';
import { dealSign, hintSign, undoSign } from './icons.ts';

export interface ToolActions {
  hint(): void;
  undo(): void;
  newDeal(): void;
}

export interface ToolsState {
  canUndo: boolean;
  /** No way to the end is found from here: a new deal stands out. */
  suggestNew: boolean;
  /** A hint is being looked for: the button says so. */
  thinking: boolean;
}

export interface ToolsView {
  el: HTMLElement;
  render(state: ToolsState, d: Dict): void;
}

export function createToolsView(actions: ToolActions): ToolsView {
  const tool = (sign: SVGSVGElement, run: () => void) => {
    const label = h('span', { class: 'tool__label' });
    const button = h('button', { class: 'tool', type: 'button' }, sign, label);
    button.addEventListener('click', run);
    return { button, label };
  };
  const hint = tool(hintSign(), actions.hint);
  const undo = tool(undoSign(), actions.undo);
  const fresh = tool(dealSign(), actions.newDeal);
  const el = h('div', { class: 'tools', role: 'group' }, hint.button, undo.button, fresh.button);

  return {
    el,
    render(state, d) {
      el.setAttribute('aria-label', d.tools.label);
      hint.label.textContent = d.tools.hint;
      undo.label.textContent = d.tools.undo;
      fresh.label.textContent = d.tools.newDeal;
      hint.button.setAttribute('aria-busy', String(state.thinking));
      // Nothing to undo: the button says so when pressed rather than vanish under the finger.
      undo.button.setAttribute('aria-disabled', String(!state.canUndo));
      fresh.button.classList.toggle('is-suggested', state.suggestNew);
    },
  };
}
