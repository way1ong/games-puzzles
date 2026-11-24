// Small signs of the screen: back, shuffle, clear, check, hint, bonus words, report, solved. Drawn with the text
// colour of the place they stand in.
import { svg } from '../../../shared/ui/dom.ts';

const sign = (inner: string): SVGSVGElement =>
  svg(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="sign" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`,
  );

export const backSign = (): SVGSVGElement => sign('<path d="M14.5 5.5 8 12l6.5 6.5"/>');

export const shuffleSign = (): SVGSVGElement =>
  sign('<path d="M4 7h3.5c4 0 5 10 9 10H20"/><path d="M4 17h3.5c1.6 0 2.7-1.6 3.6-3.5"/><path d="M13 9.5c.9-1.4 2-2.5 3.5-2.5H20"/><path d="m17.5 4.5 2.5 2.5-2.5 2.5"/><path d="m17.5 14.5 2.5 2.5-2.5 2.5"/>');

export const clearSign = (): SVGSVGElement => sign('<path d="M20 6H9l-5 6 5 6h11z"/><path d="m12.5 9.5 5 5M17.5 9.5l-5 5"/>');

export const checkSign = (): SVGSVGElement => sign('<path d="M5 12.5l4.5 4.5L19 7.5"/>');

export const hintSign = (): SVGSVGElement =>
  sign('<path d="M9 17.5h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.4 1.1 2.2v1.5h5V16c0-.8.4-1.6 1.1-2.2A6 6 0 0 0 12 3Z"/>');

export const bonusSign = (): SVGSVGElement => sign('<path d="m12 3.5 2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8Z"/>');

export const reportSign = (): SVGSVGElement => sign('<path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/>');
