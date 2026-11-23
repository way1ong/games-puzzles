// The bakery's shop, drawn from the measures in core/rooms/bakery.ts: the same numbers place the things to
// find, so a thing always rests on what is drawn here. Morning: the shop is open, the lamps are off. Night:
// the door stands ajar, the lamps over the counter burn, floury footprints lead from the counter to the door.
import type { Time } from '../../core/cases.ts';
import { BAKERY, BAKERY_SILL, bakeryRack } from '../../core/rooms/bakery.ts';
import type { Ctx } from '../defs.ts';
import { blackboard } from '../furniture/blackboard.ts';
import { breadRack } from '../furniture/bread-rack.ts';
import { bunBasket } from '../furniture/bun-basket.ts';
import { cafeTable } from '../furniture/cafe-table.ts';
import { cakeStand } from '../furniture/cake-stand.ts';
import { cat } from '../furniture/cat.ts';
import { chair } from '../furniture/chair.ts';
import { clock } from '../furniture/clock.ts';
import { counter } from '../furniture/counter.ts';
import { doormat } from '../furniture/doormat.ts';
import { flourSacks } from '../furniture/flour-sacks.ts';
import { footprints } from '../furniture/footprints.ts';
import { pendantLamp } from '../furniture/pendant-lamp.ts';
import { floorLight, vignette } from '../furniture/shell.ts';
import { shopDoor } from '../furniture/shop-door.ts';
import { shopWindow } from '../furniture/shop-window.ts';
import { tiledShell, tiledShellDefs } from '../furniture/tiled-shell.ts';

/** The hour on the wall clock: the shop has just opened; long after closing. */
const HOUR: Record<Time, readonly [number, number]> = { day: [7, 40], night: [2, 15] };
/** Floury footprints from behind the counter to the door. */
const STEPS = [[838, 676], [786, 694], [730, 682], [676, 702], [618, 690], [562, 708], [512, 694]] as const;

export function bakeryDefs(c: Ctx): string {
  return tiledShellDefs(c, BAKERY);
}

/** Everything behind and under the things to find. */
export function bakeryBack(c: Ctx, time: Time): string {
  const m = BAKERY;
  const [hours, minutes] = HOUR[time];
  return (
    tiledShell(c, m) +
    floorLight(c, m.floor, m.window.x, m.window.x + m.window.w) +
    (c.night ? footprints(c, STEPS, true, -78) : '') +
    doormat(c, m.mat) +
    breadRack(c, { ...m.rack, bottom: m.skirting, parts: bakeryRack(), basket: m.basketOnTop }) +
    shopDoor(c, { ...m.door, bottom: m.floor }, c.night) +
    shopWindow(c, m.window) +
    cakeStand(c, m.cakeStand.x, BAKERY_SILL) +
    bunBasket(c, m.bunBasket.x, BAKERY_SILL, m.bunBasket.half) +
    blackboard(c, m.blackboard) +
    clock(c, m.clock.x, m.clock.y, hours, minutes) +
    m.lamps.xs.map((x) => pendantLamp(c, x, m.lamps.bottom)).join('') +
    flourSacks(c, m.sacks.x, m.sacks.y) +
    cafeTable(c, m.table) +
    chair(c, m.chair) +
    counter(c, m.counter) +
    cat(c, m.cat.x, m.cat.y, true)
  );
}

/** What lies over everything, things included. */
export function bakeryFront(c: Ctx): string {
  return vignette(c);
}
