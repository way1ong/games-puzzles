// The café's front window: the striped awning hangs outside over the glass; across the street a house with green
// shutters and flower boxes, a street lamp; a half curtain on a brass rod over the lower panes; the sill. By day the
// sun shines on the house; at night it rains, the lamp and a few windows across the street are lit, water drips
// from the awning.
import type { Ctx } from '../defs.ts';
import { circle, el, ellipse, g, n, path, rect } from '../svg.ts';

export interface CafeWindow {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The frame is this wide round the glass. */
const FRAME = 12;
/** The awning reaches this far down the glass; the half curtain hangs this high over the bottom of the glass. */
const AWNING = 46;
const CURTAIN = 94;

/** Windows of the house across the street: their left edge and top in shares of the glass, lit at night or not. */
const HOUSE_WINDOWS = [[0.08, 0.37, false], [0.08, 0.6, true], [0.62, 0.37, true], [0.62, 0.6, false]] as const;
/** Raindrops on the glass at night, in shares of the glass. */
const DROPS = Array.from({ length: 18 }, (_, i) => [((i * 41) % 97) / 97, 0.2 + (((i * 29) % 83) / 83) * 0.55] as const);

const glass = (m: CafeWindow) => ({ gx: m.x + FRAME, gy: m.y + FRAME, gw: m.w - 2 * FRAME, gh: m.h - 2 * FRAME });

/** The shape that keeps the street inside the glass. */
export function cafeWindowDefs(c: Ctx, m: CafeWindow): string {
  const { gx, gy, gw, gh } = glass(m);
  return el('clipPath', { id: c.id('pane') }, rect(gx, gy, gw, gh, c.p.white));
}

/** The house across the street, the lamp, the weather. */
function street(c: Ctx, m: CafeWindow): string {
  const { p, night } = c;
  const { gx, gy, gw, gh } = glass(m);
  const base = gy + gh;
  let s = rect(gx, gy, gw, gh, c.ref('sky'));
  if (night) {
    s += ellipse(gx + gw * 0.3, gy + 62, 90, 14, p.townFar, { opacity: 0.6 }) + ellipse(gx + gw * 0.75, gy + 56, 70, 12, p.townFar, { opacity: 0.5 });
  } else {
    s += circle(gx + gw - 58, gy + 66, 36, p.sun, { opacity: 0.35, filter: c.ref('soft') }) + circle(gx + gw - 58, gy + 66, 17, p.sun);
    s += ellipse(gx + 70, gy + 62, 30, 9, p.white) + ellipse(gx + 92, gy + 57, 20, 9, p.white) + ellipse(gx + 176, gy + 68, 24, 7, p.white, { opacity: 0.9 });
  }
  // the roof with two chimneys, the cornice, the wall of the house
  const roof = gy + 92;
  s += rect(gx + 40, roof - 30, 16, 22, p.townFar) + rect(gx + gw - 110, roof - 26, 14, 18, p.townFar);
  s += path(`M${gx} ${roof} L${gx} ${roof - 12} L${gx + gw} ${roof - 12} L${gx + gw} ${roof}Z`, p.townFar);
  s += rect(gx, roof, gw, base - roof, p.facade) + rect(gx, roof + 8, gw, 8, p.facadeShade) + rect(gx, roof + 16, gw, 3, p.black, { opacity: 0.12 });
  // windows with shutters, flower boxes under the upper ones
  let slats = '';
  for (const [wx, wy, lit] of HOUSE_WINDOWS) {
    const [x, y] = [n(gx + gw * wx + 14), n(gy + gh * wy)];
    const pane = night && lit ? p.townWindow : p.town;
    s += rect(x - 14, y, 12, 48, p.shutter, { rx: 1.5 }) + rect(x + 36, y, 12, 48, p.shutter, { rx: 1.5 });
    for (const sx of [x - 12, x + 38]) for (let k = 1; k < 6; k++) slats += `M${sx} ${y + k * 8}h8`;
    s += rect(x, y, 34, 48, pane) + rect(x + 16, y, 2, 48, p.facadeShade) + rect(x, y + 20, 34, 2, p.facadeShade) + rect(x - 3, y + 48, 40, 4, p.facadeShade);
    if (night && lit) s += rect(x, y, 34, 48, p.lamp, { opacity: 0.25 });
    if (wy < 0.4) {
      s += rect(x - 2, y + 52, 38, 9, p.terracotta);
      for (let k = 0; k < 6; k++) s += circle(x + 2 + k * 6, y + 51, 3, k % 2 ? p.green : p.red);
    }
  }
  s += path(slats, 'none', { stroke: p.black, 'stroke-width': 1.4, opacity: 0.2 });
  // the street lamp on the left: a post coming up from behind the curtain, the lantern
  const lx = gx + gw * 0.4;
  const ly = gy + gh * 0.5;
  if (night) s += ellipse(lx, ly, 46, 46, c.ref('glow'));
  s += rect(lx - 2, ly + 8, 4, base - ly, p.streetLamp) + path(`M${lx - 9} ${ly + 8} l18 0 l-3 -16 l-12 0Z`, p.streetLamp) + path(`M${lx - 11} ${ly - 8} l22 0 l-11 -8Z`, p.streetLamp);
  s += rect(lx - 5, ly - 6, 10, 12, night ? p.lamp : p.town, { opacity: night ? 1 : 0.8 });
  if (night) {
    let rain = '';
    for (let i = 0; i < 40; i++) rain += `M${gx + ((i * 37) % gw)} ${gy + AWNING + ((i * 53) % (gh - AWNING))}l-4 16`;
    s += path(rain, 'none', { stroke: p.rain, 'stroke-width': 1.2, 'stroke-linecap': 'round', opacity: 0.5 });
  }
  return s;
}

/** The awning outside: its underside going away, the valance hanging in front with round ends. */
function awning(c: Ctx, m: CafeWindow): string {
  const { p, night } = c;
  const { gx, gy, gw } = glass(m);
  const count = 9;
  const sw = gw / count;
  const under = 20;
  let s = '';
  for (let i = 0; i < count; i++) {
    const fill = i % 2 ? p.awningPale : p.awningGreen;
    const [a, b] = [n(gx + i * sw), n(gx + (i + 1) * sw)];
    const far = (x: number) => n(gx + gw / 2 + (x - gx - gw / 2) * 0.82);
    s += path(`M${far(a)} ${gy - 4} L${far(b)} ${gy - 4} L${b} ${gy + under} L${a} ${gy + under}Z`, fill);
    s += rect(a, gy + under, n(b - a), AWNING - under - 8, fill) + ellipse(n((a + b) / 2), gy + AWNING - 8, n(sw / 2), 8, fill);
  }
  s += rect(gx, gy - 4, gw, under + 4, p.black, { opacity: 0.32 }) + rect(gx, gy + under, gw, 3, p.black, { opacity: 0.15 });
  if (night) {
    // water dripping from the round ends
    for (let i = 0; i < count; i++) s += ellipse(n(gx + (i + 0.5) * sw), gy + AWNING + 4 + (i % 3) * 9, 1.6, 2.6, p.rain, { opacity: 0.8 });
  }
  return s;
}

/** The half curtain on its rod over the lower panes. */
function curtain(c: Ctx, m: CafeWindow): string {
  const { p, night } = c;
  const { gx, gy, gw, gh } = glass(m);
  const top = gy + gh - CURTAIN;
  // soft folds, a lace edge under the rod, a hem at the bottom
  let shade = '';
  let shine = '';
  let lace = '';
  for (let x = gx + 6; x < gx + gw; x += 18) {
    shade += `M${x} ${top}h7v${CURTAIN}h-7Z`;
    shine += `M${x + 8} ${top}h3v${CURTAIN}h-3Z`;
  }
  for (let x = gx + 5; x < gx + gw; x += 10) lace += `M${x - 4.4} ${top + 8}a4.4 4.4 0 1 0 8.8 0a4.4 4.4 0 1 0 -8.8 0`;
  let s = rect(gx, top, gw, CURTAIN, p.lace) + path(shade, p.black, { opacity: night ? 0.1 : 0.05 }) + path(shine, p.white, { opacity: 0.25 });
  s += path(lace, 'none', { stroke: p.paperShade, 'stroke-width': 1.2, opacity: 0.8 }) + rect(gx, gy + gh - 6, gw, 6, p.paperShade, { opacity: 0.6 });
  // the brass rod with rings
  let rings = '';
  for (let x = gx + 8; x < gx + gw; x += 22) rings += `M${x - 3} ${top}a3 3 0 1 0 6 0a3 3 0 1 0 -6 0`;
  s += rect(gx - 6, top - 3, gw + 12, 4, p.brass, { rx: 2 }) + circle(gx - 6, top - 1, 4, p.brassDark) + circle(gx + gw + 6, top - 1, 4, p.brassDark);
  return s + path(rings, 'none', { stroke: p.brassDark, 'stroke-width': 1.4 });
}

export function cafeWindow(c: Ctx, m: CafeWindow): string {
  const { p, night } = c;
  const { x, y, w, h } = m;
  const { gx, gy, gw, gh } = glass(m);
  const sill = y + h;
  let s = rect(x - 8, y - 8, w + 16, h + 16, p.woodDark, { rx: 8 }) + rect(x, y, w, h, p.wood, { rx: 6 });
  const drops = night ? DROPS.map(([dx, dy]) => [n(gx + gw * dx), n(gy + gh * dy)] as const).map(([cx, cy]) => circle(cx, cy, 2.2, p.rain, { opacity: 0.5 }) + circle(n(cx - 0.6), n(cy - 0.8), 0.8, p.white, { opacity: 0.7 })) : [];
  s += g({ 'clip-path': c.ref('pane') }, street(c, m) + awning(c, m) + drops.join(''));
  // the glazing bars, a shine on the glass
  s += rect(x + w / 2 - 4, gy, 8, gh, p.wood) + rect(gx, gy + 104, gw, 8, p.wood) + rect(gx, gy + 112, gw, 2, p.black, { opacity: 0.15 });
  s += path(`M${gx + 14} ${gy + 120} l40 0 l-34 84 l-10 0Z`, p.white, { opacity: night ? 0.05 : 0.16 }) + path(`M${gx + gw / 2 + 16} ${gy + 120} l22 0 l-30 74 l-6 0Z`, p.white, { opacity: night ? 0.04 : 0.12 });
  s += curtain(c, m);
  return s + rect(x - 18, sill, w + 36, 14, p.woodMid, { rx: 3 }) + rect(x - 18, sill, w + 36, 3, p.white, { opacity: 0.14, rx: 1.5 }) + rect(x - 18, sill + 10, w + 36, 5, p.black, { opacity: 0.25 });
}
