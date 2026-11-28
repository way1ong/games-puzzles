// Small signs of the screen: back, the hint, the picture, zoom in, the whole board, a new puzzle, any picture, done.
// Drawn with the text colour of the place they stand in.
import { svg } from '../../../shared/ui/dom.ts';

const sign = (inner: string): SVGSVGElement =>
  svg(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="sign" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`,
  );

export const backSign = (): SVGSVGElement => sign('<path d="M14.5 5.5 8 12l6.5 6.5"/>');

export const hintSign = (): SVGSVGElement =>
  sign('<path d="M9 17.5h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.4 1.1 2.2v1.5h5V16c0-.8.4-1.6 1.1-2.2A6 6 0 0 0 12 3Z"/>');

/** A framed picture with hills and a sun: show the picture whole. */
export const pictureSign = (): SVGSVGElement => sign('<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="m4 17 5-5 4 4 2.5-2.5 4.5 4.5"/><circle cx="15.5" cy="9" r="1.5"/>');

/** A magnifier with a plus: zoom in. */
export const zoomSign = (): SVGSVGElement => sign('<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5M10.5 7.5v6M7.5 10.5h6"/>');

/** Four corners pointing out: the whole board. */
export const wholeSign = (): SVGSVGElement => sign('<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/>');

/** A puzzle piece: a new puzzle. */
export const newSign = (): SVGSVGElement =>
  sign('<path d="M5 8h3.2a2.3 2.3 0 1 1 4.6 0H16v3.2a2.3 2.3 0 1 1 0 4.6V19H5v-3.2a2.3 2.3 0 1 0 0-4.6Z"/>');

/** A die: any picture. */
export const anySign = (): SVGSVGElement =>
  sign('<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r="1" fill="currentColor"/><circle cx="15" cy="15" r="1" fill="currentColor"/><circle cx="15" cy="9" r="1" fill="currentColor"/><circle cx="9" cy="15" r="1" fill="currentColor"/>');

export const checkSign = (): SVGSVGElement => sign('<path d="M5 12.5l4.5 4.5L19 7.5"/>');
