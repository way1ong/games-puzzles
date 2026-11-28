// The choice of the player's own size (docs/pour/SPEC.md, "Свій розмір"; decision of 28.11): colours and empty
// bottles, each with − and + (shared/ui/stepper.ts), within the bounds of the config — with many colours the empty
// bottles follow; "Play". Every deal is solved before it is given, as on the difficulties.
import { h } from '../../../shared/ui/dom.ts';
import { createStepper, type Stepper } from '../../../shared/ui/stepper.ts';
import { POUR } from '../config.ts';
import { emptyRange, fitSize, type CustomSize } from '../core/custom.ts';
import { fmt, num, type Dict } from './i18n.ts';

export function customView(start: CustomSize, d: Dict, lang: string, change: (size: CustomSize) => void, play: (size: CustomSize) => void): HTMLElement {
  let size = fitSize(start);
  const rows: { key: keyof CustomSize; stepper: Stepper }[] = [];

  const bounds = (key: keyof CustomSize): { least: number; most: number } => (key === 'empty' ? emptyRange(size.colours) : POUR.custom.colours);

  function show(): void {
    for (const r of rows) {
      const { least, most } = bounds(r.key);
      r.stepper.show(num(lang, size[r.key]), size[r.key] > least, size[r.key] < most);
    }
  }

  /** One step of a number; false when it cannot go further (then a held button stops). */
  function step(key: keyof CustomSize, by: number): boolean {
    const next = fitSize({ ...size, [key]: size[key] + by });
    if (next.colours === size.colours && next.empty === size.empty) return false;
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
  const { above } = POUR.custom.manyColours;
  const view = h(
    'div',
    { class: 'custom' },
    row('colours', d.custom.colours),
    row('empty', d.custom.empty),
    h('p', { class: 'custom__note' }, d.custom.note),
    h('p', { class: 'custom__note' }, fmt(d.custom.oneEmpty, { n: num(lang, above) })),
    go,
  );
  show();
  return view;
}
