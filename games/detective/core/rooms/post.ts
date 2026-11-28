// The hall of a small town post office: the measures of the room and its furniture (scene units, 1200 × 800)
// and the places where things can be put. The drawing (art/rooms/post.ts) takes every position from here.
import type { Spot } from '../rooms.ts';

export const POST = {
  /** The wall ends at the skirting board; the floor starts below it. */
  skirting: 545,
  floor: 563,
  /** The top edge of the painted wall boards. */
  rail: 396,
  /** The sorting case on the left: a grid of pigeonholes standing on a sorting table. */
  sorting: {
    x: 22,
    w: 254,
    /** The top board of the case; a cornice sits on it. */
    top: 144,
    side: 10,
    board: 8,
    /** The board between two pigeonholes of a row. */
    divider: 6,
    /** The width of a pigeonhole. */
    cell: 54,
    /** The line of each row of pigeonholes (letters and things stand on it), top to bottom. */
    rows: [212, 280, 348, 416],
    /** Free height in a pigeonhole. */
    headroom: 60,
    /** The top of the sorting table the case stands on (under the case's bottom board). */
    table: 424,
  },
  /** Two mail sacks on the floor before the sorting table: the middle of the standing one and the floor line. */
  sacks: { x: 80, y: 602 },
  /** The front door: the fanlight starts at `top`, the leaf at `leaf`; it ends on the floor line. */
  door: { x: 308, w: 120, top: 116, leaf: 196 },
  /** The doormat in front of the door. */
  mat: { x: 280, y: 590, w: 176, h: 72 },
  /** A bench for waiting, under the stamp poster; its arms reach this far in over the seat. */
  bench: { x: 462, w: 166, seat: 560, foot: 650, arm: 12 },
  poster: { x: 482, y: 168, w: 126, h: 166 },
  /** The tall window over the customers' writing desk. */
  window: { x: 652, y: 60, w: 152, h: 300 },
  /**
   * The street seen through the door and the window: the line the houses across it stand on, the lantern of the
   * street lamp outside the window and of a farther one seen through the door.
   */
  street: { horizon: 330, lamp: { x: 770, y: 196 }, farLamp: { x: 388, y: 298 } },
  /** The customers' writing desk: an inkwell with a pen on a chain stands in the middle of it. */
  desk: { x: 640, w: 176, top: 452, foot: 618, inkwell: { x: 728, half: 20 } },
  /** The post counter runs off the right edge; a glass screen with two service windows stands on it. */
  counter: {
    x: 836,
    top: 440,
    /** Where it stands on the floor. */
    foot: 644,
    /** The left edges of the posts of the glass screen; the service windows are between them. */
    posts: [848, 1022, 1196],
    post: 12,
    /** The top of the screen's cornice. */
    screen: 152,
    /** The letter scales stand in front of the middle post; the stamp box in the second window. */
    scales: { x: 1028, half: 30 },
    stampBox: { x: 1160, half: 24 },
  },
  /** Parcels tied with string, in two stacks on the floor before the counter: [width, height] from the bottom up. */
  parcels: [
    { x: 884, y: 716, boxes: [[96, 46], [84, 40], [74, 34]] },
    { x: 1128, y: 706, boxes: [[92, 44], [78, 38]] },
  ],
  clock: { x: 150, y: 72 },
  /** The emblem of the post (a horn) stands on the screen's cornice over the middle post. */
  emblem: { x: 1028 },
  /** Lamps hanging from the ceiling: where the shade ends. The second one is left on, low, at night. */
  lamps: { xs: [560, 1112], bottom: 112 },
} as const;

/** The sill: the line under the tall window. */
export const POST_SILL = POST.window.y + POST.window.h;

/** The line of the top of each stack of parcels. */
export const PARCEL_TOPS: readonly number[] = POST.parcels.map((stack) => stack.y - stack.boxes.reduce((sum, [, h]) => sum + h, 0));

// ---------- the sorting case: letters and packets in the pigeonholes, free ones for things ----------

export type CasePart =
  | { part: 'letters' | 'pile' | 'packet' | 'cards' | 'bundle' | 'roll' }
  /** A free pigeonhole: a place for a thing. */
  | { part: 'bay'; spot: string };

const mail = (part: 'letters' | 'pile' | 'packet' | 'cards' | 'bundle' | 'roll'): CasePart => ({ part });
const bay = (spot: string): CasePart => ({ part: 'bay', spot });

export const POST_CASE: readonly (readonly CasePart[])[] = [
  [mail('letters'), bay('slot1'), mail('packet'), mail('pile')],
  [mail('cards'), mail('letters'), mail('bundle'), bay('slot2')],
  [bay('slot3'), mail('pile'), bay('slot4'), mail('letters')],
  [mail('packet'), bay('slot5'), mail('letters'), mail('roll')],
];

export interface PlacedCell {
  item: CasePart;
  /** Left edge of the pigeonhole and the line it holds things on. */
  x: number;
  y: number;
  /** Row and column, from the top left. */
  row: number;
  col: number;
}

/** Every pigeonhole with its place: the drawing and the places for things share it. */
export function postCase(): PlacedCell[] {
  const { sorting } = POST;
  const out: PlacedCell[] = [];
  POST_CASE.forEach((cells, row) => {
    const y = sorting.rows[row] as number;
    cells.forEach((item, col) => out.push({ item, x: sorting.x + sorting.side + col * (sorting.cell + sorting.divider), y, row, col }));
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

const { sorting, bench, desk, counter, parcels } = POST;

export const POST_SPOTS: readonly Spot[] = [
  ...postCase().flatMap(({ item, x, y }): Spot[] =>
    item.part === 'bay' ? [{ id: item.spot, kind: 'shelf', where: 'pigeonholes', x: x + sorting.cell / 2, y, w: sorting.cell - 2 * MARGIN, h: sorting.headroom }] : [],
  ),
  // the first service window holds two, the second one; the scales stand between the windows
  { id: 'counter1', kind: 'desk', where: 'postCounter', x: 896, y: counter.top, w: 64, h: 60 },
  { id: 'counter2', kind: 'desk', where: 'postCounter', x: 966, y: counter.top, w: 64, h: 60 },
  { id: 'counter3', kind: 'desk', where: 'postCounter', x: 1090, y: counter.top, w: 64, h: 60 },
  { id: 'desk1', kind: 'desk', where: 'desk', x: 676, y: desk.top, w: 64, h: 56 },
  { id: 'desk2', kind: 'desk', where: 'desk', x: 782, y: desk.top, w: 60, h: 56 },
  { id: 'parcels1', kind: 'top', where: 'parcels', x: parcels[0].x, y: PARCEL_TOPS[0] as number, w: parcels[0].boxes[2][0] - 8, h: 56 },
  { id: 'parcels2', kind: 'top', where: 'parcels', x: parcels[1].x, y: PARCEL_TOPS[1] as number, w: parcels[1].boxes[1][0] - 8, h: 56 },
  // between the arms
  { id: 'bench1', kind: 'seat', where: 'bench', x: bench.x + bench.arm + 32, y: bench.seat, w: 64, h: 50 },
  { id: 'bench2', kind: 'seat', where: 'bench', x: bench.x + bench.w - bench.arm - 32, y: bench.seat, w: 64, h: 50 },
  { id: 'sill1', kind: 'sill', where: 'sill', x: 690, y: POST_SILL, w: 64, h: 60 },
  { id: 'sill2', kind: 'sill', where: 'sill', x: 768, y: POST_SILL, w: 64, h: 60 },
  ground('floor1', 'floor', 60, 690),
  ground('floor2', 'floor', 190, 730),
  ground('floor3', 'floor', 80, 795),
  ground('floor4', 'floor', 320, 760),
  ground('floor5', 'floor', 480, 730),
  ground('floor6', 'floor', 590, 790),
  ground('floor7', 'floor', 720, 700),
  ground('floor8', 'floor', 790, 785),
  ground('floor9', 'floor', 1010, 760),
  ground('floor10', 'floor', 1150, 790),
  ground('mat1', 'mat', 330, 652),
  ground('mat2', 'mat', 406, 652),
];

/** What stands on the floor: a thing on the floor must not be drawn over it. */
export const POST_BLOCKED: readonly { name: string; x1: number; y1: number; x2: number; y2: number }[] = [
  { name: 'mail sacks', x1: POST.sacks.x - 50, y1: POST.sacks.y - 108, x2: POST.sacks.x + 186, y2: POST.sacks.y + 8 },
  { name: 'bench', x1: bench.x - 8, y1: bench.seat - 90, x2: bench.x + bench.w + 8, y2: bench.foot + 4 },
  { name: 'writing desk', x1: desk.x, y1: desk.top, x2: desk.x + desk.w, y2: desk.foot + 4 },
  { name: 'counter', x1: counter.x - 8, y1: counter.top, x2: 1200, y2: counter.foot + 4 },
  ...parcels.map((stack, i) => {
    const bottom = stack.boxes[0][0];
    return { name: `parcels ${i + 1}`, x1: stack.x - bottom / 2 - 4, y1: (PARCEL_TOPS[i] as number) - 14, x2: stack.x + bottom / 2 + 4, y2: stack.y + 4 };
  }),
];
