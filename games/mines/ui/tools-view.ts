// The tools under the field (one-handed play): what a tap does — open or flag (the other is a long press) — the hint
// (free and without limits; while it is shown it reads "Do it": a second press does what it says), a new field (not in
// a field of the day) and, on a field that is zoomed, the whole field. While an opened mine is shown, in their place:
// start over, or undo the move (as the menu says), and a new field. Their row stays the same, so the field above does
// not move. Each has a sign and a word.
import { h } from '../../../shared/ui/dom.ts';
import type { AfterMine } from '../config.ts';
import type { Dict } from './i18n.ts';
import { flagSign, hintSign, newSign, openSign, restartSign, undoSign, wholeSign } from './icons.ts';

export type Mode = 'open' | 'flag';

export interface ToolActions {
  mode(mode: Mode): void;
  hint(): void;
  fresh(): void;
  whole(): void;
  restart(): void;
  undo(): void;
}

export interface ToolsState {
  mode: Mode;
  /** "New field" is there (an ordinary field). */
  fresh: boolean;
  /** The field can be zoomed: "Whole field" is there, pressed while all of it is seen. */
  zoomable: boolean;
  whole: boolean;
  /** A hint is shown that the next press does. */
  hintReady: boolean;
  /** An opened mine is shown: what the menu says follows it; null — none. */
  boom: AfterMine | null;
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
  const open = tool(openSign(), () => actions.mode('open'), 'tool--mode');
  const flag = tool(flagSign(), () => actions.mode('flag'), 'tool--mode');
  const modes = h('div', { class: 'modes', role: 'group' }, open.button, flag.button);
  const restart = tool(restartSign(), actions.restart, 'tool--main');
  const undo = tool(undoSign(), actions.undo, 'tool--main');
  const hint = tool(hintSign(), actions.hint);
  const fresh = tool(newSign(), actions.fresh);
  const whole = tool(wholeSign(), actions.whole);
  const el = h('div', { class: 'tools', role: 'group' }, modes, restart.button, undo.button, hint.button, fresh.button, whole.button);

  return {
    el,
    render(state, d) {
      el.setAttribute('aria-label', d.tools.label);
      modes.setAttribute('aria-label', d.tools.mode);
      open.label.textContent = d.tools.open;
      flag.label.textContent = d.tools.flag;
      restart.label.textContent = d.tools.restart;
      undo.label.textContent = d.tools.undoMove;
      hint.label.textContent = state.hintReady ? d.tools.doHint : d.tools.hint;
      fresh.label.textContent = d.tools.new;
      whole.label.textContent = d.tools.whole;
      open.button.setAttribute('aria-pressed', String(state.mode === 'open'));
      flag.button.setAttribute('aria-pressed', String(state.mode === 'flag'));
      const boom = state.boom !== null;
      modes.hidden = boom;
      restart.button.hidden = state.boom !== 'restart';
      undo.button.hidden = state.boom !== 'undo';
      hint.button.hidden = boom;
      hint.button.classList.toggle('is-ready', state.hintReady);
      fresh.button.hidden = !state.fresh;
      whole.button.hidden = boom || !state.zoomable;
      whole.button.setAttribute('aria-pressed', String(state.whole));
      el.classList.toggle('is-boom', boom);
      el.dataset.count = String(boom ? 1 + Number(state.fresh) : 1 + Number(state.fresh) + Number(state.zoomable));
    },
  };
}
