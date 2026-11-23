// A button — the same picture on a coat and as evidence on the floor. Each colour has its own make, so the
// colours stay apart without colour too: blue — four holes, brown — two holes, gold — a metal dome.
import type { Buttons } from '../core/traits.ts';
import { BUTTON_PAINT, FACE } from './palette.ts';
import { circle, n, stroke } from './svg.ts';

export function buttonArt(colour: Buttons, cx: number, cy: number, r: number): string {
  const { fill, rim, mark } = BUTTON_PAINT[colour];
  let s = circle(cx, cy, r, fill, { stroke: rim, 'stroke-width': n(r * 0.2) });
  const hole = (dx: number, dy: number) => circle(n(cx + dx * r), n(cy + dy * r), n(r * 0.17), mark);
  if (colour === 'blue') s += hole(-0.32, -0.32) + hole(0.32, -0.32) + hole(-0.32, 0.32) + hole(0.32, 0.32);
  if (colour === 'brown') s += hole(-0.3, 0) + hole(0.3, 0);
  if (colour === 'gold') s += circle(cx, cy, n(r * 0.55), 'none', { stroke: rim, 'stroke-width': n(r * 0.14) });
  return s + stroke(`M${n(cx - r * 0.55)} ${n(cy - r * 0.3)} q${n(r * 0.25)} ${n(-r * 0.4)} ${n(r * 0.6)} ${n(-r * 0.42)}`, FACE.white, n(r * 0.18), { opacity: 0.5 });
}
