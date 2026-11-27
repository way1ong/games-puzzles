// Colours of the drawings of "Clear the way" (docs/slide/SPEC.md, "Три теми навмання"): the ground, the frame and the
// pieces of each look, seen from above. They are the same in both themes of the screen — a board is a thing on the
// table, as the rooms of Detective are. Every piece has a dark outline that reads on its ground at 3:1, and the
// player's piece differs from the others by colour and by its arrow to the way out (palette.test.ts).
import type { Theme } from '../config.ts';

export interface LookPaint {
  /** Water, floor, the box's bottom. */
  ground: string;
  /** Its marks: waves, planks, the grain. */
  groundLine: string;
  /** The quay, the walls, the box's sides. */
  frame: string;
  frameLine: string;
  /** The edge of every piece. */
  outline: string;
  /** The player's piece, its marks and the arrow on it. */
  own: string;
  ownLine: string;
  arrow: string;
  /** A short piece: a boat, a chest, a bar. */
  short: string;
  shortLine: string;
  /** A long piece: a barge, a wardrobe, a long bar. */
  long: string;
  longLine: string;
}

export const LOOKS: Record<Theme, LookPaint> = {
  harbour: {
    ground: '#3f7fa3',
    groundLine: '#7fb4cf',
    frame: '#a39a8a',
    frameLine: '#6d6559',
    outline: '#132630',
    own: '#c85a00',
    ownLine: '#7a3400',
    arrow: '#ffffff',
    short: '#f2efe6',
    shortLine: '#8c8574',
    long: '#6f8f69',
    longLine: '#d9c48e',
  },
  room: {
    ground: '#d8b27a',
    groundLine: '#b38a52',
    frame: '#efe7da',
    frameLine: '#8f8576',
    outline: '#2a1d12',
    own: '#c2413a',
    ownLine: '#7a201b',
    arrow: '#ffffff',
    short: '#b07d4a',
    shortLine: '#6e4a26',
    long: '#9a7656',
    longLine: '#d2b896',
  },
  box: {
    ground: '#ecd9b2',
    groundLine: '#d2b98a',
    frame: '#8a6236',
    frameLine: '#5c3f1f',
    outline: '#2a1a0c',
    own: '#cc2f2f',
    ownLine: '#7d1616',
    arrow: '#ffffff',
    short: '#c99a5b',
    shortLine: '#9c7440',
    long: '#a87a43',
    longLine: '#d8b27c',
  },
};
