// An upright piano against the wall: the lid closed under a lace runner, the keyboard open, a page of music on
// its stand, two brass pedals. On top: a metronome and a little vase of flowers.
import { floorShadow, type Ctx } from '../defs.ts';
import { ellipse, line, n, path, rect, stroke } from '../svg.ts';
import { budVase } from './bud-vase.ts';

export interface Piano {
  x: number;
  w: number;
  /** The lid (things stand on it), the line of the keys, where it stands on the floor. */
  top: number;
  keys: number;
  foot: number;
  metronome: { x: number };
  vase: { x: number };
}

/** A wooden metronome; `x` — the middle, `y` — the line it stands on. */
function metronome(c: Ctx, x: number, y: number): string {
  const { p } = c;
  const body = `M${x - 15} ${y} L${x - 6} ${y - 46} L${x + 6} ${y - 46} L${x + 15} ${y}Z`;
  return (
    path(body, p.woodMid) +
    path(body, c.ref('spine')) +
    path(`M${x - 9} ${y - 8} L${x - 4} ${y - 40} L${x + 4} ${y - 40} L${x + 9} ${y - 8}Z`, p.paper, { opacity: 0.85 }) +
    line(x, y - 10, x + 5, y - 38, p.ink, 1.6) +
    rect(x + 1, y - 30, 6, 5, p.brassDark, { rx: 1, transform: `rotate(10 ${x + 4} ${y - 27})` }) +
    rect(x - 16, y - 5, 32, 5, p.woodDark, { rx: 1.5 })
  );
}

/** A page of music: staves and notes, no words. */
function page(c: Ctx, x: number, y: number, w: number, h: number, seed: number): string {
  const { p } = c;
  let staves = '';
  let heads = '';
  let stems = '';
  for (let staff = 0; staff < 3; staff++) {
    const sy = y + 10 + staff * 16;
    for (let i = 0; i < 5; i++) staves += `M${x + 4} ${n(sy + i * 2.2)}h${w - 8}`;
    for (let k = 0; k < 5; k++) {
      const nx = n(x + 9 + k * ((w - 16) / 5));
      const ny = n(sy + ((k * 3 + staff * 5 + seed) % 5) * 2.2);
      heads += `M${n(nx - 1.8)} ${ny}a1.8 1.3 0 1 0 3.6 0a1.8 1.3 0 1 0 -3.6 0Z`;
      stems += `M${n(nx + 1.6)} ${ny}v-6`;
    }
  }
  return (
    rect(x, y, w, h, p.paper, { rx: 1 }) +
    rect(x, y, w, h, p.black, { opacity: 0.04 }) +
    path(staves, 'none', { stroke: p.typed, 'stroke-width': 0.7, opacity: 0.8 }) +
    path(heads, p.ink) +
    path(stems, 'none', { stroke: p.ink, 'stroke-width': 0.7 })
  );
}

export function piano(c: Ctx, m: Piano): string {
  const { p } = c;
  const { x, w, top, keys, foot } = m;
  const lid = 12;
  let s = floorShadow(c, x + w / 2, foot + 6, w / 2 + 12, 10, 0.35) + rect(x + 6, top + 8, w, foot - top - 8, p.black, { opacity: 0.2, filter: c.ref('soft') });
  // the case in black lacquer, lit from the left
  s += rect(x, top + lid, w, foot - top - lid, p.piano) + rect(x, top + lid, w, foot - top - lid, c.ref('spine'));
  // the upper front: two panels with rounded corners
  const upper = keys - 30;
  for (const px of [x + 22, x + w / 2 + 6]) s += rect(px, top + lid + 8, w / 2 - 28, upper - top - lid - 14, 'none', { stroke: p.pianoLight, 'stroke-width': 2.4, rx: 7 });
  // the name board over the keys (no name), the music on its stand
  s += rect(x + 16, upper, w - 32, 12, p.pianoLight) + rect(x + 16, upper, w - 32, 2, p.white, { opacity: 0.15 });
  s += page(c, x + w / 2 - 50, upper - 52, 48, 54, 0) + page(c, x + w / 2 + 2, upper - 50, 48, 52, 2);
  s += rect(x + w / 2 - 58, upper - 2, 116, 5, p.pianoLight, { rx: 2 });
  // the cheeks at both ends of the keyboard
  s += rect(x, upper - 2, 18, keys - upper + 12, p.piano) + rect(x + w - 18, upper - 2, 18, keys - upper + 12, p.piano);
  s += rect(x, upper - 2, 18, 3, p.white, { opacity: 0.2 }) + rect(x + w - 18, upper - 2, 18, 3, p.white, { opacity: 0.2 });
  // the keys: white ones, then black ones in twos and threes
  const kx = x + 18;
  const kw = w - 36;
  const whites = 26;
  const step = kw / whites;
  let gaps = '';
  let blacks = '';
  for (let i = 1; i < whites; i++) gaps += `M${n(kx + i * step - 0.5)} ${keys - 18}h1v18h-1Z`;
  for (let i = 0; i < whites - 1; i++) {
    if ([2, 6].includes(i % 7)) continue;
    blacks += `M${n(kx + (i + 0.7) * step)} ${keys - 18}h${n(step * 0.6)}v11h${n(-step * 0.6)}Z`;
  }
  s += rect(kx, keys - 18, kw, 18, p.keyIvory) + path(gaps, p.ivory) + path(blacks, p.keyEbony) + rect(kx, keys - 18, kw, 3, p.black, { opacity: 0.25 });
  // the rail under the keys, the lower front with its panel, the legs, the plinth
  s += rect(x + 10, keys, w - 20, 9, p.piano) + rect(x + 10, keys, w - 20, 2, p.white, { opacity: 0.18 });
  s += rect(x + 30, keys + 24, w - 60, foot - keys - 56, 'none', { stroke: p.pianoLight, 'stroke-width': 2.4, rx: 6 });
  for (const lx of [x + 4, x + w - 20]) s += rect(lx, keys + 9, 16, foot - keys - 9, p.piano) + rect(lx, keys + 9, 4, foot - keys - 9, p.white, { opacity: 0.1 });
  s += rect(x, foot - 14, w, 14, p.piano) + rect(x, foot - 14, w, 2, p.white, { opacity: 0.12 });
  // two brass pedals
  const mid = x + w / 2;
  s += rect(mid - 22, foot - 26, 44, 12, p.pianoLight, { rx: 2 });
  for (const dx of [-12, 12]) s += ellipse(mid + dx, foot - 18, 7, 3.4, p.brass) + ellipse(mid + dx - 2, foot - 19, 2.6, 1.2, p.white, { opacity: 0.5 });
  // the lid, the lace runner on it, the shine
  s += rect(x - 6, top, w + 12, lid, p.piano, { rx: 3 }) + rect(x - 6, top, w + 12, 3, p.pianoLight, { rx: 1.5 });
  // the lace edge hanging over the front of the lid: little scallops with a hole in each
  const [l1, l2] = [x + 60, x + w - 60];
  let scallops = '';
  let holes = '';
  for (let lx = l1 + 4; lx < l2; lx += 8) {
    scallops += `M${lx - 4} ${top + 8}a4 4 0 0 0 8 0Z`;
    holes += `M${lx - 1.4} ${top + 8}a1.4 1.4 0 1 0 2.8 0a1.4 1.4 0 1 0 -2.8 0Z`;
  }
  s += rect(l1, top, l2 - l1, 8, p.lace) + rect(l1, top, l2 - l1, 2, p.white, { opacity: 0.4 }) + path(scallops, p.lace) + path(holes, p.piano, { opacity: 0.5 });
  s += stroke(`M${x + 8} ${top + 20} L${x + 8} ${foot - 20}`, p.white, 3, { opacity: 0.08 }) + stroke(`M${x + w - 40} ${top + 20} L${x + w - 40} ${upper - 6}`, p.white, 2, { opacity: 0.06 });
  return s + metronome(c, m.metronome.x, top) + budVase(c, m.vase.x, top, 3);
}
