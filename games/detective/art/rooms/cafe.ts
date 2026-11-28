// The café, drawn from the measures in core/rooms/cafe.ts: the same numbers place the things to find, so a thing
// always rests on what is drawn here. Afternoon: the sun comes in under the awning, the lamps are off, the espresso
// machine shines, cakes stand under glass, coffee steams on the tables, the dog sleeps on its cushion. Night: the
// café is closed — rain outside, only the lamp over the counter and the two on the wall left on, the cakes put
// away, a little vase on every cleared table, the apron on the coat rail, the cushion empty.
import type { Time } from '../../core/cases.ts';
import { CAFE, CAFE_SILL, cafeShelves } from '../../core/rooms/cafe.ts';
import type { Ctx } from '../defs.ts';
import { amberLamp } from '../furniture/amber-lamp.ts';
import { bistroChair } from '../furniture/bistro-chair.ts';
import { bistroTable, type TableDeco } from '../furniture/bistro-table.ts';
import { cafeCounter } from '../furniture/cafe-counter.ts';
import { cafeShell, cafeShellDefs } from '../furniture/cafe-shell.ts';
import { cafeWindow, cafeWindowDefs } from '../furniture/cafe-window.ts';
import { clock } from '../furniture/clock.ts';
import { coatRail } from '../furniture/coat-rail.ts';
import { cupShelves } from '../furniture/cup-shelves.ts';
import { dogOnCushion } from '../furniture/dog.ts';
import { espressoMachine } from '../furniture/espresso-machine.ts';
import { geranium } from '../furniture/geranium.ts';
import { kilim } from '../furniture/kilim.ts';
import { menuBoard } from '../furniture/menu-board.ts';
import { pastryCase } from '../furniture/pastry-case.ts';
import { piano } from '../furniture/piano.ts';
import { picture } from '../furniture/picture.ts';
import { plant } from '../furniture/plant.ts';
import { sconce } from '../furniture/sconce.ts';
import { floorLight, vignette } from '../furniture/shell.ts';
import { till } from '../furniture/till.ts';

/** The hour on the wall clock: coffee time in the afternoon; late in the evening, long after closing. */
const HOUR: Record<Time, readonly [number, number]> = { day: [15, 20], night: [22, 50] };
/** What stands on each table: coffee and cake by day; at night the tables are cleared, a little vase on each. */
const DECO: Record<Time, readonly TableDeco[]> = { day: ['cup', 'cup', 'cake'], night: ['vase', 'vase', 'vase'] };

export function cafeDefs(c: Ctx): string {
  return cafeShellDefs(c) + cafeWindowDefs(c, CAFE.window);
}

/** Everything behind and under the things to find. */
export function cafeBack(c: Ctx, time: Time): string {
  const m = CAFE;
  const { counter, window: win, tables, chairs } = m;
  const [hours, minutes] = HOUR[time];
  const deco = DECO[time];
  const night = time === 'night';
  // the furniture on the floor, the farthest first
  const onFloor = [
    { foot: m.dog.y, art: dogOnCushion(c, m.dog.x, m.dog.y, !night) },
    ...tables.map((t, i) => ({ foot: t.foot, art: bistroTable(c, t, deco[i] ?? 'vase') })),
    ...chairs.map((ch) => ({ foot: ch.foot, art: bistroChair(c, ch) })),
  ].sort((a, b) => a.foot - b.foot);
  return (
    cafeShell(c, m) +
    floorLight(c, m.floor, win.x, win.x + win.w) +
    kilim(c, m.rug) +
    menuBoard(c, m.menu) +
    cupShelves(c, { ...m.shelves, parts: cafeShelves() }) +
    cafeWindow(c, win) +
    plant(c, win.pots[0], CAFE_SILL) +
    geranium(c, win.pots[1], CAFE_SILL) +
    clock(c, m.clock.x, m.clock.y, hours, minutes) +
    picture(c, m.picture) +
    m.sconces.xs.map((x) => sconce(c, x, m.sconces.y, night)).join('') +
    coatRail(c, m.coatRail) +
    piano(c, m.piano) +
    cafeCounter(c, counter) +
    till(c, counter.till.x, counter.top) +
    espressoMachine(c, counter.machine.x, counter.top) +
    pastryCase(c, counter.showcase, counter.top) +
    // only the lamp over the counter stays on at night
    m.lamps.xs.map((x, i) => amberLamp(c, x, m.lamps.bottom, night && i === 0)).join('') +
    onFloor.map((f) => f.art).join('')
  );
}

/** What lies over everything, things included. */
export function cafeFront(c: Ctx): string {
  return vignette(c);
}
