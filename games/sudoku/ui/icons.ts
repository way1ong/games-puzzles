// Small signs of the screen: back, undo, redo, notes, hint, erase, fill notes, solved. Drawn with the text
// colour of the place they stand in.
import { svg } from '../../../shared/ui/dom.ts';

const sign = (inner: string): SVGSVGElement =>
  svg(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="sign" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`,
  );

export const backSign = (): SVGSVGElement => sign('<path d="M14.5 5.5 8 12l6.5 6.5"/>');

export const undoSign = (): SVGSVGElement => sign('<path d="M9 7 4.5 11.5 9 16"/><path d="M5 11.5h9a5 5 0 0 1 0 10h-3"/>');

export const redoSign = (): SVGSVGElement => sign('<path d="m15 7 4.5 4.5L15 16"/><path d="M19 11.5h-9a5 5 0 0 0 0 10h3"/>');

export const notesSign = (): SVGSVGElement =>
  sign('<path d="M14.5 4.5 19.5 9.5 9 20H4v-5L14.5 4.5Z"/><path d="m12.5 6.5 5 5"/>');

export const hintSign = (): SVGSVGElement =>
  sign('<path d="M9 17.5h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.4 1.1 2.2v1.5h5V16c0-.8.4-1.6 1.1-2.2A6 6 0 0 0 12 3Z"/>');

export const eraseSign = (): SVGSVGElement =>
  sign('<path d="M8.5 20H20"/><path d="m4.6 14.6 9.9-9.9a2 2 0 0 1 2.8 0l2.5 2.5a2 2 0 0 1 0 2.8L12 18.8a4 4 0 0 1-5.7 0l-1.7-1.6a1.8 1.8 0 0 1 0-2.6Z"/><path d="m9 10 6 6"/>');

export const fillSign = (): SVGSVGElement =>
  sign(
    '<rect x="3.5" y="3.5" width="17" height="17" rx="2.5"/><g fill="currentColor" stroke="none"><circle cx="8.5" cy="8.5" r="1.4"/><circle cx="15.5" cy="8.5" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="8.5" cy="15.5" r="1.4"/><circle cx="15.5" cy="15.5" r="1.4"/></g>',
  );

export const checkSign = (): SVGSVGElement => sign('<path d="M5 12.5l4.5 4.5L19 7.5"/>');
