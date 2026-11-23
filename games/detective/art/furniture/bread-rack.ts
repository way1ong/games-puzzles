// The bread rack: its boards, the bread of every shelf (free bays stay empty for things) and, on top, a
// basket of baguettes.
import { floorShadow, type Ctx } from '../defs.ts';
import { g, path, rect, stroke } from '../svg.ts';
import { buns, jar, loaf, tinLoaf } from './bread.ts';

export interface BreadRackPart {
  item: { part: 'loaf' | 'tin' | 'buns' | 'jar' | 'gap' | 'bay'; w: number };
  x: number;
  y: number;
}

export interface BreadRack {
  x: number;
  w: number;
  top: number;
  side: number;
  board: number;
  rows: readonly number[];
  roof: number;
  /** Where the rack stands on the floor line. */
  bottom: number;
  parts: readonly BreadRackPart[];
  basket: { x: number; w: number };
}

/** A wicker basket with baguettes standing in it; `y` — the board it stands on. */
function baguetteBasket(c: Ctx, x: number, y: number, w: number): string {
  const { p } = c;
  const baguette = (dx: number, turn: number, long: number) =>
    g(
      `translate(${x + dx} ${y - 14}) rotate(${turn})`,
      rect(-6, -long, 12, long, p.crust, { rx: 6 }) +
        rect(-6, -long, 12, long, c.ref('spine'), { rx: 6 }) +
        [0.2, 0.42, 0.64].map((k) => stroke(`M-4 ${-long * (1 - k)} l8 -7`, p.crustLight, 2.2)).join(''),
    );
  let s = baguette(w * 0.26, -13, 62) + baguette(w * 0.46, -3, 70) + baguette(w * 0.63, 7, 64) + baguette(w * 0.8, 16, 54);
  const body = `M${x} ${y - 34} L${x + w} ${y - 34} L${x + w - 8} ${y} L${x + 8} ${y}Z`;
  s += path(body, p.wicker) + path(body, c.ref('round'));
  for (let i = 1; i < 4; i++) s += rect(x + 3, y - 34 + i * 8.5, w - 6, 1.6, p.wickerDark, { opacity: 0.55 });
  for (let i = 1; i < w / 11; i++) s += rect(x + i * 11, y - 33, 1.6, 32, p.wickerDark, { opacity: 0.35 });
  return s + rect(x - 2, y - 38, w + 4, 6, p.wickerDark, { rx: 3 });
}

export function breadRack(c: Ctx, m: BreadRack): string {
  const { p } = c;
  const { x, w, top, bottom } = m;
  let s = floorShadow(c, x + w / 2, bottom + 4, w / 2 + 10, 10);
  s += rect(x, top, w, bottom - top, p.wood, { rx: 4 }) + rect(x + m.side, top + m.board, w - 2 * m.side, bottom - top - m.board, p.woodDark);
  for (const y of [top, ...m.rows]) s += rect(x, y, w, m.board, p.woodMid) + rect(x, y + m.board - 2, w, 3, p.black, { opacity: 0.25 });
  s += rect(x, top, m.side, bottom - top, p.woodMid) + rect(x + w - m.side, top, m.side, bottom - top, p.woodMid);
  s += rect(x - 6, m.roof, w + 12, top - m.roof + 2, p.woodMid, { rx: 3 }) + rect(x - 6, m.roof, w + 12, 3, p.white, { opacity: 0.12, rx: 1.5 });

  for (const { item, x: px, y } of m.parts) {
    if (item.part === 'loaf') s += loaf(c, px, y, item.w);
    if (item.part === 'tin') s += tinLoaf(c, px, y, item.w);
    if (item.part === 'buns') s += buns(c, px, y, item.w);
    if (item.part === 'jar') s += jar(c, px, y, item.w);
  }
  return s + baguetteBasket(c, m.basket.x, m.roof, m.basket.w);
}
