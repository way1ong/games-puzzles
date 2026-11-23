// The detective's cork board: notes, a photograph and a red thread between the pins.
import type { Ctx } from '../defs.ts';
import { circle, el, g, path, rect } from '../svg.ts';

export function corkboard(c: Ctx, m: { x: number; y: number; w: number; h: number }): string {
  const { p } = c;
  const { x, y, w, h } = m;
  let s = rect(x + 3, y + 6, w, h, p.black, { opacity: 0.2, filter: c.ref('soft') }) + rect(x, y, w, h, p.woodDark, { rx: 5 }) + rect(x + 9, y + 9, w - 18, h - 18, p.cork);
  const note = (nx: number, ny: number, nw: number, nh: number, turn: number, fill: string, lines: number) => {
    let text = '';
    for (let i = 0; i < lines; i++) text += rect(6, 8 + i * 8, nw - 14 - (i % 2) * 10, 2.5, p.scribble, { opacity: 0.6 });
    return g(`translate(${nx} ${ny}) rotate(${turn})`, rect(1, 2, nw, nh, p.black, { opacity: 0.15 }) + rect(0, 0, nw, nh, fill) + text);
  };
  s += note(x + 16, y + 18, 54, 42, -5, p.noteYellow, 4) + note(x + 110, y + 16, 56, 70, 4, p.paper, 6);
  s += g(
    `translate(${x + 26} ${y + 92}) rotate(3)`,
    rect(1, 2, 56, 66, p.black, { opacity: 0.15 }) + rect(0, 0, 56, 66, p.photoPaper) + rect(4, 4, 48, 48, p.photo) + circle(28, 22, 10, p.photoDark) + path('M12 52 q16 -24 32 0Z', p.photoDark),
  );
  s += note(x + 104, y + 112, 60, 50, -6, p.noteGreen, 4);
  const pins = [[x + 42, y + 22], [x + 136, y + 20], [x + 54, y + 96], [x + 132, y + 116]] as const;
  s += el('polyline', { points: pins.map((pin) => pin.join(',')).join(' '), fill: 'none', stroke: p.pin, 'stroke-width': 2 });
  for (const [px, py] of pins) s += circle(px, py, 4.5, p.pin) + circle(px - 1.5, py - 1.5, 1.5, p.white, { opacity: 0.7 });
  return s;
}
