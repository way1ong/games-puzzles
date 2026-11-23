// Putting things into a room: only on the room's places, each on a place of a kind where it looks right and
// where it fits, one thing per place. Random choices come from the seed.
import { nextInt, nextRandom } from '../../../shared/core/rng.ts';
import { LEDGES, type Spot } from './rooms.ts';
import { sizeOf, type ThingId } from './things.ts';

export interface Placed {
  thing: ThingId;
  spot: string;
  /** Middle of the thing's bottom edge, scene units; degrees of turn. */
  x: number;
  y: number;
  rot: number;
}

export function canHold(spot: Spot, thing: ThingId): boolean {
  const size = sizeOf(thing);
  return size.on.includes(spot.kind) && size.w <= spot.w && size.h <= spot.h;
}

/** A thing in the middle of a place, straight (hand-made cases; `dx` moves it within the place). */
export function putOn(spot: Spot, thing: ThingId, dx = 0, rot = 0): Placed {
  return { thing, spot: spot.id, x: spot.x + dx, y: spot.y, rot };
}

const TRIES = 60;

/** Places for all the things, in the order of `things`. */
export function place(things: readonly ThingId[], spots: readonly Spot[], seed: number): Placed[] {
  let state = seed >>> 0;
  // The things with the fewest possible places choose first.
  const order = things
    .map((thing, i) => ({ thing, i, choices: spots.filter((s) => canHold(s, thing)).length }))
    .sort((a, b) => a.choices - b.choices || a.i - b.i);

  for (let attempt = 0; attempt < TRIES; attempt++) {
    const shuffled = spots.slice();
    for (let i = shuffled.length - 1; i > 0; i--) {
      const pick = nextInt(state, i + 1);
      state = pick.state;
      [shuffled[i], shuffled[pick.value]] = [shuffled[pick.value] as Spot, shuffled[i] as Spot];
    }
    const used = new Set<string>();
    const out: (Placed | undefined)[] = things.map(() => undefined);
    let ok = true;
    for (const { thing, i } of order) {
      const spot = shuffled.find((s) => !used.has(s.id) && canHold(s, thing));
      if (!spot) {
        ok = false;
        break;
      }
      used.add(spot.id);
      const size = sizeOf(thing);
      const slide = nextRandom(state);
      const turn = nextRandom(slide.state);
      state = turn.state;
      const room = (spot.w - size.w) / 2;
      const dx = Math.round((slide.value * 2 - 1) * room);
      const rot = LEDGES.includes(spot.kind) ? 0 : Math.round((turn.value * 2 - 1) * size.turn);
      out[i] = putOn(spot, thing, dx, rot);
    }
    if (ok) return out as Placed[];
  }
  throw new Error(`No places for the things: ${things.join(', ')}`);
}

/** What is wrong with a set of placed things; empty — all right. */
export function placementProblems(placed: readonly Placed[], spots: readonly Spot[]): string[] {
  const problems: string[] = [];
  const byId = new Map(spots.map((s) => [s.id, s]));
  const used = new Set<string>();
  const things = new Set<ThingId>();
  for (const p of placed) {
    const spot = byId.get(p.spot);
    if (!spot) {
      problems.push(`${p.thing}: no place "${p.spot}" in the room`);
      continue;
    }
    if (used.has(spot.id)) problems.push(`${p.thing}: the place ${spot.id} is taken twice`);
    used.add(spot.id);
    if (things.has(p.thing)) problems.push(`${p.thing}: twice in the room`);
    things.add(p.thing);
    const size = sizeOf(p.thing);
    if (!canHold(spot, p.thing)) problems.push(`${p.thing}: does not belong on ${spot.id} (${spot.kind}, ${spot.w} × ${spot.h})`);
    if (p.y !== spot.y) problems.push(`${p.thing}: not on the line of ${spot.id} — it would hang in the air`);
    if (Math.abs(p.x - spot.x) > (spot.w - size.w) / 2) problems.push(`${p.thing}: sticks out of ${spot.id}`);
    if (LEDGES.includes(spot.kind) && p.rot !== 0) problems.push(`${p.thing}: turned on a ledge`);
    if (Math.abs(p.rot) > size.turn) problems.push(`${p.thing}: turned too far`);
  }
  return problems;
}

/** The thing under a point: the nearest thing not found yet whose box, widened by `tolerance`, holds it. */
export function thingAt(placed: readonly Placed[], found: readonly ThingId[], x: number, y: number, tolerance: number): Placed | null {
  let best: Placed | null = null;
  let bestDistance = Infinity;
  for (const p of placed) {
    if (found.includes(p.thing)) continue;
    const size = sizeOf(p.thing);
    const cy = p.y - size.h / 2;
    if (Math.abs(x - p.x) > size.w / 2 + tolerance || Math.abs(y - cy) > size.h / 2 + tolerance) continue;
    const distance = Math.hypot(x - p.x, y - cy);
    if (distance < bestDistance) {
      best = p;
      bestDistance = distance;
    }
  }
  return best;
}
