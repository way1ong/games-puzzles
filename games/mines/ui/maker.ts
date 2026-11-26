// Work that would freeze the screen — making a field without guessing — goes in short slices; the screen stays
// responsive in between (docs/mines/SPEC.md, "Рівні").
import type { Task } from '../core/task.ts';

/** Work done in one slice, ms: short enough to keep taps and scrolling smooth. */
const SLICE_MS = 12;
/** Units of the maker's work between two looks at the clock. */
const CHUNK = 400;

export function randomSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] ?? Date.now() >>> 0;
}

/** Runs a task in slices and hands its result over; returns a function that stops the work. */
export function runSoon<T>(task: Task<T>, done: (result: T) => void): () => void {
  let stopped = false;
  const run = () => {
    if (stopped) return;
    const until = performance.now() + SLICE_MS;
    while (performance.now() < until) {
      const result = task.run(CHUNK);
      if (result !== undefined) {
        done(result);
        return;
      }
    }
    window.setTimeout(run, 0);
  };
  window.setTimeout(run, 0);
  return () => {
    stopped = true;
  };
}
