// The room itself: wallpaper, wall panels, the skirting board, the plank floor and the light on the floor.
import { DETECTIVE } from '../../config.ts';
import type { Ctx } from '../defs.ts';
import { path, rect } from '../svg.ts';

const { width: W, height: H } = DETECTIVE.scene;

export interface Shell {
  /** Where the skirting board starts, where the floor starts, the rail of the wall panels. */
  skirting: number;
  floor: number;
  rail: number;
}

export function shell(c: Ctx, m: Shell): string {
  const { p } = c;
  let s = rect(0, 0, W, m.floor, c.ref('wall')) + rect(0, 0, W, m.skirting, c.ref('wallpaper'));
  // panels below the rail
  s += rect(0, m.rail, W, 6, p.woodMid) + rect(0, m.rail + 6, W, m.skirting - m.rail - 6, p.wallBottom, { opacity: 0.55 });
  for (let x = 20; x < W; x += 150) {
    s += rect(x, m.rail + 20, 120, m.skirting - m.rail - 37, 'none', { stroke: p.woodMid, 'stroke-opacity': 0.45, 'stroke-width': 3, rx: 4 });
  }
  s += rect(0, m.skirting, W, m.floor - m.skirting, p.skirting) + rect(0, m.skirting, W, 3, p.white, { opacity: 0.12 });
  // planks: long boards with joints that take turns
  s += rect(0, m.floor, W, H - m.floor, c.ref('floor')) + rect(0, m.floor, W, H - m.floor, c.ref('grain'));
  const seams = [m.floor + 41, m.floor + 87, m.floor + 137, m.floor + 193];
  for (const y of seams) s += rect(0, y, W, 2.5, p.plank);
  const rows = [m.floor, ...seams.map((y) => y + 2), H];
  for (let i = 0; i < rows.length - 1; i++) {
    const top = rows[i] as number;
    const bottom = rows[i + 1] as number;
    for (let x = i % 2 ? 90 : 210; x < W; x += 260) s += rect(x, top, 2.5, bottom - top, p.plank);
  }
  return s;
}

/** Light from the window on the floor: a patch of sun by day, stripes from the street lamp at night. */
export function floorLight(c: Ctx, floor: number, left: number, right: number): string {
  const { p } = c;
  if (!c.night) {
    return path(`M${left} ${floor} L${right} ${floor} L${right + 100} ${H} L${left - 80} ${H}Z`, p.floorLight, { opacity: 0.22, filter: c.ref('soft') });
  }
  let s = '';
  for (let i = 0; i < 4; i++) s += path(`M${left + 10 + i * 58} ${floor} l40 0 l${70 + i * 8} ${H - floor} l-46 0Z`, p.floorLight, { opacity: 0.1 });
  return s;
}

/** The corners of the picture fade a little; at night — more. */
export function vignette(c: Ctx): string {
  return rect(0, 0, W, H, c.ref('vignette'));
}
