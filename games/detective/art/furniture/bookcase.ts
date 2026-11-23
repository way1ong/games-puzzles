// The bookcase: its boards, the books of every shelf (free bays stay empty for things), a pile of books,
// a vase, and on top — the globe and two lying books.
import { floorShadow, type Ctx } from '../defs.ts';
import { g, path, rect } from '../svg.ts';
import { globe } from './globe.ts';

export interface BookcasePart {
  item:
    | { part: 'book'; w: number; h: number; colour: number; lean?: number }
    | { part: 'gap' | 'bay' | 'pile' | 'vase'; w: number };
  x: number;
  y: number;
}

export interface Bookcase {
  x: number;
  w: number;
  top: number;
  side: number;
  board: number;
  rows: readonly number[];
  roof: number;
  /** Where the bookcase stands on the floor line. */
  bottom: number;
  parts: readonly BookcasePart[];
  globeX: number;
  booksOnTop: { x: number; w: number; top: number };
}

function book(c: Ctx, x: number, bottom: number, w: number, h: number, colour: string, lean = 0): string {
  const { p } = c;
  const body =
    rect(0, -h, w, h, colour, { rx: 2.5 }) +
    rect(0, -h, w, h, c.ref('spine'), { rx: 2.5 }) +
    rect(2, -h + 9, w - 4, 3, p.white, { opacity: 0.35 }) +
    rect(2, -h + 15, w - 4, 1.5, p.white, { opacity: 0.25 }) +
    rect(2, -18, w - 4, 3, p.white, { opacity: 0.3 }) +
    rect(w / 2 - 3, -h / 2 - 8, 6, 16, p.white, { opacity: 0.18, rx: 2 });
  return g(`translate(${x} ${bottom}) rotate(${lean})`, body);
}

export function bookcase(c: Ctx, m: Bookcase): string {
  const { p } = c;
  const { x, w, top, bottom } = m;
  let s = floorShadow(c, x + w / 2, bottom + 4, w / 2 + 10, 10);
  s += rect(x, top, w, bottom - top, p.woodDark, { rx: 4 }) + rect(x + m.side, top + m.board, w - 2 * m.side, bottom - top - m.board, p.shelfBack);
  for (const y of [top, ...m.rows]) s += rect(x, y, w, m.board, p.wood) + rect(x, y + m.board - 2, w, 3, p.black, { opacity: 0.25 });
  s += rect(x, top, m.side, bottom - top, p.wood) + rect(x + w - m.side, top, m.side, bottom - top, p.wood);
  s += rect(x - 6, m.roof, w + 12, top - m.roof + 2, p.woodMid, { rx: 3 });

  for (const { item, x: px, y } of m.parts) {
    if (item.part === 'book') s += book(c, px, y, item.w, item.h, p.books[item.colour % p.books.length] as string, item.lean ?? 0);
    if (item.part === 'pile') {
      s += rect(px, y - 10, item.w, 10, p.books[4] as string, { rx: 2 }) + rect(px + 4, y - 20, item.w - 6, 10, p.books[10] as string, { rx: 2 });
    }
    if (item.part === 'vase') {
      const mid = px + item.w / 2;
      s += path(`M${mid - 6} ${y} q-10 -18 0 -34 l12 0 q10 16 0 34Z`, p.blueLight) + rect(mid - 8, y - 38, 16, 4, p.blueDark, { rx: 2 });
    }
  }
  // on top: the globe and two books lying one on the other
  const b = m.booksOnTop;
  const thick = (m.roof - b.top) / 2;
  s += globe(c, m.globeX, m.roof);
  s += rect(b.x, m.roof - thick, b.w, thick, p.books[1] as string, { rx: 2 }) + rect(b.x + 6, b.top, b.w - 10, thick, p.books[2] as string, { rx: 2 });
  return s;
}
