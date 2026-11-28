// The sorting case: a grid of pigeonholes on a sorting table with two drawers. Each pigeonhole has a brass label
// holder with a blank card under it; letters, bundles, postcards and small packets wait in most of them, the free
// ones stay empty for things.
import { floorShadow, type Ctx } from '../defs.ts';
import { circle, g, path, rect, rects, stroke } from '../svg.ts';

export interface SortingCell {
  item: { part: 'letters' | 'pile' | 'packet' | 'cards' | 'bundle' | 'roll' | 'bay' };
  /** Left edge of the pigeonhole and the line it holds things on. */
  x: number;
  y: number;
  row: number;
  col: number;
}

export interface SortingCase {
  x: number;
  w: number;
  top: number;
  side: number;
  board: number;
  divider: number;
  cell: number;
  rows: readonly number[];
  headroom: number;
  table: number;
  /** Where the table stands on the floor line. */
  bottom: number;
  cells: readonly SortingCell[];
}

/** An envelope standing on its edge: its front with a stamp and, on the front one, the address. */
function envelope(c: Ctx, w: number, h: number, fill: string, stamp: string, address: boolean): string {
  const { p } = c;
  let s = rect(-w / 2, -h, w, h, fill, { rx: 1.5, stroke: p.linenEdge, 'stroke-width': 0.8 }) + rect(w / 2 - 11, -h + 3, 8, 9, stamp, { rx: 0.8 });
  if (address) s += rect(-w / 2 + 6, -h / 2 + 2, w * 0.5, 2.2, p.scribble, { opacity: 0.55 }) + rect(-w / 2 + 6, -h / 2 + 7, w * 0.38, 2.2, p.scribble, { opacity: 0.45 });
  return s;
}

/** What waits in one pigeonhole; `x` — its middle, `y` — its line, `v` — which one it is (colours take turns). */
function mail(c: Ctx, part: SortingCell['item']['part'], x: number, y: number, v: number): string {
  const { p } = c;
  const papers = [p.feather, p.cream, p.glass, p.linen, p.icing, p.jamLid];
  const stamps = [p.red, p.blueLight, p.green, p.pin, p.blue, p.yellow];
  const paper = (i: number) => papers[(v + i) % papers.length] as string;
  const stamp = (i: number) => stamps[(v * 2 + i) % stamps.length] as string;
  if (part === 'letters') {
    // four letters standing, the ones behind a little taller, leaning a little
    const sizes = [[42, 46, -4], [40, 42, 3], [44, 38, -2], [42, 34, 2]] as const;
    return sizes
      .map(([w, h, turn], i) => g(`translate(${x + (i - 1.5) * 2} ${y}) rotate(${turn + (v % 3) - 1})`, envelope(c, w, h, paper(i), stamp(i), i === sizes.length - 1)))
      .join('');
  }
  if (part === 'pile') {
    // letters lying one on another, tied with string
    let s = '';
    for (let i = 0; i < 5; i++) s += rect(x - 22 + ((i * 3) % 5) - 2, y - 6 * (i + 1), 44, 6, paper(i), { rx: 1, stroke: p.linenEdge, 'stroke-width': 0.7 });
    return s + rect(x - 2, y - 30, 3, 30, p.twine) + rect(x - 22, y - 16, 46, 2.4, p.twine);
  }
  if (part === 'packet') {
    const w = 40 - (v % 2) * 6;
    const h = 28 + (v % 2) * 4;
    return (
      rect(x - w / 2, y - h, w, h, v % 2 ? p.parcelPale : p.parcel, { rx: 2 }) +
      rect(x - w / 2, y - h, w, h, c.ref('round'), { rx: 2 }) +
      rect(x - 1.5, y - h, 3, h, p.twine) +
      rect(x - w / 2, y - h / 2 - 1.5, w, 3, p.twine) +
      rect(x - w / 2 + 4, y - h + 4, 13, 9, p.feather, { rx: 1 }) +
      circle(x, y - h / 2, 3.6, p.red)
    );
  }
  if (part === 'cards') {
    // postcards leaning on the left side of the pigeonhole: a picture of hills and sky on the front one
    const card = (turn: number, fill: string, picture: boolean) =>
      g(
        `translate(${x - 4} ${y}) rotate(${turn})`,
        rect(-16, -42, 32, 42, fill, { rx: 1.5, stroke: p.linenEdge, 'stroke-width': 0.8 }) +
          (picture ? rect(-13, -39, 26, 24, p.pictureSky) + path('M-13 -15 q8 -12 14 -5 q6 -8 12 -2 L13 -15Z', p.pictureHill) + circle(6, -32, 3, p.pictureSun) : ''),
      );
    return card(-14, paper(2), false) + card(-7, paper(4), false) + card(-2, p.feather, true);
  }
  if (part === 'bundle') {
    // a thick bundle of letters standing, tied crosswise
    let s = rect(x - 21, y - 40, 42, 40, paper(1), { rx: 2 });
    for (let i = 1; i < 8; i++) s += rect(x - 21, y - 40 + i * 5, 42, 1, p.linenEdge, { opacity: 0.8 });
    return s + rect(x - 21, y - 40, 42, 40, c.ref('round'), { rx: 2 }) + rect(x - 1.5, y - 40, 3, 40, p.twine) + rect(x - 21, y - 22, 42, 3, p.twine) + circle(x, y - 21, 3, p.twine);
  }
  // part === 'roll': a newspaper rolled up, lying, with a paper band round it
  return (
    rect(x - 23, y - 15, 46, 15, p.feather, { rx: 7.5 }) +
    rect(x - 23, y - 15, 46, 15, c.ref('round'), { rx: 7.5 }) +
    stroke(`M${x - 18} ${y - 11} l30 0 M${x - 18} ${y - 6} l26 0`, p.typed, 1, { opacity: 0.6 }) +
    rect(x - 4, y - 15, 9, 15, p.postBlue, { opacity: 0.8 }) +
    circle(x + 23 - 7.5, y - 7.5, 5, p.paperShade)
  );
}

export function sortingCase(c: Ctx, m: SortingCase): string {
  const { p } = c;
  const { x, w, top, side, board, table, bottom } = m;
  let s = floorShadow(c, x + w / 2, bottom + 4, w / 2 + 10, 10);
  // the table: its top, two drawers in the apron, turned legs and a bar between them
  const apron = table + 14;
  for (const lx of [x + 6, x + w - 20]) {
    s += rect(lx, apron, 14, bottom - apron, p.wood) + rect(lx - 2, apron + 30, 18, 8, p.woodMid, { rx: 4 }) + rect(lx - 2, bottom - 40, 18, 8, p.woodMid, { rx: 4 });
  }
  s += rect(x + 20, bottom - 30, w - 40, 6, p.woodDark);
  s += rect(x, apron, w, 24, p.wood) + rect(x, apron, w, 24, c.ref('grain'));
  for (const dx of [x + 26, x + w / 2 + 6]) s += rect(dx, apron + 4, w / 2 - 32, 16, p.woodMid, { rx: 2 }) + rect(dx + (w / 2 - 32) / 2 - 7, apron + 10, 14, 4, p.brass, { rx: 2 });
  s += rect(x - 8, table, w + 16, 14, p.woodMid, { rx: 3 }) + rect(x - 8, table, w + 16, 3, p.white, { opacity: 0.14, rx: 1.5 }) + rect(x - 8, table + 11, w + 16, 3, p.black, { opacity: 0.2 });
  // the case: its back, the boards between the pigeonholes, the shelves, the sides
  s += rect(x + 4, top + 6, w, table - top, p.black, { opacity: 0.18, filter: c.ref('soft') });
  s += rect(x, top, w, table - top, p.woodDark) + rect(x + side, top + board, w - 2 * side, table - top - board, p.shelfBack);
  for (let col = 1; col * (m.cell + m.divider) < w - 2 * side; col++) s += rect(x + side + col * (m.cell + m.divider) - m.divider, top, m.divider, table - top, p.wood);
  for (const y of [top, ...m.rows]) s += rect(x, y, w, board, p.woodMid) + rect(x, y + board - 2, w, 2, p.black, { opacity: 0.25 });
  s += rect(x, top, side, table - top, p.woodMid) + rect(x + w - side, top, side, table - top, p.woodMid);
  // the cornice
  s += rect(x - 8, top - 14, w + 16, 9, p.woodMid, { rx: 2 }) + rect(x - 4, top - 6, w + 8, 6, p.woodDark) + rect(x - 8, top - 14, w + 16, 2.5, p.white, { opacity: 0.14 });
  // what waits in the pigeonholes, and a label holder with a blank card under each
  for (const cell of m.cells) if (cell.item.part !== 'bay') s += mail(c, cell.item.part, cell.x + m.cell / 2, cell.y, cell.row * 4 + cell.col);
  const mids = m.cells.map((cell) => [cell.x + m.cell / 2, cell.y] as const);
  return s + rects(mids.map(([mid, y]) => [mid - 11, y + 1.5, 22, 5.5] as const), p.brassDark) + rects(mids.map(([mid, y]) => [mid - 9, y + 2.5, 18, 3.5] as const), p.feather);
}
