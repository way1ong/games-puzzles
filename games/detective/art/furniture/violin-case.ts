// The musician's violin case, open on the floor: the lid stands behind, the bow is clipped in it. By day
// the violin lies in the case; at night the case is empty.
import { floorShadow, type Ctx } from '../defs.ts';
import { circle, ellipse, g, line, path, rect } from '../svg.ts';

/** `x` — the middle, `y` — the floor line it lies on, `half` — half its length. */
export function violinCase(c: Ctx, x: number, y: number, half: number, withViolin: boolean): string {
  const { p } = c;
  const left = x - half;
  const w = 2 * half;
  let s = floorShadow(c, x, y + 4, half + 8, 8, 0.35);
  // the lid: lined with velvet, the bow in its clips
  s += rect(left + 2, y - 70, w - 4, 44, p.caseBlack, { rx: 12 }) + rect(left + 8, y - 64, w - 16, 34, p.velvet, { rx: 8 });
  s += line(left + 18, y - 52, left + w - 20, y - 46, p.woodDark, 2.6) + line(left + 18, y - 50, left + w - 20, y - 44, p.paper, 1) + rect(left + 14, y - 55, 12, 7, p.ink, { rx: 2 });
  s += rect(left + 44, y - 56, 5, 12, p.velvetDark, { rx: 2 }) + rect(left + w - 54, y - 53, 5, 12, p.velvetDark, { rx: 2 });
  // the body of the case, its bed of velvet seen over the edge
  s += rect(left, y - 30, w, 30, p.caseBlack, { rx: 9 }) + rect(left, y - 30, w, 30, c.ref('round'), { rx: 9 }) + ellipse(x, y - 28, half - 8, 7, p.velvet);
  if (withViolin) {
    // the violin on its back: two rounded bouts, the neck and the scroll to the right
    s += g(
      `translate(${x - 26} ${y - 31})`,
      path('M-40 0 C-44 -14 -18 -17 -10 -8 C-4 -13 2 -13 8 -8 C16 -17 46 -15 44 0 C46 5 -42 5 -40 0Z', p.violin) +
        path('M-40 0 C-44 -14 -18 -17 -10 -8 C-4 -13 2 -13 8 -8 C16 -17 46 -15 44 0 C46 5 -42 5 -40 0Z', c.ref('round')) +
        rect(40, -7, 46, 5, p.violinDark, { rx: 2 }) +
        circle(89, -5, 5, p.violinDark) +
        line(-22, -6, 84, -6, p.paper, 0.9, { opacity: 0.9 }) +
        rect(-26, -9, 10, 5, p.ink, { rx: 1.5 }),
    );
  } else {
    // the hollow where the violin lay
    s += ellipse(x - 26, y - 29, 44, 4.4, p.velvetDark) + ellipse(x + 40, y - 29, 22, 2.4, p.velvetDark);
  }
  return s + rect(left + 26, y - 20, 12, 8, p.brass, { rx: 2 }) + rect(left + w - 38, y - 20, 12, 8, p.brass, { rx: 2 }) + rect(x - 10, y - 8, 20, 5, p.leather, { rx: 2.5 });
}
