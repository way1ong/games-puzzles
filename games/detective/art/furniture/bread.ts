// Bread and jars as they stand on a shelf: each drawing starts at its left edge on the shelf line.
import type { Ctx } from '../defs.ts';
import { ellipse, path, rect, stroke } from '../svg.ts';

/** A round country loaf dusted with flour. */
export function loaf(c: Ctx, x: number, y: number, w: number): string {
  const { p } = c;
  const d = `M${x + 2} ${y} Q${x - 3} ${y - 32} ${x + w / 2} ${y - 34} Q${x + w + 3} ${y - 32} ${x + w - 2} ${y}Z`;
  return (
    path(d, p.crust) +
    path(d, c.ref('round')) +
    stroke(`M${x + w * 0.28} ${y - 25} q5 6 2 14`, p.crustLight, 3) +
    stroke(`M${x + w * 0.5} ${y - 29} q5 7 2 17`, p.crustLight, 3) +
    stroke(`M${x + w * 0.72} ${y - 25} q4 6 1 13`, p.crustLight, 3) +
    ellipse(x + w / 2, y - 27, w * 0.3, 4, p.flour, { opacity: 0.35 })
  );
}

/** A loaf baked in a tin: straight sides and a risen top with three cuts. */
export function tinLoaf(c: Ctx, x: number, y: number, w: number): string {
  const { p } = c;
  const top = `M${x} ${y - 20} Q${x + w / 2} ${y - 48} ${x + w} ${y - 20}Z`;
  let s = rect(x + 3, y - 22, w - 6, 22, p.crustDark, { rx: 3 }) + path(top, p.crust) + path(top, c.ref('round'));
  for (const k of [0.3, 0.5, 0.7]) s += stroke(`M${x + w * k - 3} ${y - 24} l6 -9`, p.crustLight, 2.6);
  return s + rect(x + 3, y - 4, w - 6, 4, p.black, { opacity: 0.12 });
}

/** A low wicker tray of buns. */
export function buns(c: Ctx, x: number, y: number, w: number): string {
  const { p } = c;
  const count = Math.max(2, Math.floor((w - 6) / 20));
  const step = (w - 10) / count;
  let s = '';
  for (let i = 0; i < count; i++) {
    const cx = x + 5 + step * (i + 0.5);
    s += ellipse(cx, y - 17, step / 2 + 1, 10, p.crust) + ellipse(cx, y - 17, step / 2 + 1, 10, c.ref('round')) + ellipse(cx - 2, y - 21, step / 5, 2.4, p.crustLight, { opacity: 0.8 });
  }
  s += rect(x, y - 12, w, 12, p.wicker, { rx: 3 });
  for (let i = 1; i < w / 9; i++) s += rect(x + i * 9 - 1, y - 12, 1.6, 12, p.wickerDark, { opacity: 0.6 });
  return s + rect(x, y - 12, w, 3, p.wickerDark, { rx: 1.5 });
}

/** A jar of jam under a cloth lid. */
export function jar(c: Ctx, x: number, y: number, w: number): string {
  const { p } = c;
  return (
    rect(x + 2, y - 28, w - 4, 28, p.jam, { rx: 4 }) +
    rect(x + 2, y - 28, w - 4, 28, c.ref('round'), { rx: 4 }) +
    rect(x + 4, y - 20, w - 8, 11, p.paper, { rx: 1.5 }) +
    rect(x + 4.5, y - 26, 2.2, 22, p.white, { opacity: 0.35, rx: 1 }) +
    path(`M${x} ${y - 27} q${w / 2} -12 ${w} 0 l-2 -6 q${-(w / 2 - 2)} -6 ${-(w - 4)} 0Z`, p.jamLid) +
    rect(x + 1, y - 30, w - 2, 2.4, p.sackStripe)
  );
}
