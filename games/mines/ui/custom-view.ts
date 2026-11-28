// The choice of the player's own size (docs/mines/SPEC.md, "Свій розмір"; decision of 28.11): width, height and mines,
// each with − and + (shared/ui/stepper.ts), within the bounds of the config — the mines follow the size; how much of
// the field the mines take; "Play". The field is made without guessing, as on the levels.
import { h } from '../../../shared/ui/dom.ts';
import { createStepper, type Stepper } from '../../../shared/ui/stepper.ts';
import { MINES } from '../config.ts';
import { fitSize, minesRange, type CustomSize } from '../core/custom.ts';
import { fmt, num, type Dict } from './i18n.ts';

export interface CustomWords {
  d: Dict;
  lang: string;
  /** "Mines" or "Flowers", as the field's theme says. */
  minesLabel: string;
}

export function customView(start: CustomSize, words: CustomWords, change: (size: CustomSize) => void, play: (size: CustomSize) => void): HTMLElement {
  const { d, lang } = words;
  let size = fitSize(start);
  const share = h('p', { class: 'custom__note custom__share', 'aria-live': 'polite' });
  const rows: { key: keyof CustomSize; stepper: Stepper }[] = [];

  const bounds = (key: keyof CustomSize): { least: number; most: number } => {
    if (key === 'mines') return minesRange(size.width, size.height);
    return MINES.custom[key];
  };

  function show(): void {
    for (const r of rows) {
      const { least, most } = bounds(r.key);
      r.stepper.show(num(lang, size[r.key]), size[r.key] > least, size[r.key] < most);
    }
    const percent = new Intl.NumberFormat(lang, { style: 'percent', maximumFractionDigits: 0 }).format(size.mines / (size.width * size.height));
    share.textContent = fmt(d.custom.share, { share: percent });
  }

  /** One step of a number; false when it cannot go further (then a held button stops). */
  function step(key: keyof CustomSize, by: number): boolean {
    const next = fitSize({ ...size, [key]: size[key] + by });
    if (next[key] === size[key] && next.mines === size.mines) return false;
    size = next;
    show();
    change(size);
    return true;
  }

  const row = (key: keyof CustomSize, label: string) => {
    const stepper = createStepper(`custom-${key}`, { label, less: fmt(d.custom.less, { what: label }), more: fmt(d.custom.more, { what: label }) }, (by) => step(key, by));
    rows.push({ key, stepper });
    return stepper.el;
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
