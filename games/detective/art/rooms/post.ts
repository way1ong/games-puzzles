// The hall of a small town post office, drawn from the measures in core/rooms/post.ts: the same numbers place the
// things to find, so a thing always rests on what is drawn here. Day: sun through the tall window, the lamps off, the
// first service window open, letters in the pigeonholes, parcels waiting. Night: closed — the blinds of the service
// windows down, one lamp left on low, fog in the street with the street lamps glowing in it, damp footprints from
// the door.
import { DETECTIVE } from '../../config.ts';
import type { Time } from '../../core/cases.ts';
import { POST, postCase } from '../../core/rooms/post.ts';
import type { Ctx } from '../defs.ts';
import { bellLamp } from '../furniture/bell-lamp.ts';
import { boardedShell, boardedShellDefs } from '../furniture/boarded-shell.ts';
import { clock } from '../furniture/clock.ts';
import { doormat } from '../furniture/doormat.ts';
import { footprints } from '../furniture/footprints.ts';
import { letterScales } from '../furniture/letter-scales.ts';
import { mailSacks } from '../furniture/mail-sacks.ts';
import { parcelStack } from '../furniture/parcels.ts';
import { postCounter } from '../furniture/post-counter.ts';
import { postDoor, postDoorGlass } from '../furniture/post-door.ts';
import { postEmblem } from '../furniture/post-horn.ts';
import { sashGlass, sashWindow } from '../furniture/sash-window.ts';
import { floorLight, vignette } from '../furniture/shell.ts';
import { sortingCase } from '../furniture/sorting-case.ts';
import { stampBox } from '../furniture/stamp-box.ts';
import { stampPoster } from '../furniture/stamp-poster.ts';
import { fogLight, streetView } from '../furniture/street-view.ts';
import { waitingBench } from '../furniture/waiting-bench.ts';
import { writingDesk } from '../furniture/writing-desk.ts';
import { el, g, path } from '../svg.ts';

/** The hour on the wall clock: a busy morning; deep in the night. */
const HOUR: Record<Time, readonly [number, number]> = { day: [10, 25], night: [1, 40] };
/** Damp footprints from the doormat towards the counter. */
const STEPS = [[476, 704], [548, 720], [620, 706], [692, 724], [764, 710]] as const;

const door = { ...POST.door, bottom: POST.floor };

export function postDefs(c: Ctx): string {
  const glass = [...postDoorGlass(door), sashGlass(POST.window)].map((d) => path(d, c.p.white)).join('');
  return boardedShellDefs(c) + el('clipPath', { id: c.id('street') }, glass);
}

/** Everything behind and under the things to find. */
export function postBack(c: Ctx, time: Time): string {
  const m = POST;
  const [hours, minutes] = HOUR[time];
  const { window: win, counter } = m;
  const street = { x1: door.x - 14, x2: win.x + win.w + 14, top: door.top - 14, bottom: m.floor, ...m.street };
  return (
    boardedShell(c, m) +
    g({ 'clip-path': c.ref('street') }, streetView(c, street)) +
    (c.night ? fogLight(c, m.floor, win.x, win.x + win.w, DETECTIVE.scene.height) : floorLight(c, m.floor, win.x, win.x + win.w)) +
    (c.night ? footprints(c, STEPS, false, 78) : '') +
    doormat(c, m.mat) +
    sortingCase(c, { ...m.sorting, bottom: m.skirting, cells: postCase() }) +
    mailSacks(c, m.sacks.x, m.sacks.y) +
    clock(c, m.clock.x, m.clock.y, hours, minutes) +
    postDoor(c, door) +
    stampPoster(c, m.poster) +
    waitingBench(c, m.bench) +
    sashWindow(c, win) +
    writingDesk(c, m.desk) +
    postCounter(c, counter) +
    postEmblem(c, m.emblem.x, counter.screen) +
    letterScales(c, counter.scales.x, counter.top, !c.night) +
    stampBox(c, counter.stampBox.x, counter.top) +
    m.parcels.map((stack, i) => parcelStack(c, stack.x, stack.y, stack.boxes, i)).join('') +
    m.lamps.xs.map((x, i) => bellLamp(c, x, m.lamps.bottom, c.night && i === m.lamps.xs.length - 1)).join('')
  );
}

/** What lies over everything, things included. */
export function postFront(c: Ctx): string {
  return vignette(c);
}
