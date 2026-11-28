// The daily case: the same for everybody on the same calendar day (the player's local date). Made from the
// date: the room, day or night (they take turns), a story frame of that room, the suspects with the
// evidence, the things and their places. And free search: a room with ordinary things only, from a seed.
import { nextInt, seedFromText } from '../../../shared/core/rng.ts';
import { DETECTIVE } from '../config.ts';
import type { CaseDef, Time } from './cases.ts';
import { makeCast } from './cast.ts';
import { place } from './placement.ts';
import { ROOM_IDS, SPOTS, type RoomId } from './rooms.ts';
import { ORDINARY, type ThingId } from './things.ts';

/**
 * Story frames of daily cases, by the room they happen in (dictionaries: stories.<frame>). Anybody may turn
 * out to have done it, so a frame's ending fits any person.
 */
export const DAILY_FRAMES: Record<RoomId, readonly string[]> = {
  study: ['dailySeal', 'dailyVase', 'dailyNote', 'dailyBiscuits'],
  bakery: ['bakeryRecipe', 'bakeryBun', 'bakerySign', 'bakeryJam'],
  station: ['stationUmbrella', 'stationClock', 'stationBouquet', 'stationTimetable'],
  post: ['postPostcard', 'postHorn', 'postPen', 'postWeights'],
};
export const ALL_DAILY_FRAMES: readonly string[] = ROOM_IDS.flatMap((room) => DAILY_FRAMES[room]);

/**
 * One of the items for a seed. The seed goes through the generator first: the low bits of two text seeds
 * that differ only in their last word go together, and "seed % n" would tie the room to the story.
 */
function pick<T>(items: readonly T[], seed: number): T {
  return items[nextInt(seed, items.length).value] as T;
}

function shuffled<T>(items: readonly T[], seed: number): T[] {
  const out = items.slice();
  let state = seed;
  for (let i = out.length - 1; i > 0; i--) {
    const pick = nextInt(state, i + 1);
    state = pick.state;
    [out[i], out[pick.value]] = [out[pick.value] as T, out[i] as T];
  }
  return out;
}

/** Whole days since 1 January 1970 for "YYYY-MM-DD". */
function dayNumber(dateKey: string): number {
  const [y, m, d] = dateKey.split('-').map(Number) as [number, number, number];
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
}

/** Light and noir cases take turns day by day. */
export function dailyTime(dateKey: string): Time {
  return dayNumber(dateKey) % 2 === 0 ? 'day' : 'night';
}

/** The rooms of the case of the day on a date: a new room joins from its date (config.ts, dailyFrom). */
export function dailyRooms(dateKey: string): RoomId[] {
  return ROOM_IDS.filter((room) => (DETECTIVE.dailyFrom[room] ?? '') <= dateKey);
}

export function dailyCase(dateKey: string): CaseDef {
  const seed = (part: string) => seedFromText(`way1ong-detective:daily:${dateKey}:${part}`);
  const room = pick(dailyRooms(dateKey), seed('room'));
  const cast = makeCast(seed('cast'));
  const ordinary = shuffled(ORDINARY, seed('things')).slice(0, DETECTIVE.thingsPerScene - cast.clues.length);
  const things = shuffled<ThingId>([...ordinary, ...cast.clues], seed('list'));
  return {
    id: `daily:${dateKey}`,
    kind: 'daily',
    story: pick(DAILY_FRAMES[room], seed('story')),
    room,
    time: dailyTime(dateKey),
    things: place(things, SPOTS[room], seed('places')),
    clues: cast.clues,
    suspects: cast.suspects,
    culprit: cast.culprit,
    level: 'easy',
    circumstances: [],
    facts: [],
    statements: [],
  };
}

/** Free search: ordinary things only, new places with every seed. */
export function searchCase(room: RoomId, time: Time, seed: number): CaseDef {
  const things = shuffled<ThingId>(ORDINARY, seed).slice(0, DETECTIVE.thingsPerScene);
  return {
    id: `search:${room}:${time}`,
    kind: 'search',
    story: null,
    room,
    time,
    things: place(things, SPOTS[room], seedFromText(`places:${seed}`)),
    clues: [],
    suspects: [],
    culprit: -1,
    level: 'easy',
    circumstances: [],
    facts: [],
    statements: [],
  };
}
