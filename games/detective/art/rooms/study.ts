// The detective's study, drawn from the measures in core/rooms/study.ts: the same numbers place the things
// to find, so a thing always rests on what is drawn here.
import type { Time } from '../../core/cases.ts';
import { STUDY, studyShelves } from '../../core/rooms/study.ts';
import type { Ctx } from '../defs.ts';
import { bookcase } from '../furniture/bookcase.ts';
import { cat } from '../furniture/cat.ts';
import { chair } from '../furniture/chair.ts';
import { clock } from '../furniture/clock.ts';
import { coatRack } from '../furniture/coat-rack.ts';
import { corkboard } from '../furniture/corkboard.ts';
import { desk } from '../furniture/desk.ts';
import { floorLamp } from '../furniture/floor-lamp.ts';
import { footprints } from '../furniture/footprints.ts';
import { picture } from '../furniture/picture.ts';
import { rug } from '../furniture/rug.ts';
import { floorLight, shell, vignette } from '../furniture/shell.ts';
import { wastebasket } from '../furniture/wastebasket.ts';
import { windowWithCurtains } from '../furniture/window.ts';

/** The hour on the wall clock: a quiet morning, and a quarter to midnight. */
const HOUR: Record<Time, readonly [number, number]> = { day: [10, 10], night: [23, 45] };
/** Wet footprints from the door (off the picture, on the left) to the rug. */
const STEPS = [[120, 760], [170, 735], [230, 742], [285, 716], [348, 722], [410, 698]] as const;

/** Everything behind and under the things to find. */
export function studyBack(c: Ctx, time: Time): string {
  const m = STUDY;
  const [hours, minutes] = HOUR[time];
  return (
    shell(c, m) +
    floorLight(c, m.floor, m.window.x, m.window.x + m.window.w) +
    rug(c, m.rug) +
    bookcase(c, {
      ...m.bookcase,
      bottom: m.skirting,
      parts: studyShelves(),
      globeX: m.globe.x,
      booksOnTop: m.booksOnTop,
    }) +
    floorLamp(c, m.floorLamp.x, m.skirting) +
    windowWithCurtains(c, { ...m.window, rail: m.rail }) +
    coatRack(c, m.coatRack.x, m.skirting) +
    clock(c, m.clock.x, m.clock.y, hours, minutes) +
    picture(c, m.picture) +
    corkboard(c, m.corkboard) +
    wastebasket(c, m.wastebasket.x, m.wastebasket.y) +
    desk(c, m.desk) +
    chair(c, m.chair) +
    cat(c, m.cat.x, m.cat.y) +
    (c.night ? footprints(c, STEPS) : '')
  );
}

/** What lies over everything, things included. */
export function studyFront(c: Ctx): string {
  return vignette(c);
}
