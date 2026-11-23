// A shop room: a papered wall, white tiles below the rail with a coloured band on top, the skirting board
// and a chessboard floor whose tiles grow towards the viewer.
import { DETECTIVE } from '../../config.ts';
import type { Ctx } from '../defs.ts';
import { el, n, path, rect } from '../svg.ts';

const { width: W, height: H } = DETECTIVE.scene;

export interface TiledShell {
  /** Where the skirting board starts, where the floor starts, the top edge of the wall tiles. */
  skirting: number;
  floor: number;
  rail: number;
}

/** Wall tiles: five rows between the rail and the skirting board. */
const WALL_ROWS = 5;
/** Floor tiles: how wide one is at the wall and at the viewer's feet, and how deep a row is for its width. */
const FAR = 56;
const NEAR = 106;
const DEPTH = 0.62;

export function tiledShellDefs(c: Ctx, m: TiledShell): string {
  const { p } = c;
  const size = (m.skirting - m.rail) / WALL_ROWS;
  return el(
    'pattern',
    { id: c.id('tiles'), y: m.rail, width: size, height: size, patternUnits: 'userSpaceOnUse' },
    rect(0, 0, size, size, p.tileWall) + rect(0, 0, size, 1.6, p.tileGrout) + rect(0, 0, 1.6, size, p.tileGrout),
  );
}

export function tiledShell(c: Ctx, m: TiledShell): string {
  const { p } = c;
  let s = rect(0, 0, W, m.floor, c.ref('wall')) + rect(0, 0, W, m.rail, c.ref('wallpaper'));
  s += rect(0, m.rail, W, m.skirting - m.rail, c.ref('tiles')) + rect(0, m.rail, W, m.skirting - m.rail, p.black, { opacity: 0.04 });
  // the band along the top of the tiles
  s += rect(0, m.rail - 12, W, 12, p.tileBand) + rect(0, m.rail - 12, W, 3, p.white, { opacity: 0.18 }) + rect(0, m.rail, W, 3, p.black, { opacity: 0.12 });
  s += rect(0, m.skirting, W, m.floor - m.skirting, p.skirting) + rect(0, m.skirting, W, 3, p.white, { opacity: 0.12 });
  // the floor: pale tiles as the ground, dark ones over them like a chessboard
  s += rect(0, m.floor, W, H - m.floor, c.ref('floor'));
  const widthAt = (y: number) => FAR + ((y - m.floor) / (H - m.floor)) * (NEAR - FAR);
  const half = Math.ceil(W / 2 / FAR);
  for (let row = 0, top = m.floor; top < H; row++) {
    const bottom = top + Math.round(widthAt(top) * DEPTH);
    const [a, b] = [widthAt(top), widthAt(bottom)];
    for (let k = -half; k < half; k++) {
      if ((k + row) % 2 === 0) continue;
      s += path(`M${n(W / 2 + k * a)} ${top} L${n(W / 2 + (k + 1) * a)} ${top} L${n(W / 2 + (k + 1) * b)} ${bottom} L${n(W / 2 + k * b)} ${bottom}Z`, p.floorTile);
    }
    s += rect(0, top, W, 1.6, p.tileGrout, { opacity: 0.7 });
    top = bottom;
  }
  return s + rect(0, m.floor, W, 14, p.black, { opacity: 0.1 });
}
