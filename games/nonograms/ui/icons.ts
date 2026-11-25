// Small signs of the screen: back, fill, cross, undo, hint, the whole picture, done. Drawn with the text colour of the
// place they stand in.
import { svg } from '../../../shared/ui/dom.ts';

const sign = (inner: string): SVGSVGElement =>
  svg(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="sign" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`,
  );

export const backSign = (): SVGSVGElement => sign('<path d="M14.5 5.5 8 12l6.5 6.5"/>');

/** A filled square: what a tap puts in the fill mode. */
export const fillSign = (): SVGSVGElement => sign('<rect x="5" y="5" width="14" height="14" rx="1.5" fill="currentColor"/>');

/** A cross in a square: what a tap puts in the cross mode. */
export const crossSign = (): SVGSVGElement => sign('<rect x="4.5" y="4.5" width="15" height="15" rx="1.5"/><path d="m8.5 8.5 7 7m0-7-7 7"/>');

export const undoSign = (): SVGSVGElement => sign('<path d="M9 7 4.5 11.5 9 16"/><path d="M5 11.5h9a5 5 0 0 1 0 10h-3"/>');

export const hintSign = (): SVGSVGElement =>
  sign('<path d="M9 17.5h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.4 1.1 2.2v1.5h5V16c0-.8.4-1.6 1.1-2.2A6 6 0 0 0 12 3Z"/>');

/** Four corners: the whole grid in sight. */
export const wholeSign = (): SVGSVGElement => sign('<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/><rect x="8.5" y="8.5" width="7" height="7" rx="1"/>');

export const checkSign = (): SVGSVGElement => sign('<path d="M5 12.5l4.5 4.5L19 7.5"/>');
