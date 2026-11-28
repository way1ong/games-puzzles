// The buttons under the board (docs/slide/SPEC.md, "Допомога"): Undo, Hint (then "Do it"), Start again, and for the
// fifteen — the goal ("Goal" with numbers, "Picture" with a picture), shown over the board until pressed again. Help
// has no limit here.
import { h } from '../../../shared/ui/dom.ts';
import type { Dict } from './i18n.ts';
import { againSign, goalSign, hintSign, pictureSign, undoSign } from './icons.ts';

export interface ToolActions {
  undo(): void;
  hint(): void;
  again(): void;
  picture(): void;
}

export interface ToolsState {
  /** A hint is shown: the button does it. */
  hintReady: boolean;
  /** The goal button of the fifteen: whether the goal is shown, and whether it is a picture; null — none. */
  goal: { shown: boolean; picture: boolean } | null;
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
  const signs = { picture: picture.b.firstElementChild!, goal: goalSign() };
  const el = h('div', { class: 'tools', role: 'group' }, undo.b, hint.b, again.b, picture.b);

  return {
    el,
    render(d: Dict, state: ToolsState): void {
      el.setAttribute('aria-label', d.tools.label);
      undo.label.textContent = d.tools.undo;
      hint.label.textContent = state.hintReady ? d.tools.doHint : d.tools.hint;
      hint.b.classList.toggle('is-ready', state.hintReady);
      again.label.textContent = d.tools.again;
      const g = state.goal;
      picture.b.hidden = g === null;
      if (g) {
        picture.label.textContent = g.picture ? d.tools.picture : d.tools.goal;
        const sign = g.picture ? signs.picture : signs.goal;
        if (picture.b.firstElementChild !== sign) picture.b.firstElementChild!.replaceWith(sign);
        picture.b.setAttribute('aria-pressed', String(g.shown));
      }
      el.classList.toggle('tools--four', g !== null);
    },
  };
}

export type ToolsView = ReturnType<typeof createToolsView>;
