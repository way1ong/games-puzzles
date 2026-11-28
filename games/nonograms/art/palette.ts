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

/** The two inks of numbers and patterns on a colour: dark and light (palette.test.ts). */
export const INK = { dark: '#161616', light: '#ffffff' } as const;

/**
 * How each colour shows while a colour picture is played (docs/nonograms/SPEC.md, "Кольорові малюнки"): the ink of its
 * numbers and of its pattern — the one of the two that reads on it at 4.5:1 at least — and whether it stands out on
 * the sheet by itself (3:1 on every face of a cell, both themes), so it may go without a pattern; a colour that does
 * not always has one, drawn in its dark ink (palette.test.ts checks all of it against styles/tokens.css).
 */
export const PAINT_LOOK: Record<Colour, { ink: string; plain: boolean }> = {
  k: { ink: INK.light, plain: true },
  s: { ink: INK.dark, plain: false },
  e: { ink: INK.dark, plain: false },
  n: { ink: INK.light, plain: true },
  t: { ink: INK.dark, plain: false },
  r: { ink: INK.light, plain: true },
  p: { ink: INK.dark, plain: false },
  o: { ink: INK.dark, plain: false },
  y: { ink: INK.dark, plain: false },
  g: { ink: INK.dark, plain: false },
  d: { ink: INK.light, plain: true },
  l: { ink: INK.dark, plain: false },
  b: { ink: INK.light, plain: true },
  v: { ink: INK.light, plain: true },
};
