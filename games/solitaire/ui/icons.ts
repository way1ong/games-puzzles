// Small signs of the screen: back, hint, undo, new deal, turning the waste over, done. Drawn with the text colour of
// the place they stand in.
import { svg } from '../../../shared/ui/dom.ts';

const sign = (inner: string): SVGSVGElement =>
  svg(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="sign" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`,
  );

export const backSign = (): SVGSVGElement => sign('<path d="M14.5 5.5 8 12l6.5 6.5"/>');

export const hintSign = (): SVGSVGElement =>
  sign('<path d="M9 17.5h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.4 1.1 2.2v1.5h5V16c0-.8.4-1.6 1.1-2.2A6 6 0 0 0 12 3Z"/>');

export const undoSign = (): SVGSVGElement => sign('<path d="M9 7 4.5 11.5 9 16"/><path d="M5 11.5h9a5 5 0 0 1 0 10h-3"/>');

/** Two cards fanned out: a new deal. */
export const dealSign = (): SVGSVGElement =>
  sign('<rect x="3.5" y="6" width="10" height="14" rx="1.8" transform="rotate(-10 8.5 13)"/><rect x="10.5" y="4" width="10" height="14" rx="1.8" transform="rotate(8 15.5 11)"/>');

/** A round arrow: the waste turns over into the stock. */
export const turnSign = (): SVGSVGElement => sign('<path d="M19 12a7 7 0 1 1-2.05-4.95"/><path d="M19.5 4.5v4h-4"/>');

export const checkSign = (): SVGSVGElement => sign('<path d="M5 12.5l4.5 4.5L19 7.5"/>');
