// The shelf of bottles (docs/pour/SPEC.md, "Керування"): every bottle a button as wide as its column; a tap lifts
// a bottle or pours into one; the keys walk the bottles (one Tab stop, arrows across and between rows, Enter or Space
// to lift and pour, Esc to put down). A lifted bottle rises, the hint marks where from and where into, a done bottle
// has a cork; the water just poured rises in its bottle (not with "reduce motion"). Colours of the water —
// art/palette.ts, a paint's pattern — styles/app.css.
import { h } from '../../../shared/ui/dom.ts';
import { PAINTS } from '../art/palette.ts';
import { POUR } from '../config.ts';
import { isClosed, type Bottles, type Move } from '../core/bottles.ts';
import { fitShelf } from './shelf-layout.ts';

export interface ShelfShow {
  bottles: Bottles;
  paints: readonly number[];
  patterns: boolean;
  /** The lifted bottle. */
  up: number | null;
  hint: Move | null;
  /** The bottle just poured into and how many layers it got (they rise). */
  poured: { to: number; amount: number } | null;
  /** Each bottle's name for screen readers. */
  label(index: number): string;
}

export interface ShelfActions {
  tap(index: number): void;
  put(): void;
}

/** The widest glass, in the page's rem (C). */
const WIDEST_REM = 4.25;
/** The gap between bottles, in rem (C). */
const GAP_REM = 0.5;

export function createShelfView(actions: ShelfActions) {
  const el = h('div', { class: 'shelf', role: 'group' });
  el.style.setProperty('--capacity', String(POUR.capacity));
  let buttons: HTMLButtonElement[] = [];
  let active = 0;
  let cols = 1;

  function measure(): void {
    const n = buttons.length;
    if (!n || !el.clientWidth || !el.clientHeight) return;
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const fit = fitShelf(n, el.clientWidth, el.clientHeight, GAP_REM * rem, WIDEST_REM * rem);
    cols = fit.cols;
    el.style.setProperty('--cols', String(fit.cols));
    el.style.setProperty('--glass-w', `${fit.glassW}px`);
    el.style.setProperty('--glass-h', `${fit.glassH}px`);
  }
  new ResizeObserver(measure).observe(el);

  function setActive(i: number, focus: boolean): void {
    active = Math.max(0, Math.min(buttons.length - 1, i));
    buttons.forEach((b, j) => (b.tabIndex = j === active ? 0 : -1));
    if (focus) buttons[active]?.focus();
  }

  function makeButtons(n: number): void {
    buttons = Array.from({ length: n }, (_, i) => {
      const b = h('button', { class: 'bottle', type: 'button', 'data-bottle': i, tabindex: -1 });
      b.append(h('span', { class: 'bottle__glass' }, h('span', { class: 'bottle__water' }), h('span', { class: 'bottle__cork', 'aria-hidden': 'true' })));
      b.addEventListener('click', () => {
        setActive(i, false);
        actions.tap(i);
      });
      return b;
    });
    el.replaceChildren(...buttons);
    setActive(Math.min(active, n - 1), false);
    measure();
  }

  el.addEventListener('keydown', (event) => {
    const steps: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -cols, ArrowDown: cols, Home: -Infinity, End: Infinity };
    const step = steps[event.key];
    if (step !== undefined) {
      event.preventDefault();
      setActive(Number.isFinite(step) ? active + step : step < 0 ? 0 : buttons.length - 1, true);
    } else if (event.key === 'Escape') {
      actions.put();
    }
  });

  return {
    el,
    /** The bottle the keys stand on. */
    focus(): void {
      buttons[active]?.focus();
    },
    render(show: ShelfShow): void {
      if (buttons.length !== show.bottles.length) makeButtons(show.bottles.length);
      el.classList.toggle('is-plain', !show.patterns);
      show.bottles.forEach((bottle, i) => {
        const b = buttons[i]!;
        b.classList.toggle('is-up', show.up === i);
        b.classList.toggle('is-closed', isClosed(bottle, POUR.capacity));
        b.classList.toggle('is-from', show.hint?.from === i);
        b.classList.toggle('is-to', show.hint?.to === i);
        b.setAttribute('aria-label', show.label(i));
        b.setAttribute('aria-pressed', String(show.up === i));
        const water = b.querySelector('.bottle__water')!;
        const rising = show.poured?.to === i ? show.poured.amount : 0;
        water.replaceChildren(
          ...bottle.map((colour, k) => {
            const paint = show.paints[colour]!;
            const layer = h('span', { class: `layer pat-${paint}${k >= bottle.length - rising ? ' is-new' : ''}` });
            layer.style.setProperty('--water', PAINTS[paint]!.water);
            layer.style.setProperty('--ink', PAINTS[paint]!.ink);
            return layer;
          }),
        );
      });
    },
  };
}

export type ShelfView = ReturnType<typeof createShelfView>;
