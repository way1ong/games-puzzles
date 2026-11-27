// The buttons under the board (docs/slide/SPEC.md, "Допомога"): Undo, Hint (then "Do it"), Start again, and for a
// fifteen with a picture — Picture, which shows the picture whole until pressed again. Help has no limit here.
import { h } from '../../../shared/ui/dom.ts';
import type { Dict } from './i18n.ts';
import { againSign, hintSign, pictureSign, undoSign } from './icons.ts';

export interface ToolActions {
  undo(): void;
  hint(): void;
  again(): void;
  picture(): void;
}

export interface ToolsState {
  /** A hint is shown: the button does it. */
  hintReady: boolean;
  /** The picture button: null — none (numbers, or "Clear the way"); else whether the picture is shown whole. */
  picture: boolean | null;
}

export function createToolsView(actions: ToolActions) {
  const tool = (sign: SVGSVGElement, act: () => void) => {
    const label = h('span', { class: 'tool__label' });
    const b = h('button', { class: 'tool', type: 'button' }, sign, label);
    b.addEventListener('click', act);
    return { b, label };
  };
  const undo = tool(undoSign(), () => actions.undo());
  const hint = tool(hintSign(), () => actions.hint());
  const again = tool(againSign(), () => actions.again());
  const picture = tool(pictureSign(), () => actions.picture());
  const el = h('div', { class: 'tools', role: 'group' }, undo.b, hint.b, again.b, picture.b);

  return {
    el,
    render(d: Dict, state: ToolsState): void {
      el.setAttribute('aria-label', d.tools.label);
      undo.label.textContent = d.tools.undo;
      hint.label.textContent = state.hintReady ? d.tools.doHint : d.tools.hint;
      hint.b.classList.toggle('is-ready', state.hintReady);
      again.label.textContent = d.tools.again;
      picture.label.textContent = d.tools.picture;
      picture.b.hidden = state.picture === null;
      picture.b.setAttribute('aria-pressed', String(state.picture === true));
      el.classList.toggle('tools--four', state.picture !== null);
    },
  };
}

export type ToolsView = ReturnType<typeof createToolsView>;
