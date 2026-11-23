// The drawings are SVG text built by small functions: a room is about a thousand shapes, and text is the
// lightest way to make them. Nothing here comes from a player: only our own numbers and colours.

export type Attrs = Record<string, string | number | undefined>;

function attrs(a: Attrs): string {
  let out = '';
  for (const [name, value] of Object.entries(a)) if (value !== undefined) out += ` ${name}="${value}"`;
  return out;
}

export function el(tag: string, a: Attrs = {}, inner?: string): string {
  return inner === undefined ? `<${tag}${attrs(a)}/>` : `<${tag}${attrs(a)}>${inner}</${tag}>`;
}

export const rect = (x: number, y: number, w: number, h: number, fill: string, a: Attrs = {}): string =>
  el('rect', { x, y, width: w, height: h, fill, ...a });

export const circle = (cx: number, cy: number, r: number, fill: string, a: Attrs = {}): string => el('circle', { cx, cy, r, fill, ...a });

export const ellipse = (cx: number, cy: number, rx: number, ry: number, fill: string, a: Attrs = {}): string =>
  el('ellipse', { cx, cy, rx, ry, fill, ...a });

export const path = (d: string, fill: string, a: Attrs = {}): string => el('path', { d, fill, ...a });

/** A line along a path, with round ends. */
export const stroke = (d: string, colour: string, width: number, a: Attrs = {}): string =>
  el('path', { d, fill: 'none', stroke: colour, 'stroke-width': width, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', ...a });

export const line = (x1: number, y1: number, x2: number, y2: number, colour: string, width: number, a: Attrs = {}): string =>
  el('line', { x1, y1, x2, y2, stroke: colour, 'stroke-width': width, 'stroke-linecap': 'round', ...a });

/** A group: moved or turned (`transform` text), or with any attributes. */
export const g = (a: Attrs | string, inner: string): string => el('g', typeof a === 'string' ? { transform: a } : a, inner);

/** A number short enough for SVG text. */
export const n = (value: number): number => Number(value.toFixed(2));
