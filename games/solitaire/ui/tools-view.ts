// The tools under the table (one-handed play): hint, undo, new deal — free and without limits (decision of 25.11).
// The deal of the day has no new deal: where no way to the end is left, "Start over" takes its place. Each has a sign
// and a word.
import { h } from '../../../shared/ui/dom.ts';
import type { Dict } from './i18n.ts';
import { dealSign, hintSign, restartSign, undoSign } from './icons.ts';

export interface ToolActions {
  hint(): void;
  undo(): void;
  newDeal(): void;
  restart(): void;
}

export interface ToolsState {
  canUndo: boolean;
  /** The third button: a new deal (an ordinary deal), start over (the deal of the day with no way left), none. */
  fresh: 'deal' | 'restart' | null;
  /** No way to the end is found from here: the third button stands out. */
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
  const again = tool(restartSign(), actions.restart);
  const el = h('div', { class: 'tools', role: 'group' }, hint.button, undo.button, fresh.button, again.button);

  return {
    el,
    render(state, d) {
      el.setAttribute('aria-label', d.tools.label);
      hint.label.textContent = d.tools.hint;
      undo.label.textContent = d.tools.undo;
      fresh.label.textContent = d.tools.newDeal;
      again.label.textContent = d.tools.restart;
      hint.button.setAttribute('aria-busy', String(state.thinking));
      // Nothing to undo: the button says so when pressed rather than vanish under the finger.
      undo.button.setAttribute('aria-disabled', String(!state.canUndo));
      fresh.button.hidden = state.fresh !== 'deal';
      again.button.hidden = state.fresh !== 'restart';
      fresh.button.classList.toggle('is-suggested', state.suggestNew);
      again.button.classList.toggle('is-suggested', state.suggestNew);
      el.classList.toggle('tools--two', state.fresh === null);
    },
  };
}
