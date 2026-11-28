// A whole scene: the room at a time of day with the things on their places. One SVG; the screen adds the
// hint ring and the keyboard pointer into the last, empty group.
import { DETECTIVE } from '../config.ts';
import type { Time } from '../core/cases.ts';
import type { Placed } from '../core/placement.ts';
import type { RoomId } from '../core/rooms.ts';
import type { ThingId } from '../core/things.ts';
import { context, sceneDefs, type Ctx } from './defs.ts';
import { roomPaint } from './palette.ts';
import { bakeryBack, bakeryDefs, bakeryFront } from './rooms/bakery.ts';
import { postBack, postDefs, postFront } from './rooms/post.ts';
import { stationBack, stationDefs, stationFront } from './rooms/station.ts';
import { studyBack, studyFront } from './rooms/study.ts';
import { el, g, type Attrs } from './svg.ts';
import { placedThing } from './things.ts';

interface RoomArt {
  back(c: Ctx, time: Time): string;
  front(c: Ctx): string;
  /** Definitions only this room refers to. */
  defs?(c: Ctx): string;
}

const ROOMS: Record<RoomId, RoomArt> = {
  study: { back: studyBack, front: studyFront },
  bakery: { back: bakeryBack, front: bakeryFront, defs: bakeryDefs },
  station: { back: stationBack, front: stationFront, defs: stationDefs },
  post: { back: postBack, front: postFront, defs: postDefs },
};

export interface SceneView {
  room: RoomId;
  time: Time;
  things: readonly Placed[];
  /** Things found already are not drawn. */
  found?: readonly ThingId[];
}

export function sceneSvg(view: SceneView, attrs: Attrs = {}): string {
  const { width, height } = DETECTIVE.scene;
  const c = context(roomPaint(view.room, view.time), view.time === 'night', `room-${view.time}`);
  const room = ROOMS[view.room];
  const found = view.found ?? [];
  const things = view.things.filter((t) => !found.includes(t.thing)).map((t) => placedThing(t, view.time));
  return el(
    'svg',
    { xmlns: 'http://www.w3.org/2000/svg', viewBox: `0 0 ${width} ${height}`, class: 'scene', ...attrs },
    sceneDefs(c, room.defs?.(c)) + g({ class: 'scene__room' }, room.back(c, view.time)) + g({ class: 'scene__things' }, things.join('')) + g({ class: 'scene__front' }, room.front(c)) + g({ class: 'scene__marks' }, ''),
  );
}
