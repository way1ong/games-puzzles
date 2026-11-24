// The things to find, drawn as they rest: the origin of every drawing is the middle of its bottom edge, and
// the drawing stays inside the size given in core/things.ts. Evidence takes its colour from the trait it
// points at (the same colours as on the portraits).
import type { Time } from '../core/cases.ts';
import type { Placed } from '../core/placement.ts';
import { shapeOf, sizeOf, type Shape, type ThingId } from '../core/things.ts';
import type { Buttons, Hair, Scarf } from '../core/traits.ts';
import { buttonArt } from './button.ts';
import { FLOWER, HAIR_PAINT, SCARF_PAINT, thingPaint, type Paint } from './palette.ts';
import { circle, el, ellipse, g, line, path, rect, stroke } from './svg.ts';

/** A pale edge under thin evidence, so a hair or a thread shows on any ground. */
const halo = (d: string, p: Paint, width: number): string => stroke(d, p.paper, width, { opacity: 0.55 });

const DRAW: Record<Shape, (p: Paint, value: string | undefined) => string> = {
  key: (p) =>
    circle(-14, -12, 9, 'none', { stroke: p.gold, 'stroke-width': 5 }) + rect(-6, -14.5, 30, 5, p.gold) + rect(16, -9.5, 4, 8, p.gold) + rect(10, -9.5, 4, 6, p.gold) + stroke('M-20 -17 q4 -4 10 -4', p.white, 1.6, { opacity: 0.5 }),
  magnifier: (p) =>
    line(6, -24, 27, -3, p.woodMid, 7) +
    line(6, -24, 10, -20, p.brass, 7, { 'stroke-linecap': 'butt' }) +
    circle(-8, -38, 18, p.glass, { stroke: p.brass, 'stroke-width': 5, 'fill-opacity': 0.85 }) +
    stroke('M-17 -44 q4 -8 12 -9', p.white, 3),
  watch: (p) =>
    stroke('M7 -30 C-6 -29 -12 -17 -11 -6 C-10.5 -2 -15 -1 -21 -1', p.goldDark, 2, { 'stroke-dasharray': '3 2' }) +
    rect(5, -32, 6, 5, p.goldDark) +
    circle(8, -14, 13, p.gold) +
    circle(8, -14, 9.5, p.paper) +
    line(8, -14, 8, -20, p.ink, 1.6) +
    line(8, -14, 13, -12, p.ink, 1.6),
  coin: (p) => circle(0, -13, 11, p.gold, { stroke: p.goldDark, 'stroke-width': 2 }) + circle(0, -13, 6.5, 'none', { stroke: p.goldDark, 'stroke-width': 1.5 }) + stroke('M-6 -19 q3 -3 7 -3.5', p.white, 1.6, { opacity: 0.5 }),
  envelope: (p) =>
    rect(-25, -33, 50, 32, p.linen, { stroke: p.linenEdge, 'stroke-width': 1.5 }) + stroke('M-25 -33 l25 19 l25 -19', p.linenEdge, 2) + circle(0, -13, 5, p.red),
  // lying: the feather's end and the nib touch what it lies on
  quill: (p) =>
    g(
      'translate(1 -14) rotate(-75) scale(0.95)',
      path('M0 -30 q12 14 6 40 l-6 6 l-6 -6 q-6 -26 6 -40Z', p.feather, { stroke: p.featherEdge, 'stroke-width': 1.5 }) + line(0, -26, 0, 20, p.featherEdge, 1.5) + path('M-2 16 l2 12 l2 -12Z', p.ink),
    ),
  // a candle in a holder with a handle; never lit
  candle: (p) =>
    stroke('M9 -6 q11 -1 10 -8 q-1 -6 -8 -3', p.goldDark, 2.6) +
    ellipse(-3, -4, 15, 4, p.goldDark) +
    ellipse(-3, -5.5, 11, 2.6, p.goldPale) +
    rect(-9, -30, 12, 26, p.cream, { rx: 2 }) +
    stroke('M-9 -27 q2 5 0 9', p.creamShade, 2) +
    stroke('M-3 -30 q-1 -3 1 -5', p.ink, 1.6),
  matches: (p) => rect(-16, -20, 32, 19, p.blue, { rx: 2 }) + rect(-16, -20, 32, 5, p.matchBrown) + rect(-9, -12, 18, 7, p.yellow) + rect(-16, -3, 32, 2, p.black, { opacity: 0.2 }),
  ring: (p) =>
    ellipse(0, -8, 10, 6, 'none', { stroke: p.gold, 'stroke-width': 4 }) + stroke('M-8 -11 q8 -5 16 0', p.white, 1.2, { opacity: 0.55 }) + path('M0 -22 l5 5 l-5 5 l-5 -5Z', p.red) + path('M0 -22 l5 5 l-5 0Z', p.white, { opacity: 0.35 }),
  pencil: (p) =>
    rect(-33, -9, 6, 8, p.eraser, { rx: 1.5 }) +
    rect(-27, -9, 5, 8, p.steel) +
    rect(-22, -9, 42, 8, p.pencil) +
    rect(-22, -9, 42, 2.4, p.white, { opacity: 0.3 }) +
    path('M20 -9 l10 4 l-10 4Z', p.pencilWood) +
    path('M27 -6.2 l5 1.2 l-5 1.2Z', p.ink),
  ticket: (p) =>
    rect(-21, -25, 42, 24, p.linen, { rx: 2, stroke: p.linenEdge, 'stroke-width': 1.2 }) +
    rect(-21, -25, 11, 24, p.red, { rx: 2 }) +
    el('line', { x1: -9, y1: -24, x2: -9, y2: -2, stroke: p.linenEdge, 'stroke-width': 1.2, 'stroke-dasharray': '2 2' }) +
    rect(-4, -19, 20, 3, p.scribble, { opacity: 0.7 }) +
    rect(-4, -13, 14, 2.5, p.scribble, { opacity: 0.5 }) +
    rect(-4, -8, 18, 2.5, p.scribble, { opacity: 0.5 }),
  pawn: (p) =>
    rect(-11, -6, 22, 6, p.linen, { rx: 2, stroke: p.linenEdge, 'stroke-width': 1 }) +
    path('M-8 -6 L-4 -23 L4 -23 L8 -6Z', p.linen, { stroke: p.linenEdge, 'stroke-width': 1 }) +
    ellipse(0, -23.5, 7, 2.6, p.linen, { stroke: p.linenEdge, 'stroke-width': 1 }) +
    circle(0, -31.5, 7, p.linen, { stroke: p.linenEdge, 'stroke-width': 1 }) +
    stroke('M-3 -35 q2 -2 5 -2', p.white, 1.4, { opacity: 0.7 }),
  // a woollen glove lying flat: the cuff, the palm with the thumb up, four fingers
  glove: (p) =>
    rect(-20, -19, 9, 17, p.cream, { rx: 2 }) +
    rect(-17.5, -19, 1.8, 17, p.greenDark, { opacity: 0.7 }) +
    rect(-14.2, -19, 1.8, 17, p.greenDark, { opacity: 0.7 }) +
    g('rotate(-28 -4 -19)', rect(-8, -28, 7, 12, p.green, { rx: 3.5 })) +
    rect(-12, -20, 18, 19, p.green, { rx: 5 }) +
    [0, 1, 2, 3].map((i) => rect(3, -20 + i * 4.8, i === 0 || i === 3 ? 14 : 17, 4.4, p.green, { rx: 2.2 })).join('') +
    stroke('M-8 -15 q7 -3 13 0', p.greenLight, 1.6, { opacity: 0.8 }) +
    stroke('M-8 -6 q7 2 12 0', p.greenDark, 1.4, { opacity: 0.6 }),
  // ---------- evidence ----------
  hair: (p, value) => {
    const d = 'M-18 -1 C-12 -20 4 -20 6 -8 C7 -1 16 -2 18 -10';
    const hair = HAIR_PAINT[value as Hair];
    return halo(d, p, 6) + stroke(d, hair.base, 3) + stroke('M-14 -6 C-9 -16 2 -17 4 -9', hair.light, 1.2, { opacity: 0.8 });
  },
  glasses: (p) =>
    ellipse(0, -10, 13, 9, p.glass, { stroke: p.glassEdge, 'stroke-width': 1.6 }) + stroke('M-12 -8 L-6 -11 L-2 -7 L3 -13 L7 -9 L12 -12', p.crack, 1.3) + stroke('M-8 -14 q4 -4 9 -4', p.white, 2),
  buttons: (_p, value) => buttonArt(value as Buttons, 0, -11, 10),
  scarf: (p, value) => {
    const d = 'M-20 -2 C-14 -16 -6 6 0 -5 C5 -14 12 -12 14 -4 C15 1 19 1 20 -5';
    return halo(d, p, 6) + stroke(d, SCARF_PAINT[value as Scarf].main, 2.8);
  },
  flower: () =>
    path('M-11 -3 C-10 -14 4 -17 11 -9 C6 -1 -4 1 -11 -3Z', FLOWER.petal, { stroke: FLOWER.edge, 'stroke-width': 1 }) + stroke('M-9 -4 C-3 -8 3 -10 8 -9', FLOWER.edge, 1, { opacity: 0.8 }),
};

/** The drawing of a thing around the middle of its bottom edge. */
export function thingArt(thing: ThingId, time: Time): string {
  return DRAW[shapeOf(thing)](thingPaint(time), thing.split(':')[1]);
}

/** A thing on its place in a room; lying things turn about their middle. */
export function placedThing(placed: Placed, time: Time): string {
  const { w, h } = sizeOf(placed.thing);
  const turn = placed.rot ? ` translate(0 ${-h / 2}) rotate(${placed.rot}) translate(0 ${h / 2})` : '';
  // data-box: the size the drawing must stay in (the browser audit measures the drawing against it)
  return el('g', { class: 'thing', 'data-thing': placed.thing, 'data-box': `${w} ${h}`, transform: `translate(${placed.x} ${placed.y})${turn}` }, thingArt(placed.thing, time));
}

/** A small picture of a thing for the list (its own SVG, daylight colours). */
export function thingIcon(thing: ThingId): string {
  const { w, h } = sizeOf(thing);
  const pad = 3;
  return el(
    'svg',
    { xmlns: 'http://www.w3.org/2000/svg', viewBox: `${-w / 2 - pad} ${-h - pad} ${w + 2 * pad} ${h + 2 * pad}`, class: 'thing-icon', 'aria-hidden': 'true', focusable: 'false' },
    thingArt(thing, 'day'),
  );
}
