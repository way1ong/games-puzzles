// The pictures of the field, drawn in code (docs/mines/SPEC.md, "Налаштування": mines or flowers): a mine — a round
// shell with spikes and a shine; a flower — five petals round a heart; a flag on its pole. One set of symbols for the
// page; a cell shows one with <use>. Colours are tokens (tokens.css), so the themes and the contrast test hold them.
import { svg } from '../../../shared/ui/dom.ts';
import type { Theme } from '../config.ts';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** The symbols' ids. */
export const SYMBOL = { mine: 'mines-mine', flower: 'mines-flower', flag: 'mines-flag' } as const;

const spikes = Array.from({ length: 8 }, (_, i) => {
  const a = (i * Math.PI) / 4;
  const x = (r: number) => (12 + Math.cos(a) * r).toFixed(2);
  const y = (r: number) => (12 + Math.sin(a) * r).toFixed(2);
  return `M${x(5.5)} ${y(5.5)}L${x(9.5)} ${y(9.5)}`;
}).join('');

const petals = Array.from({ length: 5 }, (_, i) => {
  const a = (i * 2 * Math.PI) / 5 - Math.PI / 2;
  return `<ellipse cx="${(12 + Math.cos(a) * 5.2).toFixed(2)}" cy="${(12 + Math.sin(a) * 5.2).toFixed(2)}" rx="3.6" ry="3.6" class="art-petal"/>`;
}).join('');

/** The page's set of the field's pictures (hidden; cells use them). */
export function artSymbols(): SVGSVGElement {
  return svg(
    `<svg xmlns="${SVG_NS}" class="art-sprite" aria-hidden="true" focusable="false">` +
      `<symbol id="${SYMBOL.mine}" viewBox="0 0 24 24"><path d="${spikes}" class="art-spike"/><circle cx="12" cy="12" r="6.4" class="art-mine"/><circle cx="9.7" cy="9.7" r="1.7" class="art-shine"/></symbol>` +
      `<symbol id="${SYMBOL.flower}" viewBox="0 0 24 24">${petals}<circle cx="12" cy="12" r="3.1" class="art-heart"/></symbol>` +
      `<symbol id="${SYMBOL.flag}" viewBox="0 0 24 24"><path d="M8 20.5V4" class="art-pole"/><path d="M8.2 4.2h9.6l-2.7 3.9 2.7 3.9H8.2Z" class="art-flag"/><path d="M5 20.5h7" class="art-pole"/></symbol>` +
      `</svg>`,
  );
}

/** A picture of the field: what hides in it (by the theme), or the flag. */
export function artUse(what: 'hidden' | 'flag', theme: Theme): SVGSVGElement {
  const id = what === 'flag' ? SYMBOL.flag : theme === 'flowers' ? SYMBOL.flower : SYMBOL.mine;
  return svg(`<svg xmlns="${SVG_NS}" class="art" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="#${id}"/></svg>`);
}
