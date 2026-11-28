// The choice of the player's own size (docs/mines/SPEC.md, "Свій розмір"; decision of 28.11): width, height and mines,
// each with − and + (held down, they keep counting), within the bounds of the config — the mines follow the size; how
// much of the field the mines take; "Play". The field is made without guessing, as on the levels.
import { h } from '../../../shared/ui/dom.ts';
import { MINES } from '../config.ts';
import { fitSize, minesRange, type CustomSize } from '../core/custom.ts';
import { fmt, num, type Dict } from './i18n.ts';

/** Held down, − and + count again after this long, ms, and then every this often (C). */
const REPEAT_AFTER_MS = 450;
const REPEAT_EVERY_MS = 90;

export interface CustomWords {
  d: Dict;
  lang: string;
  /** "Mines" or "Flowers", as the field's theme says. */
  minesLabel: string;
}

export function customView(start: CustomSize, words: CustomWords, change: (size: CustomSize) => void, play: (size: CustomSize) => void): HTMLElement {
  const { d, lang } = words;
  let size = fitSize(start);
  const share = h('p', { class: 'custom__share', 'aria-live': 'polite' });
  const rows: { key: keyof CustomSize; out: HTMLOutputElement; less: HTMLButtonElement; more: HTMLButtonElement }[] = [];

  const bounds = (key: keyof CustomSize): { least: number; most: number } => {
    if (key === 'mines') return minesRange(size.width, size.height);
    return MINES.custom[key];
  };

  function show(): void {
    for (const r of rows) {
      const { least, most } = bounds(r.key);
      r.out.textContent = num(lang, size[r.key]);
      r.less.disabled = size[r.key] <= least;
      r.more.disabled = size[r.key] >= most;
    }
    const percent = new Intl.NumberFormat(lang, { style: 'percent', maximumFractionDigits: 0 }).format(size.mines / (size.width * size.height));
    share.textContent = fmt(d.custom.share, { share: percent });
  }

  function step(key: keyof CustomSize, by: number): boolean {
    const next = fitSize({ ...size, [key]: size[key] + by });
    if (next[key] === size[key] && next.mines === size.mines) return false;
    size = next;
    show();
    change(size);
    return true;
  }

  /** − or +: a tap counts one; held down, it goes on counting until let go or at the end of the range. */
  function stepper(key: keyof CustomSize, by: number, label: string): HTMLButtonElement {
    const b = h('button', { class: 'stepper__btn', type: 'button', 'aria-label': label }, h('span', { 'aria-hidden': 'true' }, by < 0 ? '−' : '+'));
    let timer = 0;
    const stop = () => window.clearTimeout(timer);
    b.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      stop();
      const again = () => {
        if (step(key, by)) timer = window.setTimeout(again, REPEAT_EVERY_MS);
      };
      timer = window.setTimeout(again, REPEAT_AFTER_MS);
    });
    for (const end of ['pointerup', 'pointercancel', 'pointerleave'] as const) b.addEventListener(end, stop);
    // held down on a phone: counting, not the browser's menu
    b.addEventListener('contextmenu', (e) => e.preventDefault());
    // a tap (or Enter, Space) counts one; a long hold has counted already
    let held = 0;
    b.addEventListener('pointerdown', () => (held = performance.now()));
    b.addEventListener('click', (e) => {
      if (e.detail !== 0 && performance.now() - held > REPEAT_AFTER_MS) return;
      step(key, by);
    });
    return b;
  }

  const row = (key: keyof CustomSize, label: string) => {
    const id = `custom-${key}`;
    const out = h('output', { class: 'stepper__value', id: `${id}-value` });
    const less = stepper(key, -1, fmt(d.custom.less, { what: label }));
    const more = stepper(key, 1, fmt(d.custom.more, { what: label }));
    rows.push({ key, out, less, more });
    return h(
      'div',
      { class: 'stepper', role: 'group', 'aria-labelledby': `${id}-label ${id}-value` },
      h('span', { class: 'stepper__label', id: `${id}-label` }, label),
      less,
      out,
      more,
    );
  };

  const go = h('button', { class: 'btn btn--primary custom__play', type: 'button' }, d.custom.play);
  go.addEventListener('click', () => play(size));
  const view = h(
    'div',
    { class: 'custom' },
    row('width', d.custom.width),
    row('height', d.custom.height),
    row('mines', words.minesLabel),
    share,
    h('p', { class: 'custom__note' }, d.custom.note),
    go,
  );
  show();
  return view;
}
