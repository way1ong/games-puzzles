// Every colour of the tile pictures lives in this file (as in Detective, decision of 23.11); the screen around them
// takes its colours from styles/tokens.css. The face of a tile is light in both themes — a tile is a thing on the
// table — and every picture has a dark outline, so its shape stands out whatever its colour (rule 6).
// art.test.ts keeps colours out of the other drawing modules and checks the outline's contrast on the face.

export const PAINT = {
  /** The face of a tile. */
  face: '#FFFBF0',
  /** Every picture's outline. */
  outline: '#3B2A1E',
  shine: '#FFFFFF',
  stem: '#6B4423',
  leaf: '#3E8E3A',
  leafDark: '#255E22',
  apple: '#D7322B',
  pear: '#B5C23A',
  cherry: '#A8162E',
  lemon: '#F2C811',
  grape: '#7A3D9E',
  strawberry: '#E2353C',
  seed: '#F7E27A',
  carrot: '#F07D1A',
  cap: '#B5432A',
  capSpot: '#FFF6E6',
  stalk: '#F1E1C2',
  cucumber: '#4C9A3A',
  cucumberSpot: '#A8D38E',
  key: '#D9A21E',
  bell: '#E6B325',
  cup: '#2F72C4',
  steam: '#8A9BB0',
  umbrella: '#13857F',
  roof: '#B5362C',
  wall: '#F0C27A',
  door: '#7A4A26',
  window: '#7EC3EA',
  hull: '#8A5A33',
  sail: '#FFFFFF',
  star: '#F2B417',
  moon: '#5E7CC2',
  sun: '#F2960E',
  heart: '#E0457B',
  fish: '#2E8BD2',
  eye: '#1F2933',
  petal: '#E25CA2',
  flowerHeart: '#F6C62B',
  pine: '#2E7D32',
  trunk: '#7A4A26',
  water: '#3BA3E0',
} as const;

export type Paint = keyof typeof PAINT;
