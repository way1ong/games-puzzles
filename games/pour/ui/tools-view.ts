// The buttons under the bottles (docs/pour/SPEC.md, "Допомога"): Undo, Hint (then "Do it"), One more bottle, Start
// again; in free play also New game (decision of 28.11). A button shows how much of its help is left when the help is
// limited; with none left it fades and, pressed, says why (as "Shuffle" in Pairs).
import { h } from '../../../shared/ui/dom.ts';
import type { Dict } from './i18n.ts';
import { againSign, bottleSign, hintSign, newSign, undoSign } from './icons.ts';

export interface ToolActions {
  undo(): void;
  hint(): void;
  extra(): void;
  again(): void;
  newGame(): void;
}

export interface ToolsState {
  /** null — no limit. */
  undoLeft: number | null;
  hintsLeft: number | null;
  extraLeft: number;
  /** A hint is shown: the button does it. */
  hintReady: boolean;
  /** Free play: a fifth button, New game. */
  newGame: boolean;
  /** New game was tapped once: the button stands out for the second tap. */
  newArmed: boolean;
}

export function createToolsView(actions: ToolActions) {
  const tool = (sign: SVGSVGElement, act: () => void) => {
    const label = h('span', { class: 'tool__label' });
    const left = h('span', { class: 'tool__left', 'aria-hidden': 'true' });
    // the name a screen reader says is what is seen: the word, then how much is left (on its line, not one of its own)
    const b = h('button', { class: 'tool', type: 'button' }, sign, h('span', { class: 'tool__words' }, label, ' ', left));
    b.addEventListener('click', act);
    return { b, label, left };
  };
  const undo = tool(undoSign(), () => actions.undo());
  const hint = tool(hintSign(), () => actions.hint());
  const extra = tool(bottleSign(), () => actions.extra());
  const again = tool(againSign(), () => actions.again());
  const fresh = tool(newSign(), () => actions.newGame());
  const el = h('div', { class: 'tools', role: 'group' }, undo.b, hint.b, extra.b, again.b, fresh.b);

  const count = (t: { b: HTMLButtonElement; left: HTMLElement }, n: number | null) => {
    t.left.textContent = n === null ? '' : String(n);
    t.b.classList.toggle('is-spent', n === 0);
  };

  return {
    el,
    render(d: Dict, state: ToolsState): void {
      el.setAttribute('aria-label', d.tools.label);
      undo.label.textContent = d.tools.undo;
      count(undo, state.undoLeft);
      const hintName = state.hintReady ? d.tools.doHint : d.tools.hint;
      hint.label.textContent = hintName;
      hint.b.classList.toggle('is-ready', state.hintReady);
      count(hint, state.hintReady ? null : state.hintsLeft);
      extra.label.textContent = d.tools.extra;
      count(extra, state.extraLeft);
      again.label.textContent = d.tools.again;
      fresh.label.textContent = d.tools.new;
      fresh.b.hidden = !state.newGame;
      fresh.b.classList.toggle('is-ready', state.newArmed);
      el.classList.toggle('tools--five', state.newGame);
    },
  };
}

export type ToolsView = ReturnType<typeof createToolsView>;
