// The buttons under the tray (docs/jigsaw/SPEC.md, "Допомога"): Hint (then "Put it"), Picture (the whole picture
// over the board until pressed again), Zoom in / Whole board (only while the board can be zoomed), New (free play).
import { h } from '../../../shared/ui/dom.ts';
import type { Dict } from './i18n.ts';
import { hintSign, newSign, pictureSign, wholeSign, zoomSign } from './icons.ts';

export interface ToolActions {
  hint(): void;
  picture(): void;
  zoom(): void;
  fresh(): void;
}

export interface ToolsState {
  /** A hint is shown: the button puts its piece. */
  hintReady: boolean;
  /** The whole picture is shown over the board. */
  picture: boolean;
  /** The board can be zoomed: whether it is whole now; null — it cannot. */
  whole: boolean | null;
  /** Free play: a new puzzle; false — the puzzle of the day. */
  fresh: boolean;
  /** "New" was tapped once on a puzzle begun: the second tap leaves it. */
  armed: boolean;
}

export function createToolsView(actions: ToolActions) {
  const tool = (sign: SVGSVGElement, act: () => void) => {
    const label = h('span', { class: 'tool__label' });
    const b = h('button', { class: 'tool', type: 'button' }, sign, label);
    b.addEventListener('click', act);
    return { b, label };
  };
  const hint = tool(hintSign(), () => actions.hint());
  const picture = tool(pictureSign(), () => actions.picture());
  const zoom = tool(zoomSign(), () => actions.zoom());
  const fresh = tool(newSign(), () => actions.fresh());
  const signs = { zoom: zoom.b.firstElementChild!, whole: wholeSign() };
  const el = h('div', { class: 'tools', role: 'group' }, hint.b, picture.b, zoom.b, fresh.b);

  return {
    el,
    render(d: Dict, state: ToolsState): void {
      el.setAttribute('aria-label', d.tools.label);
      hint.label.textContent = state.hintReady ? d.tools.put : d.tools.hint;
      hint.b.classList.toggle('is-ready', state.hintReady);
      picture.label.textContent = d.tools.picture;
      picture.b.setAttribute('aria-pressed', String(state.picture));
      zoom.b.hidden = state.whole === null;
      if (state.whole !== null) {
        // whole now: it zooms in; zoomed in: it shows the whole board
        zoom.label.textContent = state.whole ? d.tools.zoom : d.tools.whole;
        const sign = state.whole ? signs.zoom : signs.whole;
        if (zoom.b.firstElementChild !== sign) zoom.b.firstElementChild!.replaceWith(sign);
      }
      fresh.b.hidden = !state.fresh;
      fresh.label.textContent = d.tools.new;
      fresh.b.classList.toggle('is-armed', state.armed);
      el.dataset.count = String(2 + Number(state.whole !== null) + Number(state.fresh));
    },
  };
}

export type ToolsView = ReturnType<typeof createToolsView>;
