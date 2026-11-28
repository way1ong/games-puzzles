// What a colour line's numbers force (docs/nonograms/SPEC.md, "Кольорові малюнки"), as line.ts does for black and
// white: given the runs and what each cell may still be — empty or one of the picture's paints — the values each cell
// can take in at least one way the runs can lie. Two runs of the same colour need an empty cell between them; runs of
// different colours may touch. This is how a person reasons along one line; the grid solver (colour-solve.ts)
// repeats it over rows and columns. Pure, no DOM.
import { NO_PAINT, type ColourClue } from './colour-clues.ts';

/**
 * What a cell may still be: a set of values as bits — bit 0 empty, bit 1 the first paint, bit 2 the second… One bit
 * left: the cell is known.
 */
export type Can = number;

export const bitOf = (value: number): Can => 1 << value;

/** Every value a cell of a picture with this many paints can take: empty or any paint. */
export const anyOf = (paints: number): Can => (1 << (paints + 1)) - 1;

/** The value a set holds alone; null — more than one is possible (or none). */
export function onlyValue(can: Can): number | null {
  if (can <= 0 || (can & (can - 1)) !== 0) return null;
  return 31 - Math.clz32(can);
}

/**
 * The line with every cell narrowed to the values it can still take, or null when the runs cannot lie on it at all.
 * Two passes count the ways from the left and from the right: a cell may take a run's colour when that run can cover
 * it, and may be empty when the runs can leave it out.
 */
export function solveColourLine(clue: ColourClue, known: readonly Can[], paints: readonly string[]): Can[] | null {
  const n = known.length;
  const k = clue.length;
  const value = clue.map((r) => paints.indexOf(r.colour) + 1);
  if (value.some((v) => v === NO_PAINT)) return null;
  const length = clue.map((r) => r.length);
  const canEmpty = (i: number) => (known[i]! & 1) !== 0;
  // blocked[v][i] — cells before i that cannot take the value v: the cells [from, to) can all be v when none is blocked
  const blocked = new Map<number, number[]>();
  for (const v of new Set(value)) {
    const counts = new Array<number>(n + 1).fill(0);
    for (let i = 0; i < n; i++) counts[i + 1] = counts[i]! + ((known[i]! >> v) & 1 ? 0 : 1);
    blocked.set(v, counts);
  }
  const fits = (v: number, from: number, to: number) => {
    const counts = blocked.get(v)!;
    return counts[to]! - counts[from]! === 0;
  };

  // pre[j][i]: the cells [0, i) can hold exactly the runs 0..j-1
  const pre = Array.from({ length: k + 1 }, () => new Array<boolean>(n + 1).fill(false));
  pre[0]![0] = true;
  for (let i = 1; i <= n; i++) pre[0]![i] = pre[0]![i - 1]! && canEmpty(i - 1);
  // run j may begin at s: the runs before it fit [0, s), with an empty cell between it and one of its own colour
  const before = (j: number, s: number) => {
    if (j === 0) return pre[0]![s]!;
    if (value[j - 1] === value[j]) return s >= 1 && canEmpty(s - 1) && pre[j]![s - 1]!;
    return pre[j]![s]!;
  };
  for (let j = 1; j <= k; j++) {
    const b = length[j - 1]!;
    for (let i = 1; i <= n; i++) {
      let ok = canEmpty(i - 1) && pre[j]![i - 1]!;
      if (!ok && i >= b && fits(value[j - 1]!, i - b, i)) ok = before(j - 1, i - b);
      pre[j]![i] = ok;
    }
  }
  if (!pre[k]![n]) return null;

  // suf[j][i]: the cells [i, n) can hold exactly the runs j..k-1
  const suf = Array.from({ length: k + 1 }, () => new Array<boolean>(n + 1).fill(false));
  suf[k]![n] = true;
  for (let i = n - 1; i >= 0; i--) suf[k]![i] = suf[k]![i + 1]! && canEmpty(i);
  // run j may end at e: the runs after it fit [e, n), with an empty cell between it and one of its own colour
  const after = (j: number, e: number) => {
    if (j === k - 1) return suf[k]![e]!;
    if (value[j + 1] === value[j]) return e < n && canEmpty(e) && suf[j + 1]![e + 1]!;
    return suf[j + 1]![e]!;
  };
  for (let j = k - 1; j >= 0; j--) {
    const b = length[j]!;
    for (let i = n - 1; i >= 0; i--) {
      let ok = canEmpty(i) && suf[j]![i + 1]!;
      if (!ok && i + b <= n && fits(value[j]!, i, i + b)) ok = after(j, i + b);
      suf[j]![i] = ok;
    }
  }

  const out = new Array<Can>(n).fill(0);
  // a cell left out of every run: the runs before it end before it, the others begin after it
  for (let c = 0; c < n; c++) {
    if (!canEmpty(c)) continue;
    for (let j = 0; j <= k; j++) {
      if (pre[j]![c] && suf[j]![c + 1]) {
        out[c] = out[c]! | 1;
        break;
      }
    }
  }
  // a run j that can lie at [s, s + b)
  for (let j = 0; j < k; j++) {
    const b = length[j]!;
    const bit = bitOf(value[j]!);
    for (let s = 0; s + b <= n; s++) {
      if (!fits(value[j]!, s, s + b) || !before(j, s) || !after(j, s + b)) continue;
      for (let c = s; c < s + b; c++) out[c] = out[c]! | bit;
    }
  }
  return out.some((can) => can === 0) ? null : out;
}
