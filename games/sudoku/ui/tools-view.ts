// The tools between the board and the digits: undo, redo, notes (a switch), hint and — when the player
// switched it on — fill notes. Each has a sign and a word.
import { h } from '../../../shared/ui/dom.ts';
import type { Dict } from './i18n.ts';
import { fillSign, hintSign, notesSign, redoSign, undoSign } from './icons.ts';

export interface ToolsState {
  canUndo: boolean;
  canRedo: boolean;
  notes: boolean;
  fill: boolean;
}

export interface ToolActions {
  undo(): void;
  redo(): void;
  notes(): void;
  hint(): void;
  fill(): void;
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
  const undo = tool(undoSign(), actions.undo);
  const redo = tool(redoSign(), actions.redo);
  const notes = tool(notesSign(), actions.notes);
  const hint = tool(hintSign(), actions.hint);
  const fill = tool(fillSign(), actions.fill);
  const el = h('div', { class: 'tools', role: 'group' }, undo.button, redo.button, notes.button, hint.button, fill.button);

  return {
    el,
    render(state, d) {
      el.setAttribute('aria-label', d.tools.label);
      undo.label.textContent = d.tools.undo;
      redo.label.textContent = d.tools.redo;
      notes.label.textContent = d.tools.notes;
      hint.label.textContent = d.tools.hint;
      fill.label.textContent = d.tools.fill;
      // Nothing to undo or redo: the button says so when pressed rather than vanish under the finger.
      undo.button.setAttribute('aria-disabled', String(!state.canUndo));
      redo.button.setAttribute('aria-disabled', String(!state.canRedo));
      notes.button.setAttribute('aria-pressed', String(state.notes));
      fill.button.hidden = !state.fill;
      el.classList.toggle('tools--five', state.fill);
    },
  };
}
