// The four suits, our own drawings in SVG code (docs/solitaire/SPEC.md, "Карти"): not signs of a font, which some
// phones turn into coloured pictures. Each suit has a shape of its own; the colour comes from the card
// (`currentColor`, from styles/tokens.css). The page holds them once as symbols (`sol-<suit>`); a card shows one
// with <use>.
import type { Suit } from '../core/cards.ts';

const SHAPES: Record<Suit, string> = {
  spades:
    '<path d="M50 5C62 25 93 40 93 63C93 77 82 85 70 85C62 85 56 81 53 75C54 84 59 91 67 96H33C41 91 46 84 47 75C44 81 38 85 30 85C18 85 7 77 7 63C7 40 38 25 50 5Z"/>',
  hearts: '<path d="M50 90C18 67 5 48 5 31C5 16 16 6 30 6C39 6 46 11 50 19C54 11 61 6 70 6C84 6 95 16 95 31C95 48 82 67 50 90Z"/>',
  clubs:
    '<circle cx="50" cy="27" r="20"/><circle cx="27" cy="58" r="20"/><circle cx="73" cy="58" r="20"/><path d="M50 40L57 64C58 79 61 89 68 96H32C39 89 42 79 43 64Z"/>',
  diamonds: '<path d="M50 3C61 21 74 36 91 50C74 64 61 79 50 97C39 79 26 64 9 50C26 36 39 21 50 3Z"/>',
};

/** The id of a suit's symbol on the page. */
export const suitSymbolId = (suit: Suit) => `sol-${suit}`;

/** Every suit as a symbol, for one hidden <svg> on the page. */
export function suitSymbols(): string {
  return (Object.keys(SHAPES) as Suit[])
    .map((suit) => `<symbol id="${suitSymbolId(suit)}" viewBox="0 0 100 100" fill="currentColor">${SHAPES[suit]}</symbol>`)
    .join('');
}

/** The inside of a suit's 100 × 100 box (for drawings that are not on the page, e.g. the icons). */
export const suitShape = (suit: Suit): string => SHAPES[suit];
