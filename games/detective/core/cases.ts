// A case: a room at a time of day, the things hidden in it, the evidence among them, the suspects and who
// did it. Story cases are written by hand here; daily cases are made from the date (core/daily.ts).
import type { Suspect } from './people.ts';
import { putOn, type Placed } from './placement.ts';
import { SPOTS, type RoomId } from './rooms.ts';
import type { ThingId } from './things.ts';
import type { ClueId } from './traits.ts';

export type Time = 'day' | 'night';
export type CaseKind = 'story' | 'daily' | 'search';

export interface CaseDef {
  id: string;
  kind: CaseKind;
  /** The story's texts in the dictionaries (stories.<story>); null — free search, no story. */
  story: string | null;
  room: RoomId;
  time: Time;
  /** The things to find, in the order of the list on the screen. */
  things: Placed[];
  /** The evidence among the things. */
  clues: ClueId[];
  suspects: Suspect[];
  /** Index of the one who did it; -1 — free search, nobody. */
  culprit: number;
}

export function on(room: RoomId, thing: ThingId, spotId: string, dx = 0, rot = 0): Placed {
  const spot = SPOTS[room].find((s) => s.id === spotId);
  if (!spot) throw new Error(`No place "${spotId}" in the room ${room}`);
  return putOn(spot, thing, dx, rot);
}

export const STORY_IDS = ['lostLetter', 'midnightCall'] as const;
export type StoryId = (typeof STORY_IDS)[number];

/** Season one (docs/detective/SPEC.md): the study by day and at night. */
export const STORIES: Record<StoryId, CaseDef> = {
  // A sealed letter is gone from the desk. Red hair, a blue button, a lens: only Marta has all three.
  lostLetter: {
    id: 'lostLetter',
    kind: 'story',
    story: 'lostLetter',
    room: 'study',
    time: 'day',
    things: [
      on('study', 'key', 'shelf3'),
      on('study', 'hair:red', 'seat', -14),
      on('study', 'magnifier', 'rug2', 0, -24),
      on('study', 'watch', 'top1'),
      on('study', 'buttons:blue', 'underDesk'),
      on('study', 'coin', 'floor8'),
      on('study', 'quill', 'onBooks'),
      on('study', 'glasses', 'sill1', 8),
      on('study', 'candle', 'shelf5'),
      on('study', 'pawn', 'desk1'),
    ],
    clues: ['hair:red', 'buttons:blue', 'glasses'],
    suspects: [
      { person: 'anna', buttons: 'brown', scarf: null, flower: false },
      { person: 'viktor', buttons: 'blue', scarf: null, flower: false },
      { person: 'marta', buttons: 'blue', scarf: 'red', flower: false },
      { person: 'bence', buttons: 'brown', scarf: 'yellow', flower: false },
      { person: 'oleg', buttons: 'gold', scarf: null, flower: false },
      { person: 'lina', buttons: 'blue', scarf: null, flower: true },
    ],
    culprit: 2,
  },
  // A call at midnight, a note without a name, wet footprints. Dark hair, a yellow thread, a petal: Sofia.
  midnightCall: {
    id: 'midnightCall',
    kind: 'story',
    story: 'midnightCall',
    room: 'study',
    time: 'night',
    things: [
      on('study', 'key', 'sill2'),
      on('study', 'scarf:yellow', 'seat', 10),
      on('study', 'coin', 'rug1'),
      on('study', 'ring', 'shelf1'),
      on('study', 'flower', 'floor3', 0, 18),
      on('study', 'ticket', 'shelf3'),
      on('study', 'pencil', 'floor2', 0, 20),
      on('study', 'hair:dark', 'desk2'),
      on('study', 'matches', 'desk1'),
      on('study', 'candle', 'top2'),
    ],
    clues: ['scarf:yellow', 'flower', 'hair:dark'],
    suspects: [
      { person: 'pavlo', buttons: 'blue', scarf: 'yellow', flower: false },
      { person: 'emma', buttons: 'brown', scarf: 'yellow', flower: true },
      { person: 'ilona', buttons: 'brown', scarf: 'blue', flower: false },
      { person: 'gabor', buttons: 'gold', scarf: null, flower: true },
      { person: 'sofia', buttons: 'blue', scarf: 'yellow', flower: true },
      { person: 'tamas', buttons: 'gold', scarf: null, flower: true },
    ],
    culprit: 4,
  },
};
