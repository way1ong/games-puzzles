// Small signs of the screen: back, undo, hint, start again, the picture, the goal, done. Drawn with the text colour of the
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

/** A round arrow back to the start. */
export const againSign = (): SVGSVGElement => sign('<path d="M5 12a7 7 0 1 0 2.05-4.95"/><path d="M4.5 4.5v4h4"/>');

/** A framed picture with hills and a sun: show the picture whole. */
export const pictureSign = (): SVGSVGElement => sign('<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="m4 17 5-5 4 4 2.5-2.5 4.5 4.5"/><circle cx="15.5" cy="9" r="1.5"/>');

/** A small board of four tiles, one corner empty: the tiles in order — the goal. */
export const goalSign = (): SVGSVGElement => sign('<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/>');

export const checkSign = (): SVGSVGElement => sign('<path d="M5 12.5l4.5 4.5L19 7.5"/>');
