// The colours of the pictures (docs/nonograms/SPEC.md, "Малюнки"): one letter for each colour in the pictures' rows
// (pictures.ts). A solved picture shows on its paper in both themes, so the colours are the same in both; colours of
// the screen itself are in styles/tokens.css.

/** The paper under a picture in colour (the album, the end window). */
export const PAPER = '#fbf8ef';

export const PALETTE = {
  /** black: outlines, eyes */
  k: '#2d2a26',
  /** grey: stone, metal */
  s: '#8c939a',
  /** light grey: white things (snow, clouds, milk) */
  e: '#cfd6dc',
  /** brown: wood, trunks, bread */
  n: '#8b5a2f',
  /** tan: sand, crust, skin */
  t: '#d6a866',
  /** red */
  r: '#d23a2e',
  /** pink */
  p: '#ea8ab0',
  /** orange */
  o: '#ee8a24',
  /** yellow */
  y: '#f0bf2e',
  /** green */
  g: '#4aa24a',
  /** dark green */
  d: '#2e6b34',
  /** light blue: sky, water */
  l: '#79bfea',
  /** blue */
  b: '#2f6fc4',
  /** violet */
  v: '#8656c2',
} as const;

export type Colour = keyof typeof PALETTE;
