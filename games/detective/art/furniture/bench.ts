// A waiting-hall bench: wooden slats on cast-iron ends.
import { floorShadow, type Ctx } from '../defs.ts';
import { rect, stroke } from '../svg.ts';

export interface Bench {
  x: number;
  w: number;
  seat: number;
  /** Where its feet stand on the floor. */
  foot: number;
}

export function bench(c: Ctx, m: Bench): string {
  const { p } = c;
  const { x, w, seat, foot } = m;
  let s = floorShadow(c, x + w / 2, foot + 5, w / 2 + 10, 9, 0.3);
  // the back: three slats on two iron uprights
  for (const ex of [x + 10, x + w - 18]) s += rect(ex, seat - 84, 8, 84, p.ironDark, { rx: 3 });
  for (let i = 0; i < 3; i++) {
    const y = seat - 80 + i * 24;
    s += rect(x, y, w, 17, p.woodMid, { rx: 4 }) + rect(x, y, w, 17, c.ref('round'), { rx: 4 }) + rect(x, y, w, 17, c.ref('grain'), { rx: 4 });
  }
  // the legs with a bar between them, the arms
  for (const ex of [x + 8, x + w - 20]) {
    s += rect(ex, seat + 12, 12, foot - seat - 12, p.ironDark, { rx: 3 }) + rect(ex - 6, foot - 6, 24, 7, p.ironDark, { rx: 3.5 });
  }
  s += rect(x + 18, foot - 34, w - 36, 5, p.iron);
  s += stroke(`M${x + 14} ${seat - 34} q-18 4 -12 34`, p.ironDark, 7) + stroke(`M${x + w - 14} ${seat - 34} q18 4 12 34`, p.ironDark, 7);
  // the seat
  return s + rect(x - 6, seat, w + 12, 14, p.wood, { rx: 5 }) + rect(x - 6, seat, w + 12, 4, p.white, { opacity: 0.12, rx: 2 }) + rect(x - 6, seat + 10, w + 12, 4, p.black, { opacity: 0.2, rx: 2 });
}
