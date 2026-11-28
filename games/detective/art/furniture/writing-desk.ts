// The customers' writing desk: a tall desk to write at standing, with a little gallery rail along its back, an
// inkwell in the middle with a pen on a chain fixed to the rail, and a shelf below with piles of blank forms.
import { floorShadow, type Ctx } from '../defs.ts';
import { circle, ellipse, g, path, rect, rects, stroke } from '../svg.ts';

export interface WritingDesk {
  x: number;
  w: number;
  top: number;
  foot: number;
  /** Where the inkwell stands (`half` — how far it reaches either way, the pen with it). */
  inkwell: { x: number; half: number };
}

/** A glass inkwell with a brass lid on a wooden stand, a dip pen standing in the stand; `y` — the desk it stands on. */
function inkwell(c: Ctx, x: number, y: number): string {
  const { p } = c;
  return (
    rect(x - 18, y - 7, 36, 7, p.woodMid, { rx: 2 }) +
    rect(x - 18, y - 7, 36, 2, p.white, { opacity: 0.15, rx: 1 }) +
    path(`M${x - 12} ${y - 7} l0 -13 q0 -6 6 -6 l12 0 q6 0 6 6 l0 13Z`, p.glass, { stroke: p.glassEdge, 'stroke-width': 1.2, 'fill-opacity': 0.85 }) +
    rect(x - 11, y - 18, 22, 11, p.ink, { rx: 2, opacity: 0.85 }) +
    rect(x - 8, y - 30, 16, 5, p.brass, { rx: 2 }) +
    circle(x, y - 31, 2.6, p.brassDark) +
    stroke(`M${x - 9} ${y - 22} q-2 6 0 11`, p.white, 1.6, { opacity: 0.55 }) +
    // the pen stands in a hole of the stand, leaning a little
    g(`translate(${x + 14} ${y - 7}) rotate(12)`, rect(-1.7, -30, 3.4, 26, p.woodDark, { rx: 1.7 }) + path('M-1.7 -4 l1.7 6 l1.7 -6Z', p.steel)) +
    ellipse(x + 14, y - 7, 3, 1.2, p.black, { opacity: 0.5 })
  );
}

export function writingDesk(c: Ctx, m: WritingDesk): string {
  const { p } = c;
  const { x, w, top, foot } = m;
  let s = floorShadow(c, x + w / 2, foot + 6, w / 2 + 10, 10, 0.32);
  // the legs, the shelf with forms, the apron
  for (const lx of [x + 10, x + w - 24]) s += path(`M${lx} ${top + 20} l14 0 l-2 ${foot - top - 20} l-10 0Z`, p.woodDark);
  const shelf = foot - 46;
  s += rect(x + 10, shelf, w - 20, 8, p.wood) + rect(x + 10, shelf + 6, w - 20, 2, p.black, { opacity: 0.25 });
  // four piles of blank forms, a pale colour for each kind, the sheets a little out of line
  [p.feather, p.glass, p.icing, p.cream].forEach((fill, i) => {
    const sheets = Array.from({ length: 4 + ((i * 7) % 4) }, (_, k) => [x + 28 + i * 34 + (k % 2), shelf - 3 * (k + 1), 28, 3] as const);
    s += rects(sheets, fill, { stroke: p.paperShade, 'stroke-width': 0.6 });
  });
  s += rect(x + 4, top + 18, w - 8, 18, p.wood) + rect(x + 4, top + 18, w - 8, 18, c.ref('grain'));
  // the gallery along the back: a thin rail on little balusters
  for (let bx = x + 10; bx <= x + w - 14; bx += (w - 24) / 8) s += rect(bx, top - 18, 4, 18, p.woodMid, { rx: 2 }) + ellipse(bx + 2, top - 9, 3.2, 3, p.woodMid);
  s += rect(x + 6, top - 24, w - 12, 7, p.woodMid, { rx: 3 }) + rect(x + 6, top - 24, w - 12, 2, p.white, { opacity: 0.15, rx: 1 });
  // the top
  s += rect(x - 6, top, w + 12, 20, p.woodDark, { rx: 4 }) + rect(x - 6, top, w + 12, 4, p.white, { opacity: 0.12, rx: 2 }) + rect(x - 6, top, w + 12, 20, c.ref('grain'), { rx: 4 });
  const ix = m.inkwell.x;
  s += inkwell(c, ix, top);
  // the chain from an eye on the rail to the pen
  s += circle(ix + 18, top - 20, 2.2, 'none', { stroke: p.brassDark, 'stroke-width': 1.4 });
  return s + stroke(`M${ix + 18} ${top - 18} q5 6 -1 9`, p.steel, 1.4, { 'stroke-dasharray': '1.6 1.4' });
}
