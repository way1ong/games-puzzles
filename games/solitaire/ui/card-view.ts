// One card on the screen (docs/solitaire/SPEC.md, "Карти"): a button with the value and the suit in its corner — seen
// even when another card lies on it — and in the middle a big suit, or the letter of a face with its suit (in the
// drawn look, the figure of the jack, queen or king instead); the back when it lies face down. Its colour comes from
// its suit (styles/tokens.css); the letters, from the dictionary.
import { h } from '../../../shared/ui/dom.ts';
import { courtSymbolId } from '../art/courts.ts';
import { suitSymbolId } from '../art/suits.ts';
import { SUITS, rankOf, suitOf, type Card } from '../core/cards.ts';
import type { Dict } from './i18n.ts';
import { cardSign } from './names.ts';

const SVG_NS = 'http://www.w3.org/2000/svg';
const FACES = 11;

function suitSign(card: Card, cls: string): SVGSVGElement {
  const s = document.createElementNS(SVG_NS, 'svg');
  s.setAttribute('class', cls);
  s.setAttribute('viewBox', '0 0 100 100');
  s.setAttribute('aria-hidden', 'true');
  s.setAttribute('focusable', 'false');
  const use = document.createElementNS(SVG_NS, 'use');
  use.setAttribute('href', `#${suitSymbolId(SUITS[suitOf(card)]!)}`);
  s.append(use);
  return s;
}

/** The figure of a jack, queen or king (the drawn look shows it in place of the letter). */
function figure(rank: 11 | 12 | 13): SVGSVGElement {
  const s = document.createElementNS(SVG_NS, 'svg');
  s.setAttribute('class', 'card__figure');
  s.setAttribute('viewBox', '0 0 100 130');
  s.setAttribute('preserveAspectRatio', 'xMidYMax meet');
  s.setAttribute('aria-hidden', 'true');
  s.setAttribute('focusable', 'false');
  const use = document.createElementNS(SVG_NS, 'use');
  use.setAttribute('href', `#${courtSymbolId(rank)}`);
  s.append(use);
  return s;
}

export interface CardView {
  el: HTMLButtonElement;
  /** Writes the letters of the language. */
  paint(d: Dict): void;
}

export function createCardView(card: Card): CardView {
  const rank = rankOf(card);
  const corner = h('span', { class: 'card__rank' });
  const letter = h('span', { class: 'card__letter' });
  const middle =
    rank >= FACES
      ? h('span', { class: 'card__middle card__middle--face' }, letter, suitSign(card, 'card__face-suit'))
      : h('span', { class: 'card__middle' }, suitSign(card, rank === 1 ? 'card__big card__big--ace' : 'card__big'));
  // The signs on the card are its picture: its name in words is the button's label (table-view.ts).
  middle.setAttribute('aria-hidden', 'true');
  const index = h('span', { class: 'card__index', 'aria-hidden': 'true' }, corner, suitSign(card, 'card__pip'));
  const el = h('button', { class: `card suit-${suitOf(card)}`, type: 'button', tabindex: -1 }, index, middle, rank >= FACES ? figure(rank as 11 | 12 | 13) : null);
  el.dataset.card = String(card);
  return {
    el,
    paint(d) {
      // drawn by the style sheet from the attribute: the sign is part of the card's picture, not text to read
      const sign = cardSign(card, d);
      corner.dataset.sign = sign;
      corner.classList.toggle('is-wide', sign.length > 1);
      letter.dataset.sign = sign;
    },
  };
}
