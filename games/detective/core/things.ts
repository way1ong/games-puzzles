// The things hidden in a room: ordinary ones and evidence. Sizes are of the drawing as it rests (scene
// units; the origin of a drawing is the middle of its bottom edge) — art/things.ts draws inside them.
import type { SpotKind } from './rooms.ts';
import { clueKind, isClue, type ClueId, type ClueKind } from './traits.ts';

export const ORDINARY = [
  'key',
  'magnifier',
  'watch',
  'coin',
  'envelope',
  'quill',
  'candle',
  'matches',
  'ring',
  'pencil',
  'ticket',
  'pawn',
  'glove',
] as const;
export type OrdinaryId = (typeof ORDINARY)[number];

/** A thing to find: an ordinary thing or a piece of evidence (named by the trait it points at). */
export type ThingId = OrdinaryId | ClueId;

/** The picture of a thing: evidence of one kind looks alike but for its colour. */
export type Shape = OrdinaryId | ClueKind;

export function shapeOf(thing: ThingId): Shape {
  return isClue(thing) ? clueKind(thing) : thing;
}

export interface ShapeInfo {
  w: number;
  h: number;
  /** The kinds of places where it looks right. */
  on: readonly SpotKind[];
  /** Lying on the floor or on a rug it may be turned up to this many degrees either way. */
  turn: number;
}

const LEDGES_ALL: readonly SpotKind[] = ['shelf', 'top', 'sill', 'desk'];
const GROUND: readonly SpotKind[] = ['floor', 'rug'];

export const SHAPES: Record<Shape, ShapeInfo> = {
  key: { w: 48, h: 24, on: [...LEDGES_ALL, 'seat', ...GROUND], turn: 30 },
  magnifier: { w: 60, h: 60, on: GROUND, turn: 40 },
  watch: { w: 44, h: 40, on: LEDGES_ALL, turn: 0 },
  coin: { w: 26, h: 26, on: GROUND, turn: 0 },
  envelope: { w: 52, h: 34, on: [...LEDGES_ALL, ...GROUND], turn: 25 },
  quill: { w: 62, h: 30, on: ['top', 'sill', 'desk', ...GROUND], turn: 20 },
  // a candle only stands, and never burns: there are books around (owner's remark of 23.11)
  candle: { w: 42, h: 48, on: LEDGES_ALL, turn: 0 },
  matches: { w: 34, h: 22, on: [...LEDGES_ALL, 'floor'], turn: 20 },
  ring: { w: 26, h: 22, on: [...LEDGES_ALL, ...GROUND], turn: 0 },
  pencil: { w: 66, h: 12, on: ['top', 'sill', 'desk', ...GROUND], turn: 35 },
  ticket: { w: 44, h: 26, on: [...LEDGES_ALL, ...GROUND], turn: 25 },
  pawn: { w: 24, h: 40, on: LEDGES_ALL, turn: 0 },
  glove: { w: 42, h: 28, on: ['seat', 'top', 'sill', 'desk', ...GROUND], turn: 35 },
  // evidence
  hair: { w: 40, h: 22, on: ['seat', 'top', 'sill', 'desk', ...GROUND], turn: 40 },
  glasses: { w: 28, h: 20, on: ['top', 'sill', 'desk', ...GROUND], turn: 30 },
  buttons: { w: 22, h: 22, on: GROUND, turn: 0 },
  scarf: { w: 44, h: 20, on: ['shelf', 'seat', 'top', 'sill', 'desk', ...GROUND], turn: 40 },
  flower: { w: 24, h: 16, on: ['seat', 'top', 'sill', 'desk', ...GROUND], turn: 40 },
};

export function sizeOf(thing: ThingId): ShapeInfo {
  return SHAPES[shapeOf(thing)];
}
