import { describe, expect, it } from 'vitest';
import { nextInt } from '../../../shared/core/rng.ts';
import { DETECTIVE } from '../config.ts';
import { on } from './cases.ts';
import { place, placementProblems, thingAt } from './placement.ts';
import { ROOM_IDS, SPOTS } from './rooms.ts';
import { ORDINARY, sizeOf, type ThingId } from './things.ts';
import { ALL_CLUES } from './traits.ts';

const ALL: ThingId[] = [...ORDINARY, ...ALL_CLUES];

/** A list of things as a case could have: some ordinary, some evidence. */
function someThings(seed: number): ThingId[] {
  const pool = ALL.slice();
  const out: ThingId[] = [];
  let state = seed;
  while (out.length < DETECTIVE.thingsPerScene) {
    const pick = nextInt(state, pool.length);
    state = pick.state;
    out.push(...pool.splice(pick.value, 1));
  }
  return out;
}

describe.each(ROOM_IDS)('putting things into the room %s', (room) => {
  const spots = SPOTS[room];

  it('puts every thing on a place that holds it, for any seed', () => {
    for (let seed = 1; seed <= 500; seed++) {
      const things = someThings(seed);
      const placed = place(things, spots, seed * 7919);
      expect(placed.map((p) => p.thing)).toEqual(things);
      expect(placementProblems(placed, spots), `seed ${seed}`).toEqual([]);
    }
  });

  it('gives the same places for the same seed and other places for another', () => {
    const things = someThings(3);
    expect(place(things, spots, 11)).toEqual(place(things, spots, 11));
    expect(place(things, spots, 11)).not.toEqual(place(things, spots, 12));
  });

  it('uses many different places over the seeds', () => {
    const used = new Set<string>();
    for (let seed = 1; seed <= 200; seed++) for (const p of place(someThings(seed), spots, seed)) used.add(p.spot);
    expect(used.size).toBe(spots.length);
  });
});

describe('checking placed things', () => {
  const spots = SPOTS.study;
  const good = [on('study', 'key', 'shelf3'), on('study', 'coin', 'floor8')];

  it('accepts things on their places', () => {
    expect(placementProblems(good, spots)).toEqual([]);
  });

  it('catches a thing in the air, off its place, on a wrong or taken place', () => {
    const [key, coin] = good as [(typeof good)[0], (typeof good)[0]];
    expect(placementProblems([{ ...key, y: key.y - 10 }], spots).join()).toContain('hang in the air');
    expect(placementProblems([{ ...key, x: key.x + 30 }], spots).join()).toContain('sticks out');
    expect(placementProblems([{ ...coin, spot: 'shelf3', x: key.x, y: key.y }], spots).join()).toContain('does not belong');
    expect(placementProblems([key, { ...key, thing: 'ring' }], spots).join()).toContain('taken twice');
    expect(placementProblems([{ ...key, rot: 10 }], spots).join()).toContain('turned on a ledge');
    expect(placementProblems([{ ...key, spot: 'nowhere' }], spots).join()).toContain('no place');
    expect(placementProblems([coin, { ...coin, spot: 'floor7' }], spots).join()).toContain('twice in the room');
  });
});

describe('touching a thing', () => {
  const coin = on('study', 'coin', 'floor8');
  const key = on('study', 'key', 'shelf3');
  const size = sizeOf('coin');
  const middle = { x: coin.x, y: coin.y - size.h / 2 };

  it('finds the thing under the point and within the tolerance, not farther', () => {
    expect(thingAt([coin, key], [], middle.x, middle.y, 0)?.thing).toBe('coin');
    expect(thingAt([coin, key], [], middle.x + size.w / 2 + 9, middle.y, 10)?.thing).toBe('coin');
    expect(thingAt([coin, key], [], middle.x + size.w / 2 + 11, middle.y, 10)).toBeNull();
    expect(thingAt([coin, key], [], 600, 400, 30)).toBeNull();
  });

  it('skips things found already and takes the nearest of two', () => {
    expect(thingAt([coin, key], ['coin'], middle.x, middle.y, 0)).toBeNull();
    const near = { ...coin, thing: 'ring' as ThingId, x: coin.x + 30 };
    expect(thingAt([coin, near], [], coin.x + 22, middle.y, 20)?.thing).toBe('ring');
    expect(thingAt([coin, near], [], coin.x + 8, middle.y, 20)?.thing).toBe('coin');
  });
});
