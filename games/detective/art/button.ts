// A button — the same picture on a coat and as evidence on the floor. Each colour has its own make, so the
// colours stay apart without colour too: blue — four holes, brown — two holes, gold — a metal dome with a
// star stamped on it (so it is not taken for the coin, which has a ring).
import type { Buttons } from '../core/traits.ts';
import { BUTTON_PAINT, FACE } from './palette.ts';
import { circle, n, stroke } from './svg.ts';

export function buttonArt(colour: Buttons, cx: number, cy: number, r: number): string {
  const { fill, rim, mark } = BUTTON_PAINT[colour];
  let s = circle(cx, cy, r, fill, { stroke: rim, 'stroke-width': n(r * 0.2) });
  const hole = (dx: number, dy: number) => circle(n(cx + dx * r), n(cy + dy * r), n(r * 0.17), mark);
  if (colour === 'blue') s += hole(-0.32, -0.32) + hole(0.32, -0.32) + hole(-0.32, 0.32) + hole(0.32, 0.32);
  if (colour === 'brown') s += hole(-0.3, 0) + hole(0.3, 0);
  if (colour === 'gold') {
    const ray = (dx: number, dy: number, long: number) => stroke(`M${n(cx - dx * r * long)} ${n(cy - dy * r * long)} L${n(cx + dx * r * long)} ${n(cy + dy * r * long)}`, rim, n(r * 0.16));
    s += ray(1, 0, 0.56) + ray(0, 1, 0.56) + ray(0.7, 0.7, 0.42) + ray(0.7, -0.7, 0.42);
  }
  return s + stroke(`M${n(cx - r * 0.55)} ${n(cy - r * 0.3)} q${n(r * 0.25)} ${n(-r * 0.4)} ${n(r * 0.6)} ${n(-r * 0.42)}`, FACE.white, n(r * 0.18), { opacity: 0.5 });
}
