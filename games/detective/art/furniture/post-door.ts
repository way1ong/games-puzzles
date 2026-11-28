// The front door of the post office: a fanlight with radiating bars over it, a big pane with the horn of the post
// painted in gold, two panels below, a brass push bar and kick plate. The street shows through the glass (the room
// draws it, clipped to `postDoorGlass`), so the leaf is drawn around its pane.
import type { Ctx } from '../defs.ts';
import { line, path, rect } from '../svg.ts';
import { postHorn } from './post-horn.ts';

export interface PostDoor {
  x: number;
  w: number;
  /** Where the fanlight starts and where the leaf starts. */
  top: number;
  leaf: number;
  /** The floor line the door stands on. */
  bottom: number;
}

/** The pane of the leaf: left, top, width, height. */
function pane(m: PostDoor): readonly [number, number, number, number] {
  return [m.x + 16, m.leaf + 18, m.w - 32, 170];
}

/** The fanlight: a half circle over the leaf. */
function fanlight(m: PostDoor): string {
  const r = m.w / 2;
  const base = m.leaf - 8;
  return `M${m.x} ${base} L${m.x} ${m.top + r} A${r} ${r} 0 0 1 ${m.x + m.w} ${m.top + r} L${m.x + m.w} ${base}Z`;
}

/** The glass of the door, as path shapes: the street is drawn inside them. */
export function postDoorGlass(m: PostDoor): string[] {
  const [gx, gy, gw, gh] = pane(m);
  return [fanlight(m), `M${gx} ${gy} h${gw} v${gh} h${-gw}Z`];
}

export function postDoor(c: Ctx, m: PostDoor): string {
  const { p, night } = c;
  const { x, w, top, leaf, bottom } = m;
  const r = w / 2;
  const [gx, gy, gw, gh] = pane(m);
  // the shadow of the door on the wall (not over its glass), the frame round the fanlight and the leaf
  const outline = `M${x - 8} ${bottom} L${x - 8} ${top + r + 6} A${r + 12} ${r + 12} 0 0 1 ${x + w + 16} ${top + r + 6} L${x + w + 16} ${bottom}Z`;
  let s = path(`${outline} ${postDoorGlass(m).join(' ')}`, p.black, { opacity: 0.18, filter: c.ref('soft'), 'fill-rule': 'evenodd' });
  s += path(`M${x - 12} ${bottom} L${x - 12} ${top + r} A${r + 12} ${r + 12} 0 0 1 ${x + w + 12} ${top + r} L${x + w + 12} ${bottom} L${x + w} ${bottom} L${x + w} ${top + r} A${r} ${r} 0 0 0 ${x} ${top + r} L${x} ${bottom}Z`, p.woodDark);
  s += path(`M${x - 12} ${top + r} A${r + 12} ${r + 12} 0 0 1 ${x + w + 12} ${top + r}`, 'none', { stroke: p.white, 'stroke-opacity': 0.12, 'stroke-width': 3 });
  // the fanlight: bars like the rays of a rising sun, a half wheel in the middle
  const cx = x + r;
  const base = leaf - 8;
  for (const turn of [-150, -120, -90, -60, -30]) {
    const a = (turn * Math.PI) / 180;
    s += line(cx, base, cx + Math.cos(a) * r, base + Math.sin(a) * r, p.wood, 4, { 'stroke-linecap': 'butt' });
  }
  s += path(`M${cx - 18} ${base} A18 18 0 0 1 ${cx + 18} ${base}Z`, p.wood) + rect(x, base, w, 8, p.wood);
  // the leaf round its pane
  s += path(`M${x} ${leaf} h${w} V${bottom} h${-w}Z M${gx} ${gy} v${gh} h${gw} v${-gh}Z`, p.wood, { 'fill-rule': 'evenodd' });
  s += path(`M${x} ${leaf} h${w} V${bottom} h${-w}Z M${gx} ${gy} v${gh} h${gw} v${-gh}Z`, c.ref('grain'), { 'fill-rule': 'evenodd' });
  s += rect(gx - 4, gy - 4, gw + 8, gh + 8, 'none', { stroke: p.woodDark, 'stroke-width': 4 });
  // the horn painted on the glass, a shine
  s += postHorn(gx + gw / 2 - 4, gy + 46, p.gold, 0.9);
  s += path(`M${gx + 8} ${gy + 8} l26 0 l-24 64 l-8 0Z`, p.white, { opacity: night ? 0.05 : 0.18 });
  // two panels below, the push bar, the kick plate, the threshold
  const panelTop = gy + gh + 22;
  for (const px of [x + 14, x + w / 2 + 4]) {
    s += rect(px, panelTop, w / 2 - 18, bottom - panelTop - 40, p.woodMid, { rx: 3, opacity: 0.6 }) + rect(px, panelTop, w / 2 - 18, bottom - panelTop - 40, 'none', { rx: 3, stroke: p.woodDark, 'stroke-width': 3 });
  }
  s += rect(x + w - 24, gy + gh - 70, 8, 64, p.brassDark, { rx: 4 }) + rect(x + w - 23, gy + gh - 66, 3, 56, p.white, { opacity: 0.25, rx: 1.5 });
  s += rect(x + 6, bottom - 30, w - 12, 22, p.brass, { rx: 2 }) + rect(x + 6, bottom - 30, w - 12, 22, c.ref('round'), { rx: 2 });
  return s + rect(x - 14, bottom - 3, w + 28, 6, p.woodMid, { rx: 2 });
}
