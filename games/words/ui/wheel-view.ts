// The wheel: the level's letters on a circle. A word is made by sliding a finger (or the mouse) across the
// letters — the first letter is the nearest one within a large touch circle; on the way a letter counts once the
// finger is on it, but a straight slide between two letters does not catch the one between them — and going back
// to the previous letter takes the last one off; letting go checks the word. Letters can also be tapped one by one
// (and are buttons for the keyboard and screen readers).
import { h } from '../../../shared/ui/dom.ts';
import type { InputMode } from './storage.ts';

/**
 * Where a slide starts (or a tap lands): the nearest letter within this share of the distance between
 * neighbouring letters' centres — generous, as no other letter is that near (C).
 */
const REACH_START = 0.62;
/**
 * On the way: a letter counts within its own circle and a little more (`button`, a share of its radius), but never
 * as far as `spacing` (a share of the distance between neighbours) — on a wheel of seven letters a straight slide
 * from a letter to the next but one passes the letter between them at 0.43 of that distance (C).
 */
const REACH_ON_WAY = { button: 1.15, spacing: 0.38 };
/** The letters' circle: its radius, in % of the wheel's side. */
const RADIUS = 36;

export interface WheelState {
  letters: readonly string[];
  /** Indices of the letters in the word being made, in order. */
  selected: readonly number[];
  input: InputMode;
}

export interface WheelActions {
  /** The word being made changed. */
  change(selected: number[]): void;
  /** A slide ended: check the word. */
  submit(selected: number[]): void;
}

export interface WheelView {
  el: HTMLElement;
  render(state: WheelState, label: string): void;
}

export function createWheelView(actions: WheelActions): WheelView {
  const svgNs = 'http://www.w3.org/2000/svg';
  const line = document.createElementNS(svgNs, 'polyline');
  line.setAttribute('class', 'wheel__line');
  const lines = document.createElementNS(svgNs, 'svg');
  lines.setAttribute('class', 'wheel__lines');
  lines.setAttribute('aria-hidden', 'true');
  lines.setAttribute('viewBox', '0 0 100 100');
  lines.setAttribute('preserveAspectRatio', 'none');
  lines.append(line);
  const ring = h('div', { class: 'wheel__ring', role: 'group' });
  const el = h('div', { class: 'wheel' }, lines, ring);

  let state: WheelState = { letters: [], selected: [], input: 'both' };
  let buttons: HTMLButtonElement[] = [];
  /**
   * A slide in progress: the finger (or mouse) that began it, the letters reached, and the pointer's place (for
   * the line to the finger). Other fingers are ignored meanwhile — a hand holding the phone may touch the screen.
   */
  let slide: { pointer: number; path: number[]; moved: boolean; x: number; y: number } | null = null;
  /** A pointer tap was handled: the click that follows it is ignored. */
  let tapped = false;

  const centre = (b: HTMLElement) => {
    const r = b.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  };

  /** Where the letters are now, and how near a point must come to reach one: at the start and on the way. */
  function measure(): { centres: { x: number; y: number }[]; start: number; onWay: number } {
    const centres = buttons.map(centre);
    const radius = (buttons[0]?.getBoundingClientRect().width ?? 0) / 2;
    let spacing = Infinity;
    for (let i = 0; i < centres.length; i++) {
      const a = centres[i]!;
      const b = centres[(i + 1) % centres.length]!;
      if (a !== b) spacing = Math.min(spacing, Math.hypot(a.x - b.x, a.y - b.y));
    }
    if (!Number.isFinite(spacing)) return { centres, start: radius, onWay: radius };
    return { centres, start: spacing * REACH_START, onWay: Math.min(radius * REACH_ON_WAY.button, spacing * REACH_ON_WAY.spacing) };
  }

  /** The nearest letter within `within` of the point, if any. */
  function letterAt(centres: readonly { x: number; y: number }[], within: number, x: number, y: number): number | null {
    let best: number | null = null;
    let bestDistance = Infinity;
    centres.forEach((c, i) => {
      const distance = Math.hypot(c.x - x, c.y - y);
      if (distance <= within && distance < bestDistance) {
        best = i;
        bestDistance = distance;
      }
    });
    return best;
  }

  function drawLine(): void {
    const box = el.getBoundingClientRect();
    const path = slide ? slide.path : [...state.selected];
    const points = path.map((i) => centre(buttons[i]!));
    if (slide && slide.path.length) points.push({ x: slide.x, y: slide.y });
    line.setAttribute(
      'points',
      points.map((p) => `${(((p.x - box.left) / box.width) * 100).toFixed(2)},${(((p.y - box.top) / box.height) * 100).toFixed(2)}`).join(' '),
    );
  }

  /** The slide reached a letter: added, or — back on the previous one — the last letter comes off. */
  function reach(i: number | null): void {
    if (!slide || i === null) return;
    const path = slide.path;
    if (path.at(-2) === i) path.pop();
    else if (!path.includes(i)) path.push(i);
    else return;
    slide.moved = true;
    actions.change([...path]);
  }

  ring.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || buttons.length === 0) return;
    if (slide) {
      event.preventDefault();
      return;
    }
    const m = measure();
    const i = letterAt(m.centres, m.start, event.clientX, event.clientY);
    if (i === null) return;
    event.preventDefault();
    ring.setPointerCapture(event.pointerId);
    slide = { pointer: event.pointerId, path: [i], moved: false, x: event.clientX, y: event.clientY };
  });

  ring.addEventListener('pointermove', (event) => {
    if (!slide || event.pointerId !== slide.pointer || state.input === 'tap') return;
    // Every point of the way since the last move, a third of the reach apart: a quick slide skips no letter.
    const m = measure();
    const from = { x: slide.x, y: slide.y };
    const dx = event.clientX - from.x;
    const dy = event.clientY - from.y;
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / (m.onWay / 3)));
    for (let k = 1; k <= steps; k++) reach(letterAt(m.centres, m.onWay, from.x + (dx * k) / steps, from.y + (dy * k) / steps));
    slide.x = event.clientX;
    slide.y = event.clientY;
    if (slide.moved) drawLine();
  });

  const finish = (event: PointerEvent, cancelled: boolean) => {
    if (!slide || event.pointerId !== slide.pointer) return;
    const { path, moved } = slide;
    slide = null;
    tapped = true;
    window.setTimeout(() => (tapped = false), 0);
    if (cancelled) actions.change([...state.selected]);
    else if (moved) actions.submit([...path]);
    else if (state.input !== 'swipe') toggle(path[0]!);
    drawLine();
  };
  ring.addEventListener('pointerup', (event) => finish(event, false));
  ring.addEventListener('pointercancel', (event) => finish(event, true));

  /** A tap: the letter is added — or, if it is the last one, taken off. */
  function toggle(i: number): void {
    const sel = state.selected;
    actions.change(sel.at(-1) === i ? sel.slice(0, -1) : sel.includes(i) ? [...sel] : [...sel, i]);
  }

  // Keyboard and screen readers press the letters as buttons.
  ring.addEventListener('click', (event) => {
    if (tapped || slide) return;
    const b = (event.target as HTMLElement).closest<HTMLButtonElement>('.wheel__letter');
    if (b) toggle(buttons.indexOf(b));
  });

  return {
    el,
    render(next, label) {
      const lettersChanged = next.letters.join('\u0000') !== state.letters.join('\u0000') || buttons.length !== next.letters.length;
      state = next;
      ring.setAttribute('aria-label', label);
      el.classList.toggle('wheel--tap', next.input === 'tap');
      if (lettersChanged) {
        const n = next.letters.length;
        buttons = next.letters.map((letter, i) => {
          const angle = (2 * Math.PI * i) / n - Math.PI / 2;
          const b = h(
            'button',
            {
              class: `wheel__letter${letter.length > 1 ? ' is-pair' : ''}`,
              type: 'button',
              style: `--x: ${(50 + RADIUS * Math.cos(angle)).toFixed(2)}%; --y: ${(50 + RADIUS * Math.sin(angle)).toFixed(2)}%`,
            },
            letter.toUpperCase(),
          );
          return b;
        });
        ring.replaceChildren(...buttons);
      }
      buttons.forEach((b, i) => {
        const at = next.selected.indexOf(i);
        b.classList.toggle('is-selected', at >= 0);
        b.setAttribute('aria-pressed', String(at >= 0));
      });
      drawLine();
    },
  };
}
