// What the shapes of a room refer to by name: gradients (wall, floor, sky, the roundness of things, lamp
// light), soft shadows, the wallpaper and wood patterns. The names carry the room's prefix, so two
// drawings on one page do not mix.
import type { Paint } from './palette.ts';
import { el, path } from './svg.ts';

export type DefName =
  | 'wall'
  | 'floor'
  | 'sky'
  | 'spine'
  | 'round'
  | 'glow'
  | 'vignette'
  | 'soft'
  | 'softer'
  | 'wallpaper'
  | 'grain'
  | 'tiles'
  | 'arch'
  | 'frieze'
  | 'street';

export interface Ctx {
  p: Paint;
  night: boolean;
  /** A reference to a definition: `fill="${c.ref('round')}"`. */
  ref(name: DefName): string;
  /** The name of a definition itself. */
  id(name: DefName): string;
}

export function context(p: Paint, night: boolean, prefix: string): Ctx {
  const id = (name: DefName) => `${prefix}-${name}`;
  return { p, night, id, ref: (name) => `url(#${id(name)})` };
}

const stop = (offset: number, colour: string, opacity?: number): string =>
  el('stop', { offset, 'stop-color': colour, 'stop-opacity': opacity });

const linear = (id: string, vertical: boolean, stops: string): string =>
  el('linearGradient', { id, x1: 0, y1: 0, x2: vertical ? 0 : 1, y2: vertical ? 1 : 0 }, stops);

/** `extra` — what only this room refers to (its own patterns). */
export function sceneDefs(c: Ctx, extra = ''): string {
  const { p, night } = c;
  const blur = (name: DefName, amount: number) =>
    el('filter', { id: c.id(name), x: '-30%', y: '-30%', width: '160%', height: '160%' }, el('feGaussianBlur', { stdDeviation: amount }));
  return el(
    'defs',
    {},
    linear(c.id('wall'), true, stop(0, p.wallTop) + stop(1, p.wallBottom)) +
      linear(c.id('floor'), true, stop(0, p.floorTop) + stop(1, p.floorBottom)) +
      linear(c.id('sky'), true, stop(0, p.skyTop) + stop(1, p.skyBottom)) +
      // a book's spine: light from the left
      linear(c.id('spine'), false, stop(0, p.white, 0.18) + stop(0.35, p.white, 0) + stop(1, p.black, 0.22)) +
      // roundness: light from above, shade below
      linear(c.id('round'), true, stop(0, p.white, 0.22) + stop(0.5, p.white, 0) + stop(1, p.black, 0.22)) +
      el('radialGradient', { id: c.id('glow'), cx: 0.5, cy: 0.5, r: 0.5 }, stop(0, p.lamp, night ? 0.55 : 0.18) + stop(1, p.lamp, 0)) +
      el('radialGradient', { id: c.id('vignette'), cx: 0.5, cy: 0.45, r: 0.75 }, stop(0.55, p.black, 0) + stop(1, p.black, night ? 0.55 : 0.12)) +
      blur('soft', 6) +
      blur('softer', 14) +
      el(
        'pattern',
        { id: c.id('wallpaper'), width: 46, height: 46, patternUnits: 'userSpaceOnUse' },
        path('M23 8 q6 7 0 14 q-6 -7 0 -14Z M8 30 q4 4 0 8 q-4 -4 0 -8Z M38 30 q4 4 0 8 q-4 -4 0 -8Z', p.wallMotif),
      ) +
      el(
        'pattern',
        { id: c.id('grain'), width: 120, height: 14, patternUnits: 'userSpaceOnUse' },
        el('path', { d: 'M0 4 q30 -3 60 0 t60 0 M0 10 q40 3 80 0 t40 0', fill: 'none', stroke: p.black, 'stroke-opacity': 0.08, 'stroke-width': 1.2 }),
      ) +
      extra,
  );
}

/** A soft shadow on the floor under a thing. */
export function floorShadow(c: Ctx, cx: number, cy: number, rx: number, ry: number, opacity = 0.28): string {
  return el('ellipse', { cx, cy, rx, ry, fill: c.p.shadow, opacity, filter: c.ref('soft') });
}
