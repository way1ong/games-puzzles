// A case: a room at a time of day, the things hidden in it, the evidence among them, the suspects and who
// did it. Story cases are written by hand here; daily cases are made from the date (core/daily.ts).
import type { Circumstance, Fact, Level, Statement } from './facts.ts';
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
  /** How much thinking it takes (docs/detective/SPEC.md, «Рівні»). */
  level: Level;
  /** What the scene itself says; an easy case has none. */
  circumstances: Circumstance[];
  /** What is known about each suspect beyond the looks, in the order of the suspects; an easy case has none. */
  facts: Fact[][];
  /** A hard case: what each suspect says about the moment it happened, in the order of the suspects. */
  statements: Statement[];
}

/** A moment of the day in minutes after midnight. */
export const at = (hours: number, minutes = 0): number => hours * 60 + minutes;

export function on(room: RoomId, thing: ThingId, spotId: string, dx = 0, rot = 0): Placed {
  const spot = SPOTS[room].find((s) => s.id === spotId);
  if (!spot) throw new Error(`No place "${spotId}" in the room ${room}`);
  return putOn(spot, thing, dx, rot);
}

export const STORY_IDS = ['lostLetter', 'midnightCall', 'fairPie', 'nightShift', 'strangeSuitcase', 'lastTrain', 'recipeBook', 'missingStamp'] as const;
export type StoryId = (typeof STORY_IDS)[number];

/**
 * Season one (docs/detective/SPEC.md): every room by day and at night — the easy cases; after them the
 * harder ones.
 */
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
    level: 'easy',
    circumstances: [],
    facts: [],
    statements: [],
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
    level: 'easy',
    circumstances: [],
    facts: [],
    statements: [],
  },
  // The pie for the fair is gone from its stand. Fair hair, a brown button, a yellow thread: only Bence.
  fairPie: {
    id: 'fairPie',
    kind: 'story',
    story: 'fairPie',
    room: 'bakery',
    time: 'day',
    things: [
      on('bakery', 'watch', 'rackTop1'),
      on('bakery', 'scarf:yellow', 'sill1', -6),
      on('bakery', 'key', 'rack3'),
      on('bakery', 'coin', 'floor4'),
      on('bakery', 'hair:blond', 'seat', -12),
      on('bakery', 'envelope', 'counter1'),
      on('bakery', 'pencil', 'table1'),
      on('bakery', 'buttons:brown', 'mat2', 10),
      on('bakery', 'ring', 'showcase2'),
      on('bakery', 'matches', 'rack5'),
    ],
    clues: ['hair:blond', 'buttons:brown', 'scarf:yellow'],
    suspects: [
      { person: 'marta', buttons: 'blue', scarf: 'red', flower: false },
      { person: 'viktor', buttons: 'brown', scarf: 'yellow', flower: false },
      { person: 'emma', buttons: 'gold', scarf: 'yellow', flower: true },
      { person: 'bence', buttons: 'brown', scarf: 'yellow', flower: false },
      { person: 'nora', buttons: 'brown', scarf: 'blue', flower: false },
      { person: 'pavlo', buttons: 'gold', scarf: 'yellow', flower: false },
    ],
    culprit: 3,
    level: 'easy',
    circumstances: [],
    facts: [],
    statements: [],
  },
  // Somebody was in the bakery at night: the door ajar, the lamps on, floury footprints, a glove, the key
  // on the mat. A gold button, a petal, a red thread: only Emma.
  nightShift: {
    id: 'nightShift',
    kind: 'story',
    story: 'nightShift',
    room: 'bakery',
    time: 'night',
    things: [
      on('bakery', 'key', 'mat2', -8, 14),
      on('bakery', 'flower', 'counter1', 12),
      on('bakery', 'glove', 'seat', 10),
      on('bakery', 'pencil', 'floor2', 0, 18),
      on('bakery', 'candle', 'showcase1'),
      on('bakery', 'scarf:red', 'rack2'),
      on('bakery', 'matches', 'counter2'),
      on('bakery', 'ticket', 'sill2'),
      on('bakery', 'buttons:gold', 'floor8'),
      on('bakery', 'magnifier', 'floor10', 0, -20),
    ],
    clues: ['buttons:gold', 'flower', 'scarf:red'],
    suspects: [
      { person: 'oleg', buttons: 'gold', scarf: 'red', flower: false },
      { person: 'emma', buttons: 'gold', scarf: 'red', flower: true },
      { person: 'lina', buttons: 'blue', scarf: 'red', flower: true },
      { person: 'gabor', buttons: 'gold', scarf: null, flower: true },
      { person: 'tamas', buttons: 'gold', scarf: 'blue', flower: false },
      { person: 'ilona', buttons: 'brown', scarf: 'blue', flower: false },
    ],
    culprit: 1,
    level: 'easy',
    circumstances: [],
    facts: [],
    statements: [],
  },
  // Two suitcases just alike, and somebody else's things in one of them. A lens, a blue thread, a brown
  // button: only Nora.
  strangeSuitcase: {
    id: 'strangeSuitcase',
    kind: 'story',
    story: 'strangeSuitcase',
    room: 'station',
    time: 'day',
    things: [
      on('station', 'ticket', 'ticket1'),
      on('station', 'glasses', 'case1', -8),
      on('station', 'key', 'sill1'),
      on('station', 'glove', 'benchA1', -6),
      on('station', 'coin', 'floor5'),
      on('station', 'scarf:blue', 'benchB1', 8),
      on('station', 'watch', 'case2'),
      on('station', 'envelope', 'ticket2'),
      on('station', 'buttons:brown', 'rug2', -12),
      on('station', 'pencil', 'floor8', 0, 20),
    ],
    clues: ['glasses', 'scarf:blue', 'buttons:brown'],
    suspects: [
      { person: 'bence', buttons: 'brown', scarf: 'blue', flower: false },
      { person: 'ilona', buttons: 'gold', scarf: 'blue', flower: false },
      { person: 'sofia', buttons: 'blue', scarf: 'yellow', flower: false },
      { person: 'viktor', buttons: 'brown', scarf: 'red', flower: false },
      { person: 'gabor', buttons: 'gold', scarf: null, flower: true },
      { person: 'nora', buttons: 'brown', scarf: 'blue', flower: false },
    ],
    culprit: 5,
    level: 'easy',
    circumstances: [],
    facts: [],
    statements: [],
  },
  // The last train has gone, and the musician's violin is not in its case. A grey hair, a blue button, a
  // red thread: only Oleg.
  lastTrain: {
    id: 'lastTrain',
    kind: 'story',
    story: 'lastTrain',
    room: 'station',
    time: 'night',
    things: [
      on('station', 'pawn', 'case1'),
      on('station', 'scarf:red', 'benchB2', -8),
      on('station', 'coin', 'floor6'),
      on('station', 'envelope', 'sill1'),
      on('station', 'hair:gray', 'floor9', 0, 15),
      on('station', 'matches', 'ticket2'),
      on('station', 'key', 'benchA2', 6),
      on('station', 'buttons:blue', 'rug3', 14),
      on('station', 'ring', 'sill2'),
      on('station', 'magnifier', 'floor2', 0, -15),
    ],
    clues: ['hair:gray', 'buttons:blue', 'scarf:red'],
    suspects: [
      { person: 'oleg', buttons: 'blue', scarf: 'red', flower: false },
      { person: 'sofia', buttons: 'gold', scarf: 'yellow', flower: true },
      { person: 'ilona', buttons: 'brown', scarf: 'red', flower: false },
      { person: 'pavlo', buttons: 'blue', scarf: 'red', flower: false },
      { person: 'gabor', buttons: 'blue', scarf: null, flower: false },
      { person: 'tamas', buttons: 'brown', scarf: 'blue', flower: false },
    ],
    culprit: 0,
    level: 'easy',
    circumstances: [],
    facts: [],
    statements: [],
  },
  // Medium. The book of recipes is gone from the bakery at night; the lock is whole, and a pocket watch has
  // stopped at 21:40. A dark hair, a brown button, a petal. At face value all three fit Sofia — but she has
  // no key. The petal is the florist's, who brought flowers by day; the rest leaves only Viktor.
  recipeBook: {
    id: 'recipeBook',
    kind: 'story',
    story: 'recipeBook',
    room: 'bakery',
    time: 'night',
    things: [
      on('bakery', 'watch', 'rackTop1'),
      on('bakery', 'flower', 'counter1', 12),
      on('bakery', 'coin', 'floor4'),
      on('bakery', 'hair:dark', 'seat', -12),
      on('bakery', 'envelope', 'sill1'),
      on('bakery', 'pencil', 'table1'),
      on('bakery', 'buttons:brown', 'mat2', 10),
      on('bakery', 'ring', 'showcase2'),
      on('bakery', 'matches', 'rack5'),
      on('bakery', 'candle', 'showcase1'),
    ],
    clues: ['hair:dark', 'buttons:brown', 'flower'],
    suspects: [
      { person: 'emma', buttons: 'brown', scarf: null, flower: false },
      { person: 'sofia', buttons: 'brown', scarf: 'blue', flower: true },
      { person: 'viktor', buttons: 'brown', scarf: null, flower: false },
      { person: 'lina', buttons: 'blue', scarf: 'yellow', flower: true },
      { person: 'pavlo', buttons: 'brown', scarf: 'red', flower: false },
      { person: 'tamas', buttons: 'gold', scarf: null, flower: false },
    ],
    culprit: 2,
    level: 'medium',
    circumstances: [{ kind: 'locked' }, { kind: 'time', at: at(21, 40), thing: 'watch' }],
    facts: [
      [{ kind: 'key' }],
      [],
      [{ kind: 'key' }],
      [{ kind: 'visit', why: 'flowers' }],
      [{ kind: 'key' }, { kind: 'away', from: at(21), to: at(22, 30), where: 'mailSorting' }],
      [{ kind: 'key' }],
    ],
    statements: [],
  },
  // Hard. A rare stamp is gone from the album; the pocket watch beside it has stopped at 19:30, and each of
  // the six says where they were then. A lens, a gold button, a blue thread fit three people. Tamas says he
  // sat in the library next to Nora; the librarian says he never came in. Both cannot be true, and only the
  // one who did it lies — so it is one of the two, and the button is not the librarian's.
  missingStamp: {
    id: 'missingStamp',
    kind: 'story',
    story: 'missingStamp',
    room: 'study',
    time: 'night',
    things: [
      on('study', 'watch', 'top1'),
      on('study', 'coin', 'rug1'),
      on('study', 'glasses', 'sill1', 8),
      on('study', 'ring', 'shelf1'),
      on('study', 'scarf:blue', 'seat', 10),
      on('study', 'ticket', 'shelf3'),
      on('study', 'pencil', 'floor2', 0, 20),
      on('study', 'buttons:gold', 'underDesk'),
      on('study', 'matches', 'desk1'),
      on('study', 'quill', 'onBooks'),
    ],
    clues: ['glasses', 'buttons:gold', 'scarf:blue'],
    suspects: [
      { person: 'anna', buttons: 'gold', scarf: 'blue', flower: false },
      { person: 'sofia', buttons: 'gold', scarf: 'blue', flower: true },
      { person: 'ilona', buttons: 'brown', scarf: 'blue', flower: false },
      { person: 'tamas', buttons: 'gold', scarf: 'blue', flower: false },
      { person: 'nora', buttons: 'gold', scarf: 'blue', flower: true },
      { person: 'viktor', buttons: 'gold', scarf: 'red', flower: false },
    ],
    culprit: 3,
    level: 'hard',
    circumstances: [{ kind: 'time', at: at(19, 30), thing: 'watch' }],
    facts: [],
    statements: [
      { at: 'home' },
      { at: 'theatre' },
      { at: 'library', saw: [4], notSaw: [3] },
      { at: 'library', saw: [4] },
      { at: 'library' },
      { at: 'cafe' },
    ],
  },
};
