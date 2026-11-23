// The bakery's shop: the measures of the room and its furniture (scene units, 1200 × 800) and the places
// where things can be put. The drawing (art/rooms/bakery.ts) takes every position from here.
import type { Spot } from '../rooms.ts';

export const BAKERY = {
  /** The wall ends at the skirting board; the floor starts below it. */
  skirting: 545,
  floor: 563,
  /** The top edge of the wall tiles. */
  rail: 380,
  /** The bread rack on the left. */
  rack: {
    x: 36,
    w: 264,
    top: 150,
    side: 12,
    board: 10,
    /** The line of each shelf (bread and things stand on it), top to bottom. */
    rows: [240, 332, 424, 516],
    /** The top board: things on the rack stand here. */
    roof: 140,
    /** Where the first thing of a row starts. */
    start: 52,
    /** Free height over a shelf. */
    headroom: 76,
  },
  /** A basket of baguettes on top of the rack. */
  basketOnTop: { x: 58, w: 92 },
  /** The shop door: closed by day, ajar at night. */
  door: { x: 328, w: 140, top: 112 },
  /** The doormat in front of the door. */
  mat: { x: 300, y: 590, w: 204, h: 76 },
  window: { x: 524, y: 84, w: 266, h: 236 },
  /** On the sill: a cake stand (the prize pie stood here) and a basket of buns. */
  cakeStand: { x: 560, half: 36 },
  bunBasket: { x: 760, half: 32 },
  /** Two sacks of flour under the window. */
  sacks: { x: 538, y: 612 },
  /** A round café table with a cup on it, and a chair. */
  table: { x: 640, top: 506, half: 56, foot: 664, cup: 680 },
  chair: { x: 765, seat: 572, half: 52, foot: 684 },
  /** The counter runs off the right edge of the picture. */
  counter: {
    x: 850,
    top: 436,
    /** Where it stands on the floor. */
    foot: 640,
    /** The glass case with pastries; things can stand on its top. */
    showcase: { x: 944, w: 146, top: 372 },
    scales: 1128,
  },
  blackboard: { x: 866, y: 150, w: 140, h: 120 },
  clock: { x: 1096, y: 210 },
  /** Lamps hanging over the counter: where the shade ends. */
  lamps: { xs: [846, 1165], bottom: 140 },
  cat: { x: 1012, y: 706 },
} as const;

/** The sill: the line under the shop window. */
export const BAKERY_SILL = BAKERY.window.y + BAKERY.window.h;

// ---------- the rack: bread, jars, free bays for things ----------

export type RackPart =
  | { part: 'loaf' | 'tin' | 'buns' | 'jar'; w: number }
  | { part: 'gap'; w: number }
  /** A free place for a thing. */
  | { part: 'bay'; w: number; spot: string };

const bread = (part: 'loaf' | 'tin' | 'buns' | 'jar', w: number): RackPart => ({ part, w });
const gap = (w: number): RackPart => ({ part: 'gap', w });
const bay = (w: number, spot: string): RackPart => ({ part: 'bay', w, spot });

export const BAKERY_RACK: readonly (readonly RackPart[])[] = [
  [bread('loaf', 58), gap(6), bread('tin', 56), gap(6), bay(48, 'rack1'), gap(6), bread('jar', 22), gap(4), bread('jar', 22)],
  [bay(50, 'rack2'), gap(6), bread('buns', 70), gap(6), bread('loaf', 58), gap(6), bread('jar', 24)],
  [bread('tin', 56), gap(6), bread('loaf', 58), gap(6), bay(56, 'rack3'), gap(6), bread('buns', 44)],
  [bay(48, 'rack4'), gap(6), bread('tin', 56), gap(6), bay(52, 'rack5'), gap(6), bread('loaf', 58)],
];

export interface PlacedRackPart {
  item: RackPart;
  /** Left edge of the part and the shelf line it stands on. */
  x: number;
  y: number;
}

/** Every part of every shelf with its place: the drawing and the bays for things share it. */
export function bakeryRack(): PlacedRackPart[] {
  const out: PlacedRackPart[] = [];
  BAKERY_RACK.forEach((row, i) => {
    const y = BAKERY.rack.rows[i] as number;
    let x: number = BAKERY.rack.start;
    for (const item of row) {
      out.push({ item, x, y });
      x += item.w;
    }
  });
  return out;
}

/** Things keep this far from the edges of a place. */
const MARGIN = 2;
/** A thing lying on the floor or on the mat gets this much room. */
const GROUND = { w: 72, h: 62 };

function ground(id: string, where: 'floor' | 'mat', x: number, y: number): Spot {
  return { id, kind: where === 'mat' ? 'rug' : 'floor', where, x, y, ...GROUND };
}

const { rack, counter, table, chair } = BAKERY;

export const BAKERY_SPOTS: readonly Spot[] = [
  ...bakeryRack().flatMap(({ item, x, y }): Spot[] =>
    item.part === 'bay' ? [{ id: item.spot, kind: 'shelf', where: 'shelf', x: x + item.w / 2, y, w: item.w - 2 * MARGIN, h: rack.headroom }] : [],
  ),
  { id: 'rackTop1', kind: 'top', where: 'rackTop', x: 190, y: rack.roof, w: 60, h: 70 },
  { id: 'rackTop2', kind: 'top', where: 'rackTop', x: 262, y: rack.roof, w: 56, h: 70 },
  { id: 'sill1', kind: 'sill', where: 'sill', x: 634, y: BAKERY_SILL, w: 64, h: 60 },
  { id: 'sill2', kind: 'sill', where: 'sill', x: 698, y: BAKERY_SILL, w: 50, h: 60 },
  { id: 'table1', kind: 'desk', where: 'table', x: 626, y: table.top, w: 72, h: 60 },
  { id: 'seat', kind: 'seat', where: 'seat', x: chair.x, y: chair.seat, w: 84, h: 50 },
  { id: 'counter1', kind: 'desk', where: 'counter', x: 896, y: counter.top, w: 72, h: 60 },
  // between the scales and the edge of the picture: small things only
  { id: 'counter2', kind: 'desk', where: 'counter', x: 1178, y: counter.top, w: 38, h: 50 },
  { id: 'showcase1', kind: 'top', where: 'showcase', x: 982, y: counter.showcase.top, w: 64, h: 56 },
  { id: 'showcase2', kind: 'top', where: 'showcase', x: 1052, y: counter.showcase.top, w: 64, h: 56 },
  ground('floor1', 'floor', 90, 650),
  ground('floor2', 'floor', 210, 690),
  ground('floor3', 'floor', 120, 770),
  ground('floor4', 'floor', 560, 702),
  ground('floor5', 'floor', 330, 760),
  ground('floor6', 'floor', 470, 738),
  ground('floor7', 'floor', 690, 762),
  ground('floor8', 'floor', 872, 752),
  ground('floor9', 'floor', 1130, 760),
  ground('floor10', 'floor', 250, 792),
  ground('floor11', 'floor', 1010, 798),
  ground('mat1', 'mat', 352, 652),
  ground('mat2', 'mat', 452, 652),
];

/** What stands on the floor: a thing on the floor must not be drawn over it. */
export const BAKERY_BLOCKED: readonly { name: string; x1: number; y1: number; x2: number; y2: number }[] = [
  { name: 'sacks', x1: BAKERY.sacks.x - 50, y1: BAKERY.sacks.y - 96, x2: BAKERY.sacks.x + 48, y2: BAKERY.sacks.y + 4 },
  { name: 'table', x1: table.x - 36, y1: table.top, x2: table.x + 36, y2: table.foot + 8 },
  { name: 'chair', x1: chair.x - chair.half, y1: chair.seat - 62, x2: chair.x + chair.half, y2: chair.foot + 4 },
  { name: 'counter', x1: counter.x, y1: counter.top, x2: 1200, y2: counter.foot + 4 },
  { name: 'cat', x1: BAKERY.cat.x - 50, y1: BAKERY.cat.y - 32, x2: BAKERY.cat.x + 60, y2: BAKERY.cat.y + 24 },
];
