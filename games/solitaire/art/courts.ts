// The figures of the jack, the queen and the king for the drawn look (decision of 25.11): our own drawings in SVG code,
// a bust in a 100 × 130 box — the jack in a hat with a feather and a spear, the queen with long hair, a crown and a
// flower, the king with a crown, a beard and a sceptre. The robe takes the suit's colour from the card
// (`currentColor`); gold, skin, hair and the outlines come from styles/tokens.css (CSS variables, so the drawings
// have no colour of their own). The page holds them once as symbols (`sol-court-<rank>`); a card shows one with <use>.

const LINE = 'stroke:var(--court-line);stroke-width:1.8;stroke-linejoin:round;stroke-linecap:round';
const fill = (paint: string): string => `style="fill:${paint};${LINE}"`;
const GOLD = 'var(--court-gold)';
const SKIN = 'var(--court-skin)';
const HAIR = 'var(--court-hair)';
const SUIT = 'currentColor';

const ROBE = `<path d="M6 130C8 104 25 91 50 89C75 91 92 104 94 130Z" ${fill(SUIT)}/>`;
const COLLAR = `<path d="M30 93C40 99 60 99 70 93L73 100C61 108 39 108 27 100Z" ${fill(GOLD)}/>`;
const NECK = `<path d="M44 72H56V90C53 92 47 92 44 90Z" ${fill(SKIN)}/>`;
const face = (cy: number): string =>
  `<ellipse cx="50" cy="${cy}" rx="14.5" ry="16.5" ${fill(SKIN)}/>` +
  `<circle cx="44.5" cy="${cy - 2}" r="1.9" style="fill:var(--court-line)"/>` +
  `<circle cx="55.5" cy="${cy - 2}" r="1.9" style="fill:var(--court-line)"/>` +
  `<path d="M50 ${cy}L48 ${cy + 6}H51" style="fill:none;${LINE};stroke-width:1.4"/>`;
/** A staff held at the side: an outline, then the wood or gold over it. */
const staff = (x: number, top: number, paint: string, width: number): string =>
  `<path d="M${x} 128V${top}" style="fill:none;stroke:var(--court-line);stroke-width:${width + 2.6};stroke-linecap:round"/>` +
  `<path d="M${x} 128V${top}" style="fill:none;stroke:${paint};stroke-width:${width};stroke-linecap:round"/>`;

const JACK =
  staff(84, 64, HAIR, 2.4) +
  `<path d="M84 52L90 64H78Z" ${fill(GOLD)}/>` +
  ROBE +
  COLLAR +
  NECK +
  `<path d="M36 54C34 64 36 72 40 76H60C64 72 66 64 64 54Z" ${fill(HAIR)}/>` +
  face(60) +
  `<path d="M44 68C47 66 53 66 56 68C53 69 47 69 44 68Z" ${fill(HAIR)}/>` +
  `<path d="M30 48C30 32 70 32 72 46C62 42 42 42 30 48Z" ${fill(SUIT)}/>` +
  `<path d="M31 46C42 41 62 41 71 45L71 50C62 46 42 46 31 51Z" ${fill(GOLD)}/>` +
  `<path d="M62 38C70 26 82 22 88 24C80 28 74 34 66 40Z" ${fill(GOLD)}/>`;

const QUEEN =
  ROBE +
  COLLAR +
  NECK +
  `<path d="M33 52C26 70 28 90 38 96L42 80C38 72 37 62 38 54ZM67 52C74 70 72 90 62 96L58 80C62 72 63 62 62 54Z" ${fill(HAIR)}/>` +
  face(58) +
  `<path d="M35 50C38 40 62 40 65 50C60 46 40 46 35 50Z" ${fill(HAIR)}/>` +
  `<path d="M36 44Q38 34 43 40Q46 28 50 36Q54 28 57 40Q62 34 64 44Z" ${fill(GOLD)}/>` +
  `<circle cx="50" cy="40.5" r="2.2" ${fill(SUIT)}/>` +
  `<path d="M54 64.5C52.5 66 47.5 66 46 64.5" style="fill:none;${LINE};stroke-width:1.4"/>` +
  `<path d="M24 92L20 84" style="fill:none;stroke:var(--court-line);stroke-width:2"/>` +
  `<circle cx="18" cy="80" r="5" ${fill(SUIT)}/>` +
  `<circle cx="18" cy="80" r="2" ${fill(GOLD)}/>`;

const KING =
  staff(80, 70, GOLD, 3) +
  `<circle cx="80" cy="66" r="5.5" ${fill(GOLD)}/>` +
  ROBE +
  COLLAR +
  NECK +
  `<path d="M34 50C30 66 32 80 40 88H60C68 80 70 66 66 50Z" ${fill(HAIR)}/>` +
  face(58) +
  `<path d="M37 64C38 80 62 80 63 64C59 71 41 71 37 64Z" ${fill(HAIR)}/>` +
  `<path d="M44 67C47 65 53 65 56 67" style="fill:none;${LINE};stroke:var(--court-hair);stroke-width:2.4"/>` +
  `<path d="M33 45V26L40 35L45 20L50 32L55 20L60 35L67 26V45Z" ${fill(GOLD)}/>` +
  `<path d="M33 40H67V46H33Z" ${fill(GOLD)}/>` +
  `<circle cx="50" cy="43" r="2.4" ${fill(SUIT)}/>` +
  `<circle cx="40" cy="43" r="1.8" ${fill(SUIT)}/>` +
  `<circle cx="60" cy="43" r="1.8" ${fill(SUIT)}/>`;

/** The figures by rank: 11 the jack, 12 the queen, 13 the king. */
export const COURTS: Readonly<Record<11 | 12 | 13, string>> = { 11: JACK, 12: QUEEN, 13: KING };

/** The id of a figure's symbol on the page. */
export const courtSymbolId = (rank: 11 | 12 | 13): string => `sol-court-${rank}`;

/** Every figure as a symbol, for the hidden <svg> on the page. */
export function courtSymbols(): string {
  return ([11, 12, 13] as const).map((rank) => `<symbol id="${courtSymbolId(rank)}" viewBox="0 0 100 130">${COURTS[rank]}</symbol>`).join('');
}
