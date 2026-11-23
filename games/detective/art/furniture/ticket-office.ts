// The ticket office: a wooden front with a window. By day the window is open behind its brass bars; at
// night the blind is down. Under the window — a ledge with a desk bell.
import type { Ctx } from '../defs.ts';
import { circle, ellipse, path, rect } from '../svg.ts';

export interface TicketOffice {
  x: number;
  w: number;
  top: number;
  /** The ledge under the window: things can lie on it. */
  ledge: number;
  bell: number;
  /** The floor line the front stands on. */
  bottom: number;
}

export function ticketOffice(c: Ctx, m: TicketOffice): string {
  const { p, night } = c;
  const { x, w, top, ledge, bottom } = m;
  let s = rect(x + 4, top + 6, w, bottom - top, p.black, { opacity: 0.2, filter: c.ref('soft') });
  s += rect(x, top, w, bottom - top, p.wood, { rx: 4 }) + rect(x, top, w, bottom - top, c.ref('grain'), { rx: 4 });
  s += rect(x - 8, top - 10, w + 16, 16, p.woodDark, { rx: 4 }) + rect(x - 8, top - 10, w + 16, 4, p.white, { opacity: 0.12, rx: 2 });
  // the sign: a ticket
  const sx = x + w / 2;
  s += rect(sx - 46, top + 14, 92, 32, p.woodDark, { rx: 5 }) + rect(sx - 24, top + 20, 48, 20, p.paper, { rx: 2.5 }) + rect(sx - 24, top + 20, 12, 20, p.red, { rx: 2.5 });
  s += rect(sx - 8, top + 25, 24, 3, p.scribble, { opacity: 0.7 }) + rect(sx - 8, top + 32, 16, 3, p.scribble, { opacity: 0.5 });
  // the window
  const [wx, wy, ww, wh] = [x + 56, top + 58, w - 112, ledge - top - 66];
  s += rect(wx - 7, wy - 7, ww + 14, wh + 14, p.woodDark, { rx: 12 }) + rect(wx, wy, ww, wh, p.officeInside, { rx: 7 });
  if (night) {
    // the blind with its slats and a ring to pull
    s += rect(wx, wy, ww, wh - 14, p.blind, { rx: 7 });
    for (let by = wy + 16; by < wy + wh - 20; by += 16) s += rect(wx, by, ww, 2, p.black, { opacity: 0.18 });
    s += rect(wx, wy + wh - 18, ww, 5, p.woodDark) + rect(wx + ww / 2 - 0.8, wy + wh - 13, 1.6, 8, p.ink) + circle(wx + ww / 2, wy + wh - 3, 3, 'none', { stroke: p.brass, 'stroke-width': 1.6 });
  } else {
    // inside: a shelf of ticket rolls, a calendar; then the brass bars with a hatch at the bottom
    s += rect(wx + 14, wy + 44, ww - 28, 4, p.woodMid);
    for (let i = 0; i < 4; i++) s += rect(wx + 22 + i * 22, wy + 26, 14, 18, [p.red, p.blueLight, p.yellow, p.greenLight][i] as string, { rx: 2 });
    s += rect(wx + ww - 46, wy + 58, 30, 36, p.paper, { rx: 2 }) + rect(wx + ww - 46, wy + 58, 30, 9, p.red, { rx: 2 });
    for (let bx = wx + 14; bx < wx + ww - 6; bx += 16) s += rect(bx, wy, 3, wh, p.brass);
    s += rect(wx, wy + wh * 0.42, ww, 3, p.brassDark) + path(`M${wx + ww / 2 - 26} ${wy + wh} l0 -22 q26 -22 52 0 l0 22Z`, p.officeInside, { stroke: p.brassDark, 'stroke-width': 3 });
  }
  // the ledge on two brackets, the bell
  s += path(`M${x + 44} ${ledge + 10} l0 26 l22 -26Z`, p.woodDark) + path(`M${x + w - 44} ${ledge + 10} l0 26 l-22 -26Z`, p.woodDark);
  s += rect(x + 22, ledge, w - 44, 11, p.woodDark, { rx: 3 }) + rect(x + 22, ledge, w - 44, 3.5, p.white, { opacity: 0.12, rx: 1.5 });
  s += ellipse(m.bell, ledge - 2, 15, 3.4, p.brassDark) + path(`M${m.bell - 12} ${ledge - 3} q0 -14 12 -14 q12 0 12 14Z`, p.brass) + path(`M${m.bell - 12} ${ledge - 3} q0 -14 12 -14 q12 0 12 14Z`, c.ref('round')) + circle(m.bell, ledge - 19, 3, p.brassDark);
  // a panel below with a notice in a frame
  s += rect(x + 30, ledge + 44, w - 60, bottom - ledge - 62, p.woodMid, { rx: 5, opacity: 0.6 }) + rect(x + 30, ledge + 44, w - 60, bottom - ledge - 62, 'none', { rx: 5, stroke: p.woodDark, 'stroke-width': 3 });
  s += rect(sx - 34, ledge + 54, 68, 38, p.paper, { rx: 2, stroke: p.woodDark, 'stroke-width': 3 });
  for (let i = 0; i < 3; i++) s += rect(sx - 24, ledge + 63 + i * 9, 48 - i * 10, 3, p.scribble, { opacity: 0.6 });
  return s;
}
