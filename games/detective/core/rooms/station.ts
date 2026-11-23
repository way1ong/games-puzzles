// The waiting hall of the railway station: the measures of the room and its furniture (scene units,
// 1200 × 800) and the places where things can be put. The drawing (art/rooms/station.ts) takes every
// position from here.
import type { Spot } from '../rooms.ts';

export const STATION = {
  /** The wall ends at the skirting board; the floor starts below it. */
  skirting: 545,
  floor: 563,
  /** The top edge of the wall panels. */
  rail: 400,
  /** The arched window to the platform; a flower pot stands in the middle of its sill. */
  window: { x: 70, y: 80, w: 260, h: 360, pot: 200 },
  /** The bench under the window and the bench under the timetable. */
  benchA: { x: 80, w: 240, seat: 560, foot: 652 },
  benchB: { x: 452, w: 236, seat: 560, foot: 652 },
  palm: { x: 392, y: 606 },
  /** The timetable board. */
  board: { x: 470, y: 130, w: 200, h: 170 },
  clock: { x: 770, y: 170 },
  mailbox: { x: 784, y: 300 },
  /** Two suitcases just alike, lying side by side; things can lie on their tops. */
  suitcases: { xs: [742, 826], y: 640, w: 76, h: 40 },
  /** The ticket office: the ledge under its window is a place for things; a bell stands in the middle. */
  ticket: { x: 900, w: 280, top: 150, ledge: 430, bell: 1040 },
  /** The carpet runner along the hall. */
  runner: { x: 250, y: 660, w: 700, h: 76 },
  /** The musician's violin case, open on the floor. */
  violinCase: { x: 1070, y: 788, half: 80 },
  /** A pigeon that walks in by day. */
  pigeon: { x: 210, y: 702 },
  /** Lamps hanging from the ceiling: where the globe ends. */
  lamps: { xs: [400, 860], bottom: 104 },
} as const;

/** The sill: the line under the window to the platform. */
export const STATION_SILL = STATION.window.y + STATION.window.h;
/** The line of the suitcases' tops. */
export const SUITCASE_TOP = STATION.suitcases.y - STATION.suitcases.h;

/** A thing lying on the floor or on the runner gets this much room. */
const GROUND = { w: 72, h: 62 };

function ground(id: string, where: 'floor' | 'runner', x: number, y: number): Spot {
  return { id, kind: where === 'runner' ? 'rug' : 'floor', where, x, y, ...GROUND };
}

const { benchA, benchB, ticket, suitcases, runner } = STATION;

export const STATION_SPOTS: readonly Spot[] = [
  { id: 'sill1', kind: 'sill', where: 'sill', x: 128, y: STATION_SILL, w: 64, h: 56 },
  { id: 'sill2', kind: 'sill', where: 'sill', x: 272, y: STATION_SILL, w: 64, h: 56 },
  { id: 'benchA1', kind: 'seat', where: 'bench', x: 140, y: benchA.seat, w: 84, h: 50 },
  { id: 'benchA2', kind: 'seat', where: 'bench', x: 262, y: benchA.seat, w: 84, h: 50 },
  { id: 'benchB1', kind: 'seat', where: 'bench', x: 512, y: benchB.seat, w: 84, h: 50 },
  { id: 'benchB2', kind: 'seat', where: 'bench', x: 628, y: benchB.seat, w: 84, h: 50 },
  { id: 'case1', kind: 'top', where: 'suitcase', x: suitcases.xs[0], y: SUITCASE_TOP, w: suitcases.w - 8, h: 56 },
  { id: 'case2', kind: 'top', where: 'suitcase', x: suitcases.xs[1], y: SUITCASE_TOP, w: suitcases.w - 8, h: 56 },
  { id: 'ticket1', kind: 'desk', where: 'ticketDesk', x: 972, y: ticket.ledge, w: 64, h: 50 },
  { id: 'ticket2', kind: 'desk', where: 'ticketDesk', x: 1108, y: ticket.ledge, w: 64, h: 50 },
  ground('floor1', 'floor', 40, 700),
  ground('floor2', 'floor', 120, 792),
  ground('floor3', 'floor', 300, 800),
  ground('floor4', 'floor', 460, 798),
  ground('floor5', 'floor', 640, 800),
  ground('floor6', 'floor', 820, 798),
  ground('floor7', 'floor', 1010, 650),
  ground('floor8', 'floor', 1150, 672),
  ground('floor9', 'floor', 940, 800),
  ground('rug1', 'runner', 330, runner.y + runner.h - 10),
  ground('rug2', 'runner', 560, runner.y + runner.h - 10),
  ground('rug3', 'runner', 800, runner.y + runner.h - 10),
];

/** What stands on the floor: a thing on the floor must not be drawn over it. */
export const STATION_BLOCKED: readonly { name: string; x1: number; y1: number; x2: number; y2: number }[] = [
  { name: 'bench under the window', x1: benchA.x, y1: benchA.seat - 80, x2: benchA.x + benchA.w, y2: benchA.foot + 4 },
  { name: 'palm', x1: STATION.palm.x - 34, y1: STATION.palm.y - 60, x2: STATION.palm.x + 34, y2: STATION.palm.y + 4 },
  { name: 'bench under the timetable', x1: benchB.x, y1: benchB.seat - 80, x2: benchB.x + benchB.w, y2: benchB.foot + 4 },
  { name: 'suitcases', x1: suitcases.xs[0] - suitcases.w / 2, y1: SUITCASE_TOP - 14, x2: suitcases.xs[1] + suitcases.w / 2, y2: suitcases.y + 4 },
  { name: 'violin case', x1: STATION.violinCase.x - STATION.violinCase.half, y1: STATION.violinCase.y - 72, x2: STATION.violinCase.x + STATION.violinCase.half, y2: STATION.violinCase.y + 4 },
  { name: 'pigeon', x1: STATION.pigeon.x - 26, y1: STATION.pigeon.y - 30, x2: STATION.pigeon.x + 30, y2: STATION.pigeon.y + 4 },
];
