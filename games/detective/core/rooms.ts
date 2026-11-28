// Rooms as the logic sees them: the places where a thing can stand or lie. A room's drawing uses the same
// numbers (core/rooms/<room>.ts), so a thing never hangs in the air (docs/detective/SPEC.md).
import { BAKERY_SPOTS } from './rooms/bakery.ts';
import { POST_SPOTS } from './rooms/post.ts';
import { STATION_SPOTS } from './rooms/station.ts';
import { STUDY_SPOTS } from './rooms/study.ts';

/**
 * How a place holds a thing. Ledges (a shelf or a pigeonhole; the top of a bookcase, a rack, a glass case, a
 * suitcase or a stack of parcels; a windowsill; a desk, a table, a counter or the ledge of a ticket window; a
 * seat) are seen from the front: a thing stands on the line. On the floor and on a rug, a mat or a carpet
 * runner a thing lies and may be turned a little.
 */
export type SpotKind = 'shelf' | 'top' | 'sill' | 'desk' | 'seat' | 'floor' | 'rug';
export const LEDGES: readonly SpotKind[] = ['shelf', 'top', 'sill', 'desk', 'seat'];

/** Where a thing was found, in words (dictionaries: where.<id>). */
export type Where =
  | 'shelf'
  | 'sill'
  | 'seat'
  | 'floor'
  // the study
  | 'bookcaseTop'
  | 'desk'
  | 'rug'
  | 'underDesk'
  // the bakery
  | 'rackTop'
  | 'table'
  | 'counter'
  | 'showcase'
  | 'mat'
  // the station
  | 'bench'
  | 'suitcase'
  | 'ticketDesk'
  | 'runner'
  // the post office
  | 'pigeonholes'
  | 'postCounter'
  | 'parcels';

export interface Spot {
  id: string;
  kind: SpotKind;
  where: Where;
  /** Middle of the place and the line the thing's bottom rests on, in scene units. */
  x: number;
  y: number;
  /** Free width and free height above the line. */
  w: number;
  h: number;
}

export type RoomId = 'study' | 'bakery' | 'station' | 'post';
export const ROOM_IDS: readonly RoomId[] = ['study', 'bakery', 'station', 'post'];

export const SPOTS: Record<RoomId, readonly Spot[]> = {
  study: STUDY_SPOTS,
  bakery: BAKERY_SPOTS,
  station: STATION_SPOTS,
  post: POST_SPOTS,
};
