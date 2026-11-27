// Small signs of the screen: back, undo, hint, one more bottle, start again, done. Drawn with the text colour of the
// place they stand in.
import { svg } from '../../../shared/ui/dom.ts';

const sign = (inner: string): SVGSVGElement =>
  svg(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="sign" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`,
  );

export const backSign = (): SVGSVGElement => sign('<path d="M14.5 5.5 8 12l6.5 6.5"/>');

export const undoSign = (): SVGSVGElement => sign('<path d="M9 7 4.5 11.5 9 16"/><path d="M5 11.5h9a5 5 0 0 1 0 10h-3"/>');

export const hintSign = (): SVGSVGElement =>
  sign('<path d="M9 17.5h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.4 1.1 2.2v1.5h5V16c0-.8.4-1.6 1.1-2.2A6 6 0 0 0 12 3Z"/>');

/** An empty bottle with a plus: one more bottle. */
export const bottleSign = (): SVGSVGElement => sign('<path d="M6 3.5h6M7 3.5v14a2 2 0 0 0 4 0v-14"/><path d="M18 12v8M14 16h8"/>');

/** A round arrow back to the start. */
export const againSign = (): SVGSVGElement => sign('<path d="M5 12a7 7 0 1 0 2.05-4.95"/><path d="M4.5 4.5v4h4"/>');

export const checkSign = (): SVGSVGElement => sign('<path d="M5 12.5l4.5 4.5L19 7.5"/>');
