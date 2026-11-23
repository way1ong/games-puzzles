// The detective's study: the measures of the room and its furniture (scene units, 1200 × 800) and the
// places where things can be put. The drawing (art/rooms/study.ts) takes every position from here.
import type { Spot } from '../rooms.ts';

export const STUDY = {
  /** The wall ends at the skirting board; the floor starts below it. */
  skirting: 545,
  floor: 563,
  /** The rail of the wall panels. */
  rail: 380,
  bookcase: {
    x: 40,
    w: 270,
    top: 140,
    side: 12,
    board: 10,
    /** The line of each shelf (things and books stand on it), top to bottom. */
    rows: [235, 330, 425, 520],
    /** The top board: things on the bookcase stand here. */
    roof: 130,
    /** Where the first book of a row starts. */
    start: 56,
    /** Free height over a shelf. */
    headroom: 78,
  },
  globe: { x: 96 },
  /** Two books lying on top of the bookcase; things can lie on them. */
  booksOnTop: { x: 184, w: 74, top: 106 },
  floorLamp: { x: 340 },
  coatRack: { x: 430 },
  window: { x: 520, y: 70, w: 240, h: 250, plant: 712 },
  clock: { x: 888, y: 140 },
  picture: { x: 838, y: 224, w: 104, h: 80 },
  corkboard: { x: 985, y: 105, w: 185, h: 190 },
  desk: {
    x: 800,
    w: 362,
    top: 452,
    /** Where the legs end on the floor. */
    foot: 642,
    lamp: 850,
    typewriter: 968,
    mug: 1036,
    /** A pile of paper; things can lie on it. */
    papers: { x: 1050, w: 49, top: 441 },
    phone: 1128,
  },
  chair: { x: 1030, seat: 568, half: 58, foot: 686 },
  wastebasket: { x: 762, y: 652 },
  rug: { cx: 600, cy: 712, rx: 310, ry: 62 },
  cat: { x: 560, y: 700 },
} as const;

/** The sill: the line under the window. */
export const STUDY_SILL = STUDY.window.y + STUDY.window.h;

// ---------- the shelves: books, free bays for things, a pile of books, a vase ----------

export type ShelfPart =
  | { part: 'book'; w: number; h: number; colour: number; lean?: number }
  | { part: 'gap'; w: number }
  /** A free place for a thing. */
  | { part: 'bay'; w: number; spot: string }
  | { part: 'pile'; w: number }
  | { part: 'vase'; w: number };

const book = (w: number, h: number, colour: number, lean?: number): ShelfPart =>
  lean === undefined ? { part: 'book', w, h, colour } : { part: 'book', w, h, colour, lean };
const gap = (w: number): ShelfPart => ({ part: 'gap', w });
const bay = (w: number, spot: string): ShelfPart => ({ part: 'bay', w, spot });

/** Between two books standing side by side. */
export const BOOK_GAP = 2;

export const STUDY_SHELVES: readonly (readonly ShelfPart[])[] = [
  // the last book leans on its neighbour: the gap before it is narrower than its lean
  [book(22, 72, 0), book(18, 64, 1), book(26, 78, 2), book(16, 60, 3), book(24, 70, 4), book(20, 66, 5), book(18, 74, 6), gap(14), book(22, 60, 7, -14), gap(2), bay(42, 'shelf1')],
  [book(20, 70, 8), book(24, 76, 9), book(18, 62, 10), gap(2), bay(44, 'shelf2'), gap(4), book(26, 66, 0), book(18, 70, 2), book(20, 74, 3), gap(2), { part: 'pile', w: 50 }],
  [book(24, 74, 5), book(18, 66, 6), gap(2), bay(52, 'shelf3'), gap(4), book(20, 70, 7), book(26, 78, 1), book(16, 62, 4), book(22, 68, 9), gap(8), { part: 'vase', w: 28 }],
  [book(26, 68, 2), book(20, 74, 11), book(24, 62, 0), gap(2), bay(42, 'shelf4'), gap(4), book(18, 70, 3), book(22, 76, 8), book(20, 60, 5), gap(2), bay(46, 'shelf5')],
];

export interface PlacedPart {
  item: ShelfPart;
  /** Left edge of the part and the shelf line it stands on. */
  x: number;
  y: number;
}

/** Every part of every shelf with its place: the drawing and the bays for things share it. */
export function studyShelves(): PlacedPart[] {
  const out: PlacedPart[] = [];
  STUDY_SHELVES.forEach((row, i) => {
    const y = STUDY.bookcase.rows[i] as number;
    let x: number = STUDY.bookcase.start;
    for (const item of row) {
      out.push({ item, x, y });
      x += item.w + (item.part === 'book' ? BOOK_GAP : 0);
    }
  });
  return out;
}

/** Things keep this far from the edges of a place. */
const MARGIN = 2;
/** A thing lying on the floor or on the rug gets this much room. */
const GROUND = { w: 72, h: 62 };

function ground(id: string, kind: 'floor' | 'rug', x: number, y: number): Spot {
  return { id, kind, where: kind, x, y, ...GROUND };
}

export const STUDY_SPOTS: readonly Spot[] = [
  ...studyShelves().flatMap(({ item, x, y }): Spot[] =>
    item.part === 'bay'
      ? [{ id: item.spot, kind: 'shelf', where: 'shelf', x: x + item.w / 2, y, w: item.w - 2 * MARGIN, h: STUDY.bookcase.headroom }]
      : [],
  ),
  { id: 'top1', kind: 'top', where: 'bookcaseTop', x: 150, y: STUDY.bookcase.roof, w: 46, h: 70 },
  { id: 'top2', kind: 'top', where: 'bookcaseTop', x: 284, y: STUDY.bookcase.roof, w: 44, h: 70 },
  {
    id: 'onBooks',
    kind: 'top',
    where: 'bookcaseTop',
    x: STUDY.booksOnTop.x + STUDY.booksOnTop.w / 2,
    y: STUDY.booksOnTop.top,
    w: STUDY.booksOnTop.w - 8,
    h: 40,
  },
  { id: 'sill1', kind: 'sill', where: 'sill', x: 572, y: STUDY_SILL, w: 56, h: 60 },
  { id: 'sill2', kind: 'sill', where: 'sill', x: 646, y: STUDY_SILL, w: 56, h: 60 },
  { id: 'desk1', kind: 'desk', where: 'desk', x: 899, y: STUDY.desk.top, w: 36, h: 60 },
  {
    id: 'desk2',
    kind: 'desk',
    where: 'desk',
    x: STUDY.desk.papers.x + STUDY.desk.papers.w / 2,
    y: STUDY.desk.papers.top,
    w: STUDY.desk.papers.w - 4,
    h: 50,
  },
  { id: 'seat', kind: 'seat', where: 'seat', x: STUDY.chair.x, y: STUDY.chair.seat, w: 90, h: 50 },
  ground('floor1', 'floor', 100, 660),
  ground('floor2', 'floor', 235, 700),
  ground('floor3', 'floor', 150, 770),
  ground('floor4', 'floor', 400, 640),
  ground('floor5', 'floor', 345, 792),
  ground('floor6', 'floor', 690, 632),
  ground('floor7', 'floor', 940, 760),
  ground('floor8', 'floor', 1125, 756),
  ground('floor9', 'floor', 70, 740),
  ground('floor10', 'floor', 250, 782),
  // between the chair and the right leg of the desk: small things only
  { id: 'underDesk', kind: 'floor', where: 'underDesk', x: 1108, y: 622, w: 34, h: 30 },
  ground('rug1', 'rug', 455, 716),
  ground('rug2', 'rug', 690, 748),
  ground('rug3', 'rug', 790, 722),
];

/** What stands on the floor: a thing on the floor must not be drawn over it. */
export const STUDY_BLOCKED: readonly { name: string; x1: number; y1: number; x2: number; y2: number }[] = [
  { name: 'desk pedestal', x1: STUDY.desk.x + 12, y1: STUDY.desk.top, x2: STUDY.desk.x + 132, y2: STUDY.desk.foot },
  { name: 'desk leg', x1: STUDY.desk.x + STUDY.desk.w - 30, y1: STUDY.desk.top, x2: STUDY.desk.x + STUDY.desk.w - 12, y2: STUDY.desk.foot },
  { name: 'chair', x1: STUDY.chair.x - STUDY.chair.half, y1: 505, x2: STUDY.chair.x + STUDY.chair.half, y2: STUDY.chair.foot + 4 },
  { name: 'wastebasket', x1: STUDY.wastebasket.x - 28, y1: STUDY.wastebasket.y - 64, x2: STUDY.wastebasket.x + 28, y2: STUDY.wastebasket.y + 4 },
  { name: 'cat', x1: STUDY.cat.x - 48, y1: STUDY.cat.y - 32, x2: STUDY.cat.x + 60, y2: STUDY.cat.y + 24 },
];
