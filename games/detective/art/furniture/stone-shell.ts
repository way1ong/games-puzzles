// A public hall: a painted wall with a thin line, dark panels below the rail, the skirting board and a
// floor of stone slabs laid like bricks, growing towards the viewer.
import { DETECTIVE } from '../../config.ts';
import type { Ctx } from '../defs.ts';
import { line, n, path, rect } from '../svg.ts';

const { width: W, height: H } = DETECTIVE.scene;

export interface StoneShell {
  /** Where the skirting board starts, where the floor starts, the top edge of the wall panels. */
  skirting: number;
  floor: number;
  rail: number;
}

/** Slabs: how wide one is at the wall and at the viewer's feet, and how deep a row is for its width. */
const FAR = 96;
const NEAR = 190;
const DEPTH = 0.38;

export function stoneShell(c: Ctx, m: StoneShell): string {
  const { p } = c;
  let s = rect(0, 0, W, m.floor, c.ref('wall')) + rect(0, m.rail - 52, W, 5, p.panelGreen, { opacity: 0.45 });
  // panels below the rail
  s += rect(0, m.rail, W, m.skirting - m.rail, p.panelGreen);
  for (let x = 24; x < W; x += 148) {
    s += rect(x, m.rail + 26, 116, m.skirting - m.rail - 46, p.panelGreenLight, { rx: 4, opacity: 0.35 });
    s += rect(x, m.rail + 26, 116, m.skirting - m.rail - 46, 'none', { rx: 4, stroke: p.panelGreenDark, 'stroke-width': 3 });
  }
  s += rect(0, m.rail - 4, W, 12, p.woodDark) + rect(0, m.rail - 4, W, 3, p.white, { opacity: 0.14 }) + rect(0, m.rail + 8, W, 4, p.black, { opacity: 0.2 });
  s += rect(0, m.skirting, W, m.floor - m.skirting, p.skirting) + rect(0, m.skirting, W, 3, p.white, { opacity: 0.1 });
  // the floor: slabs in rows, every other row shifted by half a slab; some slabs a shade darker
  s += rect(0, m.floor, W, H - m.floor, c.ref('floor'));
  const widthAt = (y: number) => FAR + ((y - m.floor) / (H - m.floor)) * (NEAR - FAR);
  const half = Math.ceil(W / 2 / FAR) + 1;
  for (let row = 0, top = m.floor; top < H; row++) {
    const bottom = top + Math.round(widthAt(top) * DEPTH);
    const [a, b] = [widthAt(top), widthAt(bottom)];
    const shift = row % 2 ? 0.5 : 0;
    for (let k = -half; k < half; k++) {
      const [x1, x2, x3, x4] = [W / 2 + (k + shift) * a, W / 2 + (k + 1 + shift) * a, W / 2 + (k + 1 + shift) * b, W / 2 + (k + shift) * b];
      if ((k * 2 + row * 3) % 5 === 0) s += path(`M${n(x1)} ${top} L${n(x2)} ${top} L${n(x3)} ${bottom} L${n(x4)} ${bottom}Z`, p.slab, { opacity: 0.6 });
      s += line(n(x1), top, n(x4), bottom, p.plank, 2, { opacity: 0.7 });
    }
    s += rect(0, top, W, 2, p.plank, { opacity: 0.7 });
    top = bottom;
  }
  return s + rect(0, m.floor, W, 14, p.black, { opacity: 0.1 });
}
