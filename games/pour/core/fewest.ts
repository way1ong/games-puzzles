// The fewest pours from a deal to the end, counted exactly (decision of 28.11: the player's pours beside the fewest,
// where they can be counted). A* over positions — the order of the bottles does not matter — guided by the colour runs
// above one per colour: a pour merges at most two runs into one, so the guess never says more than is needed and the
// first end reached is the nearest. A position is kept as a short text (a letter a layer), so that many fit in a
// phone's memory; past `limit` positions met the count gives up (null) — then the game shows no fewest. In slices, so
// the screen keeps working. Pure.
import { isSolved, pour, usefulMoves, type Bottles } from './bottles.ts';

/** Work that goes on in slices: `run` looks at no more than `steps` positions, and returns the result once there is one. */
export interface Task<T> {
  run(steps: number): T | undefined;
}

/** Colour runs: layers of one colour lying together in a bottle count as one. */
export function runsOf(bottles: Bottles): number {
  let n = 0;
  for (const b of bottles) for (let i = 0; i < b.length; i++) if (i === 0 || b[i] !== b[i - 1]) n++;
  return n;
}

const LETTER = 97;
/** A position as a short text: a letter a layer from the bottom, the bottles in sorted order. */
const textOf = (bottles: Bottles): string =>
  bottles
    .map((b) => String.fromCharCode(...b.map((c) => LETTER + c)))
    .sort()
    .join('|');
const bottlesOf = (text: string): Bottles => text.split('|').map((s) => Array.from(s, (ch) => ch.charCodeAt(0) - LETTER));

/** The fewest pours from `start` to the end; `limit` — positions met before it gives up (null). */
export function fewestPours(start: Bottles, colours: number, capacity: number, limit: number): Task<number | null> {
  const guess = (b: Bottles) => runsOf(b) - colours;
  // the best pours found to each position met
  const best = new Map<string, number>();
  // the positions to look at, nearest the end first (A*): pours made plus the guess; of two alike, the one with more
  // pours made (it is further along) — a heap in three arrays, which keeps it small
  const fs: number[] = [];
  const gs: number[] = [];
  const texts: string[] = [];
  const before = (i: number, j: number) => fs[i]! < fs[j]! || (fs[i] === fs[j] && gs[i]! > gs[j]!);
  const swap = (i: number, j: number) => {
    [fs[i], fs[j]] = [fs[j]!, fs[i]!];
    [gs[i], gs[j]] = [gs[j]!, gs[i]!];
    [texts[i], texts[j]] = [texts[j]!, texts[i]!];
  };
  const push = (f: number, g: number, text: string) => {
    fs.push(f);
    gs.push(g);
    texts.push(text);
    for (let i = fs.length - 1; i > 0; ) {
      const p = (i - 1) >> 1;
      if (!before(i, p)) break;
      swap(i, p);
      i = p;
    }
  };
  const pop = (): { g: number; text: string } => {
    const top = { g: gs[0]!, text: texts[0]! };
    const last = fs.length - 1;
    swap(0, last);
    fs.pop();
    gs.pop();
    texts.pop();
    for (let i = 0; ; ) {
      const l = 2 * i + 1;
      const r = l + 1;
      let m = i;
      if (l < fs.length && before(l, m)) m = l;
      if (r < fs.length && before(r, m)) m = r;
      if (m === i) break;
      swap(m, i);
      i = m;
    }
    return top;
  };

  const first = textOf(start);
  best.set(first, 0);
  push(guess(start), 0, first);
  let result: number | null | undefined;
  return {
    run(steps) {
      if (result !== undefined) return result;
      for (let k = 0; k < steps; k++) {
        if (!fs.length) return (result = null);
        const { g, text } = pop();
        if (best.get(text)! < g) continue;
        const bottles = bottlesOf(text);
        if (isSolved(bottles, capacity)) return (result = g);
        for (const m of usefulMoves(bottles, capacity)) {
          const next = pour(bottles, m, capacity);
          const key = textOf(next);
          const known = best.get(key);
          if (known !== undefined && known <= g + 1) continue;
          if (known === undefined && best.size >= limit) return (result = null);
          best.set(key, g + 1);
          push(g + 1 + guess(next), g + 1, key);
        }
      }
      return undefined;
    },
  };
}

/** Runs a task to its end at once (tests, and work known to be short). */
export function finishTask<T>(task: Task<T>): T {
  for (;;) {
    const r = task.run(100_000);
    if (r !== undefined) return r;
  }
}
