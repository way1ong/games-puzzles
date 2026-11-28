// A stack of parcels on the floor: boxes wrapped in paper, tied crosswise with string, each with an address label,
// stamps and a blob of sealing wax. The string's knots are on the fronts, so the top box stays flat.
import { floorShadow, type Ctx } from '../defs.ts';
import { circle, path, rect, stroke } from '../svg.ts';

/** `x` — the middle, `y` — the floor line, `boxes` — [width, height] from the bottom up, `v` — which stack (wrappings differ). */
export function parcelStack(c: Ctx, x: number, y: number, boxes: readonly (readonly [number, number])[], v: number): string {
  const { p } = c;
  const wraps = [p.parcel, p.parcelPale, p.parcelDark];
  let s = floorShadow(c, x, y + 4, (boxes[0]?.[0] ?? 60) / 2 + 10, 8, 0.32);
  let bottom = y;
  boxes.forEach(([w, h], i) => {
    const left = x - w / 2;
    const top = bottom - h;
    const wrap = wraps[(i + v) % wraps.length] as string;
    // the box, its shading, a crease where the paper is folded
    s += rect(left, top, w, h, wrap, { rx: 2 }) + rect(left, top, w, h, c.ref('round'), { rx: 2 }) + rect(left, top, w, 2.5, p.white, { opacity: 0.18 });
    s += stroke(`M${left + 4} ${top + h - 6} l10 -6 M${left + w - 4} ${top + h - 6} l-10 -6`, p.black, 1, { opacity: 0.12 });
    // the string crosswise, the knot, the wax
    const sx = x + ((i + v) % 2 ? 10 : -8);
    s += rect(sx - 1.4, top, 2.8, h, p.twine) + rect(left, top + h * 0.45, w, 2.8, p.twine);
    s += stroke(`M${sx} ${top + h * 0.45 + 1} q-8 -7 -10 2 q5 3 10 -2 q8 -7 10 2 q-5 3 -10 -2`, p.twine, 1.6);
    s += circle(sx + 3, top + h * 0.45 + 7, 3.2, p.red);
    // the address label and two stamps
    const lx = sx > x ? left + 6 : x + 8;
    s += rect(lx, top + 5, Math.min(30, w * 0.36), h * 0.36, p.feather, { rx: 1 }) + rect(lx + 3, top + 9, Math.min(22, w * 0.27), 2, p.scribble, { opacity: 0.5 }) + rect(lx + 3, top + 14, Math.min(16, w * 0.2), 2, p.scribble, { opacity: 0.4 });
    s += rect(left + w - 15, top + h - 14, 8, 9, p.blueLight, { rx: 0.8 }) + rect(left + w - 25, top + h - 14, 8, 9, p.red, { rx: 0.8 });
    // the box above casts a little shadow on this one
    if (i > 0) s += path(`M${left} ${bottom} h${w} l-2 3 h${-w + 4}Z`, p.black, { opacity: 0.18 });
    bottom = top;
  });
  return s;
}
