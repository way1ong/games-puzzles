// The shelves on the wall behind the counter: boards on iron brackets, cups, jars and coffee tins on them (free bays
// stay empty for things).
import type { Ctx } from '../defs.ts';
import { path, rect } from '../svg.ts';
import { beanJar, coffeeTin, cupStack, cups, milkJug, plates, teapot } from './crockery.ts';

export interface CupShelvesPart {
  item: { part: 'cups' | 'stack' | 'jar' | 'tin' | 'teapot' | 'jug' | 'plates' | 'gap' | 'bay'; w: number };
  x: number;
  y: number;
}

export interface CupShelves {
  x: number;
  w: number;
  board: number;
  rows: readonly number[];
  parts: readonly CupShelvesPart[];
}

export function cupShelves(c: Ctx, m: CupShelves): string {
  const { p } = c;
  const { x, w, board } = m;
  // the coffee tins take turns in colour
  const tins = [p.red, p.enamelGreen, p.blue];
  let s = '';
  for (const y of m.rows) {
    s += rect(x + 4, y + board, w - 8, 10, p.black, { opacity: 0.16, filter: c.ref('soft') });
    for (const bx of [x + 30, x + w - 30]) s += path(`M${bx - 3} ${y + board} l6 0 l0 8 q0 18 -20 22 l0 -5 q14 -4 14 -17Z`, p.ironDark);
    s += rect(x, y, w, board, p.woodMid, { rx: 2 }) + rect(x, y, w, 2.5, p.white, { opacity: 0.16 }) + rect(x, y + board - 3, w, 3, p.black, { opacity: 0.22 });
  }
  let tin = 0;
  for (const { item, x: px, y } of m.parts) {
    if (item.part === 'cups') s += cups(c, px, y, item.w);
    if (item.part === 'stack') s += cupStack(c, px, y, item.w);
    if (item.part === 'jar') s += beanJar(c, px, y, item.w);
    if (item.part === 'tin') s += coffeeTin(c, px, y, item.w, tins[tin++ % tins.length] as string);
    if (item.part === 'teapot') s += teapot(c, px, y, item.w);
    if (item.part === 'jug') s += milkJug(c, px, y, item.w);
    if (item.part === 'plates') s += plates(c, px, y, item.w);
  }
  return s;
}
