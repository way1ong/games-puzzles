// The waiting hall of the railway station, drawn from the measures in core/rooms/station.ts: the same
// numbers place the things to find, so a thing always rests on what is drawn here. Day: a train at the
// platform, the ticket window open, the violin in its case, a pigeon. Night: snow over the empty platform,
// the lamps lit, the blind of the ticket window down, the violin case empty, wet footprints past it.
import type { Time } from '../../core/cases.ts';
import { STATION, STATION_SILL } from '../../core/rooms/station.ts';
import type { Ctx } from '../defs.ts';
import { archedWindow, archedWindowDefs } from '../furniture/arched-window.ts';
import { bench } from '../furniture/bench.ts';
import { clock } from '../furniture/clock.ts';
import { footprints } from '../furniture/footprints.ts';
import { globeLamp } from '../furniture/globe-lamp.ts';
import { mailbox } from '../furniture/mailbox.ts';
import { palm } from '../furniture/palm.ts';
import { pigeon } from '../furniture/pigeon.ts';
import { plant } from '../furniture/plant.ts';
import { runner } from '../furniture/runner.ts';
import { floorLight, vignette } from '../furniture/shell.ts';
import { stoneShell } from '../furniture/stone-shell.ts';
import { suitcases } from '../furniture/suitcases.ts';
import { ticketOffice } from '../furniture/ticket-office.ts';
import { timetable } from '../furniture/timetable.ts';
import { violinCase } from '../furniture/violin-case.ts';
import { rect } from '../svg.ts';

/** The hour on the station clock: late morning; ten minutes after the last train. */
const HOUR: Record<Time, readonly [number, number]> = { day: [11, 5], night: [23, 50] };
/** Wet footprints of snow past the violin case, towards the right. */
const STEPS = [[452, 772], [536, 756], [620, 774], [704, 758], [788, 776], [872, 760]] as const;

export function stationDefs(c: Ctx): string {
  return archedWindowDefs(c, STATION.window);
}

/** Everything behind and under the things to find. */
export function stationBack(c: Ctx, time: Time): string {
  const m = STATION;
  const [hours, minutes] = HOUR[time];
  return (
    stoneShell(c, m) +
    floorLight(c, m.floor, m.window.x, m.window.x + m.window.w) +
    runner(c, m.runner) +
    (c.night ? footprints(c, STEPS, false, 78) : '') +
    archedWindow(c, m.window) +
    plant(c, m.window.pot, STATION_SILL) +
    bench(c, m.benchA) +
    palm(c, m.palm.x, m.palm.y) +
    timetable(c, m.board) +
    // the clock hangs from the ceiling on a rod
    rect(m.clock.x - 3, 0, 6, m.clock.y - 50, c.p.brassDark) +
    clock(c, m.clock.x, m.clock.y, hours, minutes) +
    mailbox(c, m.mailbox.x, m.mailbox.y) +
    bench(c, m.benchB) +
    suitcases(c, m.suitcases) +
    ticketOffice(c, { ...m.ticket, bottom: m.skirting }) +
    m.lamps.xs.map((x) => globeLamp(c, x, m.lamps.bottom)).join('') +
    violinCase(c, m.violinCase.x, m.violinCase.y, m.violinCase.half, !c.night) +
    (c.night ? '' : pigeon(c, m.pigeon.x, m.pigeon.y))
  );
}

/** What lies over everything, things included. */
export function stationFront(c: Ctx): string {
  return vignette(c);
}
