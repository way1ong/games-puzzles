// The tall arched window to the platform. By day a green carriage stands there under a few clouds; at
// night the platform is empty in the falling snow: a lamp, the rails, the red lamps of the last train.
import type { Ctx } from '../defs.ts';
import { circle, el, ellipse, g, line, path, rect } from '../svg.ts';

export interface ArchedWindow {
  x: number;
  y: number;
  w: number;
  h: number;
}

const arch = (m: ArchedWindow, inset: number): string => {
  const r = m.w / 2 - inset;
  const [left, right, base, spring] = [m.x + inset, m.x + m.w - inset, m.y + m.h, m.y + m.w / 2];
  return `M${left} ${base} L${left} ${spring} A${r} ${r} 0 0 1 ${right} ${spring} L${right} ${base}Z`;
};

/** Where the snowflakes are, as shares of the window. */
const SNOW = Array.from({ length: 34 }, (_, i) => [((i * 37) % 97) / 97, ((i * 53) % 89) / 89, 1.2 + (i % 3) * 0.5] as const);

/** The shape that keeps the platform inside the window. */
export function archedWindowDefs(c: Ctx, m: ArchedWindow): string {
  return el('clipPath', { id: c.id('arch') }, path(arch(m, 12), c.p.white));
}

export function archedWindow(c: Ctx, m: ArchedWindow): string {
  const { p, night } = c;
  const { x, y, w, h } = m;
  const base = y + h;
  const spring = y + w / 2;
  let out = rect(x, y, w, h, c.ref('sky'));
  if (night) {
    for (const [sx, sy, r] of SNOW) out += circle(x + w * sx, y + h * sy, r, p.white, { opacity: 0.8 });
    // the rails run away to the right, where the last train has gone
    out += rect(x, base - 62, w, 62, p.platform) + rect(x, base - 62, w, 5, p.platformEdge);
    out += line(x, base - 84, x + w, base - 96, p.steel, 2, { opacity: 0.6 }) + line(x, base - 74, x + w, base - 90, p.steel, 2, { opacity: 0.6 });
    out += circle(x + w - 34, base - 104, 9, p.pin, { opacity: 0.35, filter: c.ref('soft') }) + circle(x + w - 38, base - 104, 2.6, p.pin) + circle(x + w - 28, base - 105, 2.6, p.pin);
    // the platform lamp
    out += ellipse(x + 62, base - 196, 46, 46, c.ref('glow')) + rect(x + 60, base - 192, 4, 132, p.streetLamp);
    out += path(`M${x + 52} ${base - 194} l20 0 l-4 -10 l-12 0Z`, p.streetLamp) + circle(x + 62, base - 191, 4, p.lamp);
  } else {
    out += ellipse(x + 84, y + 110, 38, 13, p.white) + ellipse(x + 112, y + 102, 26, 12, p.white) + ellipse(x + 196, y + 150, 30, 10, p.white, { opacity: 0.9 });
    // the carriage: roof, body with a pale stripe, three windows with curtains, the running gear
    const top = base - 214;
    out += rect(x - 30, top - 14, w + 60, 22, p.trainRoof, { rx: 10 }) + rect(x - 30, top, w + 60, 150, p.train) + rect(x - 30, top + 92, w + 60, 7, p.trainStripe) + rect(x - 30, top + 138, w + 60, 12, p.trainDark);
    for (let i = 0; i < 3; i++) {
      const wx = x + 26 + i * 82;
      out += rect(wx, top + 18, 56, 58, p.trainDark, { rx: 8 }) + rect(wx + 4, top + 22, 48, 50, p.glass, { rx: 5 });
      out += path(`M${wx + 4} ${top + 22} l18 0 q-4 22 -18 28Z`, p.cream) + path(`M${wx + 52} ${top + 22} l-18 0 q4 22 18 28Z`, p.cream);
    }
    out += rect(x - 30, top + 150, w + 60, 12, p.ironDark) + rect(x, base - 62, w, 62, p.platform) + rect(x, base - 62, w, 5, p.platformEdge);
  }
  let s = path(arch(m, 0), p.woodDark) + path(arch(m, 6), p.wood) + g({ 'clip-path': c.ref('arch') }, out);
  // glazing bars: two uprights, two cross bars and a fan in the arch
  const cx = x + w / 2;
  for (const bx of [x + w / 3, x + (2 * w) / 3]) s += rect(bx - 3, spring, 6, base - spring - 10, p.wood);
  s += rect(x + 10, spring - 3, w - 20, 6, p.wood) + rect(x + 10, spring + (base - spring) / 2 - 3, w - 20, 6, p.wood);
  for (const turn of [-60, -90, -120]) {
    const a = (turn * Math.PI) / 180;
    s += line(cx, spring, cx + Math.cos(a) * (w / 2 - 12), spring + Math.sin(a) * (w / 2 - 12), p.wood, 6, { 'stroke-linecap': 'butt' });
  }
  s += path(`M${x + 26} ${spring + 16} l34 0 l-26 70 l-8 0Z`, p.white, { opacity: night ? 0.05 : 0.16 });
  return s + rect(x - 16, base, w + 32, 14, p.woodMid, { rx: 3 }) + rect(x - 16, base + 10, w + 32, 5, p.black, { opacity: 0.25 });
}
