// The daily case: the same for everybody on the same calendar day (the player's local date). Made from the
// date: the room, day or night (they take turns), a story frame, the suspects with the evidence, the
// things and their places. And free search: a room with ordinary things only, from a seed.
import { nextInt, seedFromText } from '../../../shared/core/rng.ts';
import { DETECTIVE } from '../config.ts';
import type { CaseDef, Time } from './cases.ts';
import { makeCast } from './cast.ts';
import { place } from './placement.ts';
import { ROOM_IDS, SPOTS, type RoomId } from './rooms.ts';
import { ORDINARY, type ThingId } from './things.ts';

/** Story frames of daily cases (dictionaries: stories.<frame>). */
export const DAILY_FRAMES = ['dailySeal', 'dailyVase', 'dailyNote', 'dailyBiscuits'] as const;

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

export function dailyCase(dateKey: string): CaseDef {
  const seed = (part: string) => seedFromText(`way1ong-detective:daily:${dateKey}:${part}`);
  const room = ROOM_IDS[seed('room') % ROOM_IDS.length] as RoomId;
  const cast = makeCast(seed('cast'));
  const ordinary = shuffled(ORDINARY, seed('things')).slice(0, DETECTIVE.thingsPerScene - cast.clues.length);
  const things = shuffled<ThingId>([...ordinary, ...cast.clues], seed('list'));
  return {
    id: `daily:${dateKey}`,
    kind: 'daily',
    story: DAILY_FRAMES[seed('story') % DAILY_FRAMES.length] as string,
    room,
    time: dailyTime(dateKey),
    things: place(things, SPOTS[room], seed('places')),
    clues: cast.clues,
    suspects: cast.suspects,
    culprit: cast.culprit,
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
  };
}
