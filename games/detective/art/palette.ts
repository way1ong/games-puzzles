// Every colour of the drawings lives in this file: rooms and things by time of day, and people. The screen
// around the drawings takes its colours from styles/tokens.css. A test (art.test.ts) keeps colours out of
// the other drawing modules (docs/DECISIONS.md, 23.11).
import type { Time } from '../core/cases.ts';
import type { Buttons, Hair, Scarf } from '../core/traits.ts';

type RGB = [number, number, number];

const toRgb = (hex: string): RGB => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as RGB;
const toHex = (rgb: RGB): string => `#${rgb.map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('')}`.toUpperCase();

/** A colour at night: a little greyer, darker and bluer. */
function atNight(hex: string, [r, g, b]: RGB): string {
  const c = toRgb(hex);
  const grey = 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2];
  const soft = c.map((v) => v + (grey - v) * 0.15) as RGB;
  return toHex([soft[0] * r, soft[1] * g, soft[2] * b]);
}

/** Furniture sinks into the dark; the things to find stay easy to see. */
const DEEP: RGB = [0.5, 0.54, 0.66];
const SOFT: RGB = [0.8, 0.82, 0.92];

/** A darker shade of a colour (the fold of a coat, the rim of a button). */
export function darker(hex: string, k = 0.82): string {
  return toHex(toRgb(hex).map((c) => c * k) as RGB);
}

/**
 * Colours of rooms and things: the day colour, and the night colour where it is not simply the day colour
 * in the dark (walls, the sky, what gives light).
 */
const TABLE = {
  // walls and floor
  wallTop: ['#F1E4CF', '#2A3442'],
  wallBottom: ['#E2CFB2', '#1F2833'],
  wallMotif: ['#D9C3A2', '#33404F'],
  skirting: ['#7A4A2B', '#1A1410'],
  floorTop: ['#B98552', '#3A2C24'],
  floorBottom: ['#9A6A40', '#2A1F19'],
  plank: ['#8A5B35', '#241A15'],
  // wood
  woodDark: ['#5E3A22', '#22160F'],
  wood: ['#7A4A2B', '#352318'],
  woodMid: ['#94603A', '#47301F'],
  shelfBack: ['#4B2E1A', '#160E09'],
  // light: the patch on the floor (the sun by day, the street lamp at night), lamps on and off
  floorLight: ['#FFF4D6', '#D9C9A0'],
  lamp: ['#FFE7A6', '#FFC970'],
  lampInside: ['#D8D0BC', '#FFC970'],
  shadeCloth: ['#E8D3A8', '#E9C878'],
  shadow: ['#3A2414', '#000000'],
  white: ['#FFFFFF', '#FFFFFF'],
  black: ['#000000', '#000000'],
  // the window
  skyTop: ['#BFE1F3', '#0E1726'],
  skyBottom: ['#E8F4FA', '#1F2E45'],
  town: ['#A9BDCB', '#141D2B'],
  townFar: ['#93A9B9', '#0F1620'],
  townWindow: ['#A9BDCB', '#F2C46D'],
  rain: ['#9FB8D6', '#9FB8D6'],
  streetLamp: ['#0A0E15', '#0A0E15'],
  radiator: ['#E6E2DA', '#3A4350'],
  radiatorRib: ['#D3CEC4', '#2E3640'],
  // cloth and plants
  green: ['#46775F', '#24443A'],
  greenDark: ['#335A47', '#18302A'],
  greenLight: ['#6E9C84', '#36594C'],
  rug: ['#94403D', '#4E2424'],
  rugInner: ['#AC524C', '#5E2C2A'],
  rugGold: ['#D1AC57', '#8A7240'],
  coat: ['#B08D57', '#5E4B33'],
  coatButton: ['#3E2C18'],
  hat: ['#3D3D47'],
  hatBrim: ['#2E2E35'],
  hatBand: ['#1B1B20'],
  umbrella: ['#3A3F55', '#1E2231'],
  leather: ['#5A3A22'],
  terracotta: ['#B5653B', '#6A3C26'],
  terracottaLight: ['#C77445', '#7A472C'],
  // metal
  brass: ['#C9A24B'],
  brassDark: ['#B08A3E'],
  gold: ['#D4A23A'],
  goldDark: ['#9C7426'],
  goldPale: ['#B98E3A'],
  steel: ['#8C8C8C'],
  iron: ['#2E3238'],
  ironLight: ['#3A3F47'],
  ironDark: ['#1E2126'],
  lampFoot: ['#3B2A1A'],
  // paper and pale things
  paper: ['#FBF6EA', '#D9D2C0'],
  paperShade: ['#E6DCC5', '#B7AE99'],
  cream: ['#F6EBCB'],
  creamShade: ['#E6DABA'],
  linen: ['#F3E9D2'],
  linenEdge: ['#C9B994'],
  feather: ['#F7F3EA'],
  featherEdge: ['#BDB5A3'],
  ivory: ['#D9D4C7'],
  china: ['#F2F2F2', '#C9C9CE'],
  noteYellow: ['#FFF7D6', '#DAD2B2'],
  noteGreen: ['#E3F0D8', '#BFCDB6'],
  photoPaper: ['#F4F1EA', '#CFCBC2'],
  photo: ['#9FB3C2', '#6F8292'],
  photoDark: ['#4C5B66'],
  cork: ['#C9A06A', '#6E5536'],
  scribble: ['#6A5A45'],
  typed: ['#777777'],
  // colours
  red: ['#B03A2E'],
  pin: ['#C0392B', '#A53226'],
  yellow: ['#F4D35E'],
  pencil: ['#F4C542'],
  pencilWood: ['#E8C9A0'],
  eraser: ['#E58C7A'],
  blue: ['#2F6690'],
  blueLight: ['#5B7DA6'],
  blueDark: ['#46627F'],
  lampGreen: ['#2F6B4F'],
  matchBrown: ['#8E5A34'],
  pink: ['#F3A6B9'],
  pinkDark: ['#D9809A'],
  sea: ['#6FA8C9', '#2F4F66'],
  land: ['#7DAF6B', '#3F5A3A'],
  pictureSky: ['#BFD8E6', '#2A3C4C'],
  pictureHill: ['#7BA66A', '#2E4A3A'],
  pictureSun: ['#F4D35E', '#E9E2C8'],
  fur: ['#7D7F86', '#4A4A52'],
  basket: ['#6E7F6A', '#2F3A2E'],
  basketRim: ['#5B6B57', '#253023'],
  glass: ['#DDEFF7'],
  glassEdge: ['#7FA3B6'],
  crack: ['#5F7F92'],
  phone: ['#2E2E33'],
  phoneDark: ['#26262B'],
  dial: ['#C9C2B0'],
  ink: ['#2B2B2B'],
} satisfies Record<string, readonly [string, string?]>;

const BOOKS = ['#B5473A', '#2F6690', '#D9A441', '#3E7C59', '#6D4C7D', '#C8683A', '#2B4C6F', '#8C2F39', '#4F772D', '#A3742F', '#5B7DA6', '#7E5A3C'];

export type PaintKey = keyof typeof TABLE;
export type Paint = Record<PaintKey, string> & { books: readonly string[] };

/** `own` — whether the table's own night colours are used (rooms) or every colour just darkens (things). */
function paint(time: Time, dark: RGB, own: boolean): Paint {
  const colours = (Object.entries(TABLE) as [PaintKey, readonly [string, string?]][]).map(
    ([name, [day, night]]) => [name, time === 'day' ? day : ((own ? night : undefined) ?? atNight(day, dark))] as const,
  );
  return {
    ...(Object.fromEntries(colours) as Record<PaintKey, string>),
    books: time === 'day' ? BOOKS : BOOKS.map((c) => atNight(c, dark)),
  };
}

const cache = new Map<string, Paint>();

function cached(key: string, make: () => Paint): Paint {
  let p = cache.get(key);
  if (!p) cache.set(key, (p = make()));
  return p;
}

/** Colours of a room and its furniture at this time of day. */
export const roomPaint = (time: Time): Paint => cached(`room:${time}`, () => paint(time, DEEP, true));

/** Colours of the things to find: at night only a little darker than by day, so they stay findable. */
export const thingPaint = (time: Time): Paint => cached(`thing:${time}`, () => paint(time, SOFT, false));

// ---------- people (their portraits are lit the same in every case) ----------

export const SKIN = {
  fair: { base: '#F6DCC9', shade: '#E4B9A0', lip: '#C9716A', lipDark: '#9E4A44' },
  light: { base: '#F1D0B8', shade: '#DDAE92', lip: '#C46C62', lipDark: '#97463F' },
  tan: { base: '#DDA986', shade: '#C38B66', lip: '#A95F55', lipDark: '#7E3F37' },
  medium: { base: '#C28A64', shade: '#A46E4B', lip: '#94554B', lipDark: '#6C3830' },
} as const;
export type SkinTone = keyof typeof SKIN;

export const HAIR_PAINT: Record<Hair, { base: string; light: string; dark: string }> = {
  red: { base: '#B24E2A', light: '#D8783F', dark: '#86381E' },
  dark: { base: '#3B2B23', light: '#5E493C', dark: '#231812' },
  blond: { base: '#D4AE5E', light: '#EDD08C', dark: '#AE8A40' },
  gray: { base: '#A9A8A3', light: '#CECDC8', dark: '#85847E' },
};

export const EYES = { green: '#4F7D4C', brown: '#5A3B22', blue: '#4C7AA6', gray: '#6A7C8C', dark: '#3F2A1E' } as const;
export type EyeColour = keyof typeof EYES;

export const COATS = {
  camel: '#A07650',
  blue: '#2F5D8C',
  sky: '#3F6E9E',
  gray: '#8C9096',
  navy: '#2A3444',
  green: '#4D7A5A',
  plum: '#6E4A6B',
  brown: '#6F5A48',
  wine: '#7A2F3A',
  slate: '#3E5672',
  ivory: '#DDD5C2',
  moss: '#5F6F3F',
  teal: '#2F6F73',
} as const;
export type CoatColour = keyof typeof COATS;

export const SHIRTS = { white: '#F6F2EA', cream: '#E9E4DA', pale: '#DAD6CC', rose: '#EBD6D0' } as const;
export type ShirtColour = keyof typeof SHIRTS;

/** Portrait backgrounds: soft, a different one for every person. */
export const BACKDROPS = {
  sand: '#EBDDCB',
  mist: '#DCE4EC',
  rose: '#EBDAD5',
  sage: '#E3E7D6',
  lilac: '#DEDEE6',
  mint: '#DEEADF',
  cream: '#EEE6D2',
  sky: '#D9E6EA',
  peach: '#EEDCCB',
  stone: '#E2E0D8',
  blush: '#EADADF',
  olive: '#E4E6D0',
  pearl: '#E6E3EA',
} as const;
export type Backdrop = keyof typeof BACKDROPS;

export const BUTTON_PAINT: Record<Buttons, { fill: string; rim: string; mark: string }> = {
  blue: { fill: '#7FB2E5', rim: '#3F6E9E', mark: '#2C4E73' },
  brown: { fill: '#8A5A36', rim: '#5A341E', mark: '#2A1A10' },
  gold: { fill: '#D4A23A', rim: '#9C7426', mark: '#7A5A1C' },
};

/** A scarf: its colour (the thread found as evidence has it) and the colour of its pattern. */
export const SCARF_PAINT: Record<Scarf, { main: string; other: string }> = {
  red: { main: '#B03A2E', other: '#F1E6D6' },
  yellow: { main: '#E2B93B', other: '#7A5C12' },
  blue: { main: '#3E5F86', other: '#DDE7F2' },
};

export const FACE = {
  eyeWhite: '#FFFDF9',
  pupil: '#1A1412',
  lid: '#2A1D17',
  blush: '#E8857A',
  freckle: '#A85A36',
  warmShade: '#7A3E2A',
  white: '#FFFFFF',
  black: '#000000',
} as const;

export const GLASSES = { round: '#2B2B2B', rect: '#6E3F2C', lens: '#DDEFF7' } as const;

export const HATS = {
  flatcap: { top: '#5D6672', brim: '#48505A' },
  peaked: { top: '#2C3646', band: '#1D2531', visor: '#111720', badge: '#D4A23A', badgeDark: '#9C7426' },
  postal: { top: '#3F5F8A', band: '#2C4567', visor: '#16202E', badge: '#D4A23A', badgeDark: '#9C7426' },
} as const;

export const FLOWER = { petal: '#F3A6B9', edge: '#D9809A', centre: '#F4CE5A', leaf: '#5E9A63', leafDark: '#4F8A55' } as const;

export const EXTRAS = { bow: '#3E7C59', strap: '#6B4A2E' } as const;
