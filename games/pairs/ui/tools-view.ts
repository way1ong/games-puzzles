// The tools under the table (one-handed play): hint, undo, shuffle — free and without limits (decision of 25.11);
// shuffles may be limited in the menu, then the button tells how many are left. Each has a sign and a word.
import { h } from '../../../shared/ui/dom.ts';
import { fmt, type Dict } from './i18n.ts';
import { hintSign, shuffleSign, undoSign } from './icons.ts';

export interface ToolActions {
  hint(): void;
  undo(): void;
  shuffle(): void;
}

export interface ToolsState {
  canUndo: boolean;
  /** No pairs to take, or no way to clear the table from here: the shuffle stands out. */
  suggestShuffle: boolean;
  /** Shuffles left under the limit chosen; null — no limit. */
  shufflesLeft: number | null;
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
  const shuffle = tool(shuffleSign(), actions.shuffle);
  const el = h('div', { class: 'tools', role: 'group' }, hint.button, undo.button, shuffle.button);

  return {
    el,
    render(state, d) {
      el.setAttribute('aria-label', d.tools.label);
      hint.label.textContent = d.tools.hint;
      undo.label.textContent = d.tools.undo;
      shuffle.label.textContent = state.shufflesLeft === null ? d.tools.shuffle : fmt(d.tools.shuffleLeft, { n: state.shufflesLeft });
      // Nothing to undo: the button says so when pressed rather than vanish under the finger.
      undo.button.setAttribute('aria-disabled', String(!state.canUndo));
      // none left: the button says so when pressed, like undo with nothing to undo
      shuffle.button.setAttribute('aria-disabled', String(state.shufflesLeft === 0));
      shuffle.button.classList.toggle('is-suggested', state.suggestShuffle && state.shufflesLeft !== 0);
    },
  };
}
