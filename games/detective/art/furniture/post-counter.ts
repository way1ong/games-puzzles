// The post counter: a panelled wooden front with a letter slot and a brass foot rail, and on its top a glass screen
// with two arched service windows, each with an enamel sign over it (an envelope, a parcel) and a sliding pane at the
// bottom. Behind the glass, the clerks' side: a calendar and ledgers, a cap on a peg, a cabinet of small drawers. By
// day the first window's pane is slid up; at night the blinds are down. The counter runs off the right edge.
import { DETECTIVE } from '../../config.ts';
import { floorShadow, type Ctx } from '../defs.ts';
import { circle, ellipse, path, rect, rects, stroke } from '../svg.ts';

const W = DETECTIVE.scene.width;

export interface PostCounter {
  x: number;
  top: number;
  foot: number;
  /** Left edges of the screen's posts, the width of a post, the top of the screen's cornice. */
  posts: readonly number[];
  post: number;
  screen: number;
}

/** The cornice of the screen and the rail it stands on: how tall each is. */
const CORNICE = 18;
const RAIL = 14;

/** The clerks' side seen through a window, by day; `l`, `r` — the window's sides, `base` — the bottom of the glass. */
function behind(c: Ctx, i: number, l: number, r: number, spring: number, base: number): string {
  const { p } = c;
  let s = '';
  if (i === 0) {
    // a calendar with a red head and a grid of days, a shelf of ledgers and a box
    const [kx, ky] = [l + 16, spring - 2];
    s += rect(kx, ky, 32, 42, p.feather, { rx: 1 }) + rect(kx, ky, 32, 9, p.red, { rx: 1 }) + circle(kx + 16, ky - 3, 2, p.ink);
    const days = Array.from({ length: 20 }, (_, d) => [kx + 3 + (d % 5) * 5.6, ky + 13 + Math.floor(d / 5) * 6.6, 3.6, 3.6] as const);
    s += rects(days, p.scribble, { opacity: 0.3 }) + rect(kx + 3 + 3 * 5.6, ky + 13 + 2 * 6.6, 3.6, 3.6, p.red);
    const shelf = spring + 70;
    s += rect(l + 58, shelf, r - l - 70, 5, p.woodMid) + rect(l + 58, shelf + 5, r - l - 70, 2, p.black, { opacity: 0.2 });
    for (const bx of [l + 66, r - 22]) s += path(`M${bx} ${shelf + 5} l8 0 l-8 10Z`, p.woodMid);
    [[0, 18, 40], [20, 14, 34], [36, 18, 42], [56, 16, 30]].forEach(([dx, bw, bh], k) => {
      s += rect(l + 64 + (dx as number), shelf - (bh as number), bw as number, bh as number, p.books[(k * 3 + 1) % p.books.length] as string, { rx: 1.5 }) + rect(l + 64 + (dx as number), shelf - (bh as number), bw as number, bh as number, c.ref('spine'), { rx: 1.5 });
    });
    s += rect(l + 138, shelf - 20, 10, 20, p.parcelPale, { rx: 1 });
  } else {
    // the clerk's cap on a peg, a cabinet of small drawers, a parcel on it
    const [cx, cy] = [l + 34, spring + 4];
    s += rect(cx - 2, cy - 6, 4, 10, p.woodDark, { rx: 2 });
    s += path(`M${cx - 20} ${cy + 18} q2 -18 20 -20 q18 2 20 20Z`, p.postBlue) + rect(cx - 21, cy + 15, 42, 5, p.postBlueDark, { rx: 2 });
    s += path(`M${cx - 18} ${cy + 20} q18 9 34 0 l2 2 q-19 12 -38 0Z`, p.ink) + circle(cx, cy + 8, 3.6, p.gold);
    const [dx, dy, dw, dh] = [r - 84, spring + 40, 70, base - spring - 40];
    s += rect(dx, dy, dw, dh, p.wood) + rect(dx, dy, dw, 4, p.woodDark);
    const drawers = Array.from({ length: 9 }, (_, d) => [dx + 5 + (d % 3) * 21.6, dy + 9 + Math.floor(d / 3) * ((dh - 12) / 3)] as const);
    s += rects(drawers.map(([x0, y0]) => [x0, y0, 18, (dh - 12) / 3 - 4] as const), p.woodMid);
    s += rects(drawers.map(([x0, y0]) => [x0 + 6, y0 + (dh - 12) / 6 - 3.5, 6, 3] as const), p.brass);
    s += rect(dx + 14, dy - 22, 36, 22, p.parcel, { rx: 2 }) + rect(dx + 30, dy - 22, 3, 22, p.twine);
  }
  return s;
}

/** The blind pulled down behind the glass at night: slats and a bar with a ring. */
function blind(c: Ctx, arch: string, l: number, r: number, top: number, base: number): string {
  const { p } = c;
  let s = path(arch, p.blind);
  for (let y = top + 14; y < base - 10; y += 14) s += rect(l, y, r - l, 2, p.black, { opacity: 0.16 });
  const cx = (l + r) / 2;
  return s + rect(l, base - 12, r - l, 5, p.woodDark) + stroke(`M${cx} ${base - 7} l0 3`, p.ink, 1.4) + circle(cx, base - 2, 2.4, 'none', { stroke: p.brass, 'stroke-width': 1.4 });
}

export function postCounter(c: Ctx, m: PostCounter): string {
  const { p, night } = c;
  const { x, top, foot } = m;
  const [first] = m.posts as [number];
  const base = top - RAIL;
  const head = m.screen + CORNICE;
  let s = rect(first + 4, m.screen + 6, W - first, base - m.screen, p.black, { opacity: 0.16, filter: c.ref('soft') });
  // the two service windows
  for (let i = 0; i + 1 < m.posts.length; i++) {
    const l = (m.posts[i] as number) + m.post;
    const r = m.posts[i + 1] as number;
    const cx = (l + r) / 2;
    const apex = head + 34;
    const spring = head + 66;
    const arch = `M${l} ${base} L${l} ${spring} Q${l} ${apex} ${cx} ${apex} Q${r} ${apex} ${r} ${spring} L${r} ${base}Z`;
    s += path(arch, p.officeInside);
    s += night ? blind(c, arch, l, r, apex, base) : behind(c, i, l, r, spring, base);
    // the hatch at the bottom: its pane is slid up in the first window by day, down otherwise
    const [hx, hw, hh] = [cx - 40, 80, 40];
    const open = !night && i === 0;
    const hatch = `M${hx} ${base - hh} h${hw} v${hh} h${-hw}Z`;
    if (open) {
      // through it: the clerk's desk with a rubber stamp and an ink pad
      s += rect(hx, base - 10, hw, 10, p.woodMid) + rect(hx, base - 10, hw, 2, p.white, { opacity: 0.15 });
      s += rect(hx + 14, base - 15, 20, 5, p.ink, { rx: 1.5 }) + rect(hx + 52, base - 22, 5, 12, p.woodDark, { rx: 1 }) + circle(hx + 54.5, base - 24, 4, p.woodDark) + rect(hx + 48, base - 12, 13, 2.4, p.ink);
      s += rect(hx, base - hh, hw, 8, p.black, { opacity: 0.1 });
    }
    const pane = open ? base - 2 * hh + 6 : base - hh;
    s += rect(hx, pane, hw, hh, p.glass, { opacity: 0.12 }) + rect(hx, pane, hw, hh, 'none', { stroke: p.brass, 'stroke-width': 1.8 }) + rect(cx - 8, pane + hh - 6, 16, 3.4, p.brass, { rx: 1.7 });
    // the glass (not over the open hatch) with two streaks of light, the brass frame of the hatch
    s += path(open ? `${arch} ${hatch}` : arch, p.glass, { opacity: 0.16, 'fill-rule': 'evenodd' });
    s += path(`M${l + 12} ${spring + 4} l18 0 l-26 90 l-4 0Z`, p.white, { opacity: night ? 0.05 : 0.2 }) + path(`M${r - 34} ${spring + 40} l8 0 l-24 84 l-6 0Z`, p.white, { opacity: night ? 0.04 : 0.14 });
    s += rect(hx - 2.5, base - hh - 2.5, hw + 5, hh + 2.5, 'none', { stroke: p.brassDark, 'stroke-width': 2.6 });
    // the wood round the arch, and the enamel sign over it
    s += path(`M${l} ${head} L${r} ${head} L${r} ${spring} Q${r} ${apex} ${cx} ${apex} Q${l} ${apex} ${l} ${spring}Z`, p.wood);
    s += path(`M${l} ${spring} Q${l} ${apex} ${cx} ${apex} Q${r} ${apex} ${r} ${spring}`, 'none', { stroke: p.woodDark, 'stroke-width': 3 });
    const sy = (head + apex) / 2;
    s += circle(cx, sy, 13, p.brassDark) + circle(cx, sy, 11, p.postBlue);
    s += i === 0
      ? rect(cx - 7, sy - 5, 14, 10, p.feather, { rx: 1 }) + stroke(`M${cx - 7} ${sy - 5} l7 5 l7 -5`, p.postBlue, 1.4)
      : rect(cx - 6, sy - 6, 12, 12, p.parcelPale, { rx: 1 }) + rect(cx - 0.8, sy - 6, 1.6, 12, p.postBlue) + rect(cx - 6, sy - 0.8, 12, 1.6, p.postBlue);
  }
  // the posts, the rail the screen stands on, the cornice
  for (const px of m.posts) s += rect(px, head, m.post, base - head, p.wood) + rect(px, head, 3, base - head, p.white, { opacity: 0.1 }) + rect(px + m.post - 3, head, 3, base - head, p.black, { opacity: 0.15 });
  s += rect(first - 6, base, W - first + 6, RAIL, p.woodDark) + rect(first - 6, base, W - first + 6, 3, p.white, { opacity: 0.1 });
  s += rect(first - 12, m.screen, W - first + 12, CORNICE, p.woodDark, { rx: 2 }) + rect(first - 12, m.screen, W - first + 12, 4, p.white, { opacity: 0.12 });
  s += rects(Array.from({ length: Math.ceil((W - first + 6) / 14) }, (_, k) => [first - 6 + k * 14, m.screen + 10, 8, 5] as const), p.wood);
  // the counter: its front with panels, the letter slot, the foot rail; the top over it all
  const w = W - x;
  s += floorShadow(c, x + w / 2, foot + 8, w / 2 + 10, 12, 0.35);
  s += rect(x, top + 20, w, foot - top - 20, p.wood) + rect(x, top + 20, w, foot - top - 20, c.ref('grain'));
  for (let px = x + 20; px < W; px += 116) {
    s += rect(px, top + 40, 100, foot - top - 90, p.woodMid, { rx: 5, opacity: 0.55 }) + rect(px, top + 40, 100, foot - top - 90, 'none', { rx: 5, stroke: p.woodDark, 'stroke-width': 3 });
  }
  const slot = x + 20 + 116 + 50;
  s += rect(slot - 26, top + 62, 52, 16, p.brassDark, { rx: 3 }) + rect(slot - 22, top + 66, 44, 6, p.ink, { rx: 2 }) + rect(slot - 24, top + 63, 48, 3, p.brass, { rx: 1.5 });
  s += rect(x, foot - 16, w, 16, p.woodDark) + rect(x, top + 20, w, 8, p.black, { opacity: 0.2 });
  for (let bx = x + 30; bx < W; bx += 150) s += rect(bx, foot - 40, 6, 14, p.brassDark, { rx: 2 });
  s += rect(x + 10, foot - 42, w, 6, p.brass, { rx: 3 }) + rect(x + 10, foot - 42, w, 2, p.white, { opacity: 0.3 });
  s += rect(x - 8, top, w + 8, 20, p.woodDark, { rx: 4 }) + rect(x - 8, top, w + 8, 5, p.white, { opacity: 0.1, rx: 2 }) + rect(x - 8, top, w + 8, 20, c.ref('grain'), { rx: 4 });
  return s + ellipse(x + 40, top + 3, 20, 1.6, p.white, { opacity: night ? 0.05 : 0.12 });
}
