// How a colour picture's paints look on the screen (docs/nonograms/SPEC.md, "Кольорові малюнки"): each its colour and
// the ink of its numbers and pattern (art/palette.ts), and its pattern (styles/app.css, .pat-1 …): the first paint that
// stands out on the sheet by itself goes plain, every other one has a pattern of its own — so no two paints of a
// picture are told apart by colour alone, and a light paint is seen on the light sheet by its pattern.
import { PAINT_LOOK, PALETTE, type Colour } from '../art/palette.ts';
import { NONOGRAMS } from '../config.ts';

export interface PaintLook {
  colour: string;
  ink: string;
  /** Its pattern: 0 — plain. */
  pattern: number;
}

/** The looks of a picture's paints (palette letters), in their order. */
export function paintLooks(paints: readonly string[]): PaintLook[] {
  let plainTaken = false;
  let next = 1;
  return paints.map((letter) => {
    const own = PAINT_LOOK[letter as Colour];
    const plain = own.plain && !plainTaken;
    plainTaken ||= plain;
    return { colour: PALETTE[letter as Colour], ink: own.ink, pattern: plain ? 0 : next++ };
  });
}

/** Every pattern's class: a picture may have a pattern for each of its paints. */
const PATTERNS = Array.from({ length: NONOGRAMS.colour.maxPaints + 1 }, (_, i) => `pat-${i}`);

/** Dresses an element in a paint — its colour and ink as custom properties, its pattern as a class — or takes it off. */
export function dress(el: HTMLElement, look: PaintLook | null): void {
  el.classList.remove('is-paint', ...PATTERNS);
  if (!look) {
    el.style.removeProperty('--paint');
    el.style.removeProperty('--paint-ink');
    return;
  }
  el.style.setProperty('--paint', look.colour);
  el.style.setProperty('--paint-ink', look.ink);
  el.classList.add('is-paint', `pat-${look.pattern}`);
}
