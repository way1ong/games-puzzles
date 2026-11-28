// The café: the measures of the room and its furniture (scene units, 1200 × 800) and the places where things
// can be put. The drawing (art/rooms/cafe.ts) takes every position from here.
import type { Spot } from '../rooms.ts';

export const CAFE = {
  /** The wall ends at the skirting board; the floor starts below it. */
  skirting: 545,
  floor: 563,
  /** The top of the panelling. */
  rail: 410,
  /** The board with the menu drawn in chalk (no words), over the shelves. */
  menu: { x: 70, y: 22, w: 250, h: 84 },
  /** Shelves on the wall behind the counter: cups, jars and coffee tins, and free bays for things. */
  shelves: {
    x: 10,
    w: 408,
    board: 10,
    /** The line of each shelf (things stand on it), top to bottom. */
    rows: [192, 286],
    /** Where the first thing of a row starts. */
    start: 22,
    /** Free height over a shelf. */
    headroom: 72,
  },
  /** The counter runs off the left edge of the picture. */
  counter: {
    /** Its right end. */
    end: 440,
    top: 444,
    /** Where it stands on the floor. */
    foot: 640,
    /** The till and the espresso machine: their middles, and how far they reach to the left and to the right (the till's crank, the machine's steam wand). */
    till: { x: 46, left: 38, right: 32 },
    machine: { x: 206, left: 60, right: 68 },
    /** The glass case of cakes; things can stand on its top. */
    showcase: { x: 338, w: 100, top: 366 },
  },
  /** The front window to the street; a flower pot stands at each end of its sill, its leaves reaching this far. */
  window: { x: 488, y: 60, w: 352, h: 344, pots: [522, 806], potReach: 32 },
  /** A coat rail on the wall between the window and the piano: its board, its three hooks, where what hangs on it ends. */
  coatRail: { x: 860, y: 196, w: 80, hooks: [874, 900, 926], bottom: 354 },
  /** The upright piano; a metronome and a little vase of flowers stand on its top. */
  piano: { x: 942, w: 250, top: 354, keys: 454, foot: 596, metronome: { x: 982, reach: 17 }, vase: { x: 1166, reach: 18 } },
  clock: { x: 1067, y: 150 },
  /** A small landscape in a frame, over the coat rail. */
  picture: { x: 872, y: 52, w: 104, h: 80 },
  /** Two lamps on the wall over the piano: where the arm meets the wall; their shades reach this far to each side. */
  sconces: { xs: [978, 1156], y: 236, reach: 20 },
  /** Lamps hanging from the ceiling (over the counter and the two tables at the window): where the glass ends, half its width. */
  lamps: { xs: [430, 556, 778], bottom: 150, reach: 30 },
  /**
   * Small round tables: the line of the top (the middle of the round top, seen a little from above), half its width,
   * where the feet stand, where a cup or a slice of cake (by day) or a little vase (at night) stands on it. Two stand
   * at the window, one a little nearer in the corner by the piano — so a little larger: its top lower in the picture,
   * its feet nearer the viewer.
   */
  tables: [
    { x: 556, top: 522, half: 52, foot: 676, deco: 590 },
    { x: 778, top: 522, half: 52, foot: 676, deco: 744 },
    { x: 1004, top: 550, half: 60, foot: 726, deco: 1042 },
  ],
  /** A bentwood chair by each table, on its right: the line of its round seat, half its width, its feet, how high its back rises. */
  chairs: [
    { x: 656, seat: 588, half: 42, foot: 702, back: 112 },
    { x: 876, seat: 588, half: 42, foot: 702, back: 112 },
    { x: 1116, seat: 606, half: 45, foot: 728, back: 120 },
  ],
  /** A woven rug in the corner by the piano, under the third table and its chair. */
  rug: { x: 920, y: 640, w: 276, h: 158 },
  /** The café's dog asleep on its cushion (by day; at night the cushion is empty). */
  dog: { x: 176, y: 708 },
} as const;

/** The sill: the line under the window. */
export const CAFE_SILL = CAFE.window.y + CAFE.window.h;

/** The feet of a table reach this far to each side of its column, as a share of half its top. */
export const TABLE_SPREAD = 0.68;
/** What stands on a table (a cup, a plate of cake, a little vase) reaches this far to each side of its middle. */
export const TABLE_DECO = 17;

// ---------- the shelves: cups, jars, tins, free bays for things ----------

export type CafeShelfPart =
  | { part: 'cups' | 'stack' | 'jar' | 'tin' | 'teapot' | 'jug' | 'plates'; w: number }
  | { part: 'gap'; w: number }
  /** A free place for a thing. */
  | { part: 'bay'; w: number; spot: string };

type Ware = 'cups' | 'stack' | 'jar' | 'tin' | 'teapot' | 'jug' | 'plates';
const ware = (part: Ware, w: number): CafeShelfPart => ({ part, w });
const gap = (w: number): CafeShelfPart => ({ part: 'gap', w });
const bay = (w: number, spot: string): CafeShelfPart => ({ part: 'bay', w, spot });

export const CAFE_SHELVES: readonly (readonly CafeShelfPart[])[] = [
  [ware('tin', 34), gap(4), ware('tin', 34), gap(8), bay(58, 'shelf1'), gap(8), ware('cups', 96), gap(8), bay(58, 'shelf2'), gap(8), ware('jar', 32), gap(4), ware('jar', 32)],
  [ware('plates', 46), gap(8), bay(58, 'shelf3'), gap(8), ware('teapot', 56), gap(8), bay(58, 'shelf4'), gap(8), ware('stack', 32), gap(8), bay(56, 'shelf5'), gap(6), ware('jug', 28)],
];

export interface PlacedShelfPart {
  item: CafeShelfPart;
  /** Left edge of the part and the shelf line it stands on. */
  x: number;
  y: number;
}

/** Every part of every shelf with its place: the drawing and the bays for things share it. */
export function cafeShelves(): PlacedShelfPart[] {
  const out: PlacedShelfPart[] = [];
  CAFE_SHELVES.forEach((row, i) => {
    const y = CAFE.shelves.rows[i] as number;
    let x: number = CAFE.shelves.start;
    for (const item of row) {
      out.push({ item, x, y });
      x += item.w;
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

const { counter, piano, tables, chairs } = CAFE;
const [t1, t2, t3] = tables;
const [c1, c2, c3] = chairs;

export const CAFE_SPOTS: readonly Spot[] = [
  ...cafeShelves().flatMap(({ item, x, y }): Spot[] =>
    item.part === 'bay' ? [{ id: item.spot, kind: 'shelf', where: 'shelf', x: x + item.w / 2, y, w: item.w - 2 * MARGIN, h: CAFE.shelves.headroom }] : [],
  ),
  // between the till and the machine, and between the machine and the glass case
  { id: 'counter1', kind: 'desk', where: 'counter', x: 112, y: counter.top, w: 60, h: 60 },
  { id: 'counter2', kind: 'desk', where: 'counter', x: 306, y: counter.top, w: 60, h: 60 },
  { id: 'showcase1', kind: 'top', where: 'showcase', x: counter.showcase.x + counter.showcase.w / 2, y: counter.showcase.top, w: 64, h: 56 },
  // on each table, beside what stands on it
  { id: 'table1', kind: 'desk', where: 'table', x: 540, y: t1.top, w: 64, h: 60 },
  { id: 'table2', kind: 'desk', where: 'table', x: 794, y: t2.top, w: 64, h: 60 },
  { id: 'table3', kind: 'desk', where: 'table', x: 986, y: t3.top, w: 64, h: 60 },
  { id: 'seat1', kind: 'seat', where: 'seat', x: c1.x, y: c1.seat, w: 72, h: 50 },
  { id: 'seat2', kind: 'seat', where: 'seat', x: c2.x, y: c2.seat, w: 72, h: 50 },
  { id: 'seat3', kind: 'seat', where: 'seat', x: c3.x, y: c3.seat, w: 72, h: 50 },
  // between the two flower pots
  { id: 'sill1', kind: 'sill', where: 'sill', x: 604, y: CAFE_SILL, w: 64, h: 60 },
  { id: 'sill2', kind: 'sill', where: 'sill', x: 720, y: CAFE_SILL, w: 64, h: 60 },
  // between the metronome and the vase
  { id: 'piano1', kind: 'top', where: 'piano', x: 1036, y: piano.top, w: 60, h: 60 },
  { id: 'piano2', kind: 'top', where: 'piano', x: 1102, y: piano.top, w: 60, h: 60 },
  ground('floor1', 'floor', 44, 712),
  ground('floor2', 'floor', 40, 798),
  ground('floor3', 'floor', 176, 798),
  ground('floor4', 'floor', 310, 716),
  ground('floor5', 'floor', 330, 798),
  ground('floor6', 'floor', 450, 712),
  ground('floor7', 'floor', 470, 798),
  ground('floor8', 'floor', 600, 784),
  ground('floor9', 'floor', 730, 790),
  ground('floor10', 'floor', 860, 780),
  // on the front of the rug, before the table and the chair standing on it
  ground('rug1', 'rug', 996, 796),
  ground('rug2', 'rug', 1146, 796),
];

/** What stands on the floor: a thing on the floor must not be drawn over it. */
export const CAFE_BLOCKED: readonly { name: string; x1: number; y1: number; x2: number; y2: number }[] = [
  { name: 'counter', x1: 0, y1: counter.top, x2: counter.end + 8, y2: counter.foot + 4 },
  { name: 'dog', x1: CAFE.dog.x - 86, y1: CAFE.dog.y - 56, x2: CAFE.dog.x + 86, y2: CAFE.dog.y + 22 },
  // a table from its round top down to its feet
  ...tables.map((t, i) => ({ name: `table ${i + 1}`, x1: t.x - t.half, y1: t.top, x2: t.x + t.half, y2: t.foot + 8 })),
  // the legs of a chair splay a little beyond its seat
  ...chairs.map((c, i) => ({ name: `chair ${i + 1}`, x1: c.x - c.half - 2, y1: c.seat - c.back - 4, x2: c.x + c.half + 2, y2: c.foot + 4 })),
  { name: 'piano', x1: piano.x, y1: piano.top, x2: piano.x + piano.w, y2: piano.foot + 4 },
];
