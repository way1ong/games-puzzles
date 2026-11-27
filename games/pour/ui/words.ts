// Words about the bottles for the screen and for screen readers: a bottle's name with its layers, why a pour cannot
// be made, a hint. From the dictionaries; the numbers are the bottles' places, counted from 1.
import { POUR } from '../config.ts';
import { isClosed, type Bottle, type Move, type NoPour } from '../core/bottles.ts';
import { fmt, type Dict } from './i18n.ts';

const paintName = (d: Dict, paint: number): string => d.paints[`p${paint}` as keyof Dict['paints']];

/** "Bottle 3: from the bottom up red, red, blue" / "…: empty" / "…: done, red" (and lifted, the hint's marks). */
export function bottleLabel(bottle: Bottle, index: number, paints: readonly number[], d: Dict, marks: string[] = []): string {
  const b = d.bottle;
  let what: string;
  if (!bottle.length) what = b.empty;
  else if (isClosed(bottle, POUR.capacity)) what = fmt(b.closed, { colour: paintName(d, paints[bottle[0]!]!) });
  else what = fmt(b.layers, { list: bottle.map((c) => paintName(d, paints[c]!)).join(', ') });
  return [fmt(b.label, { n: index + 1, what }), ...marks].join('; ');
}

export function whyText(why: NoPour, d: Dict): string {
  const g = d.game;
  return { same: g.put, empty: g.whyEmpty, closed: g.whyClosed, full: g.whyFull, colour: g.whyColour }[why];
}

export function hintText(move: Move, d: Dict): string {
  return fmt(d.game.hint, { from: move.from + 1, to: move.to + 1 });
}
