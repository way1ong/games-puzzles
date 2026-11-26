// What a line's numbers force (docs/nonograms/SPEC.md, "Без вгадування"): given the numbers and what is known of the
// cells, the cells that are filled — or empty — in every way the runs can lie. This is how a person reasons along one
// line; the grid solver (solve.ts) repeats it over rows and columns. Pure, no DOM.
import type { Clue } from './clues.ts';

/** What is known of a cell: not yet, filled, or empty. */
export type Know = 0 | 1 | 2;
export const UNKNOWN = 0;
export const FILLED = 1;
export const EMPTY = 2;

/**
 * The line with every forced cell known, or null when the numbers cannot lie on it at all. Two passes count the
 * ways from the left and from the right; a cell may be filled when some run can cover it, empty when the runs can
 * leave it out.
 */
export function solveLine(clue: Clue, known: readonly Know[]): Know[] | null {
  const n = known.length;
  const k = clue.length;
  const canFill = (i: number) => known[i] !== EMPTY;
  const canEmpty = (i: number) => known[i] !== FILLED;
  // emptyBefore[i] — known empty cells before i: the cells [from, to) can all be filled when none of them is known empty
  const emptyBefore = new Array<number>(n + 1).fill(0);
  for (let i = 0; i < n; i++) emptyBefore[i + 1] = emptyBefore[i]! + (known[i] === EMPTY ? 1 : 0);
  const fillable = (from: number, to: number) => emptyBefore[to]! - emptyBefore[from]! === 0; // cells [from, to)

  // pre[j][i]: the cells [0, i) can hold exactly the runs 0..j-1
  const pre = Array.from({ length: k + 1 }, () => new Array<boolean>(n + 1).fill(false));
  pre[0]![0] = true;
  for (let i = 1; i <= n; i++) pre[0]![i] = pre[0]![i - 1]! && canEmpty(i - 1);
  for (let j = 1; j <= k; j++) {
    const b = clue[j - 1]!;
    for (let i = 1; i <= n; i++) {
      let ok = canEmpty(i - 1) && pre[j]![i - 1]!;
      if (!ok && i >= b && fillable(i - b, i)) {
        const start = i - b;
        ok = start === 0 ? j === 1 : canEmpty(start - 1) && pre[j - 1]![start - 1]!;
      }
      pre[j]![i] = ok;
    }
  }
  if (!pre[k]![n]) return null;

  // suf[j][i]: the cells [i, n) can hold exactly the runs j..k-1
  const suf = Array.from({ length: k + 1 }, () => new Array<boolean>(n + 1).fill(false));
  suf[k]![n] = true;
  for (let i = n - 1; i >= 0; i--) suf[k]![i] = suf[k]![i + 1]! && canEmpty(i);
  for (let j = k - 1; j >= 0; j--) {
    const b = clue[j]!;
    for (let i = n - 1; i >= 0; i--) {
      let ok = canEmpty(i) && suf[j]![i + 1]!;
      if (!ok && i + b <= n && fillable(i, i + b)) {
        const end = i + b;
        ok = end === n ? j === k - 1 : canEmpty(end) && suf[j + 1]![end + 1]!;
      }
      suf[j]![i] = ok;
    }
  }

  const mayFill = new Array<boolean>(n).fill(false);
  const mayEmpty = new Array<boolean>(n).fill(false);
  // a cell left out of every run: the runs before it end before it, the others begin after it
  for (let c = 0; c < n; c++) {
    if (!canEmpty(c)) continue;
    for (let j = 0; j <= k && !mayEmpty[c]; j++) if (pre[j]![c] && suf[j]![c + 1]) mayEmpty[c] = true;
  }
  // a run j that can lie at [s, s + b)
  for (let j = 0; j < k; j++) {
    const b = clue[j]!;
    for (let s = 0; s + b <= n; s++) {
      if (!fillable(s, s + b)) continue;
      const before = s === 0 ? j === 0 : canEmpty(s - 1) && pre[j]![s - 1]!;
      if (!before) continue;
      const end = s + b;
      const after = end === n ? j === k - 1 : canEmpty(end) && suf[j + 1]![end + 1]!;
      if (!after) continue;
      for (let c = s; c < end; c++) mayFill[c] = true;
    }
  }

  const out: Know[] = [];
  for (let c = 0; c < n; c++) {
    if (!mayFill[c] && !mayEmpty[c]) return null;
    out.push(mayFill[c] && mayEmpty[c] ? known[c]! : mayFill[c] ? FILLED : EMPTY);
  }
  return out;
}
