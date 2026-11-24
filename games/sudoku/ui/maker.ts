// Making puzzles without freezing the screen: the work goes in short slices, the screen stays responsive in
// between. Puzzles of every level are also made in advance, when the device is idle, so a new game opens at
// once (docs/sudoku/SPEC.md, "Скільки головоломок").
import { LEVELS, SUDOKU, type Level } from '../config.ts';
import { puzzleMaker, type Puzzle } from '../core/generate.ts';

/** Work done in one slice, ms: short enough to keep taps and scrolling smooth. */
const SLICE_MS = 12;
/** Puzzles in advance start this long after the game opens, so opening stays quick, ms. */
const READY_DELAY_MS = 1500;

export function randomSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] ?? Date.now() >>> 0;
}

/** Makes the puzzle in slices and hands it over; returns a function that stops the work. */
export function makeSoon(seed: number, level: Level, done: (puzzle: Puzzle) => void): () => void {
  const maker = puzzleMaker(seed, level);
  let stopped = false;
  const run = () => {
    if (stopped) return;
    const until = performance.now() + SLICE_MS;
    for (;;) {
      const r = maker.next();
      if (r.done) {
        done(r.value);
        return;
      }
      if (performance.now() >= until) break;
    }
    window.setTimeout(run, 0);
  };
  window.setTimeout(run, 0);
  return () => {
    stopped = true;
  };
}

/**
 * Keeps puzzles in advance: for every level that has fewer than SUDOKU.readyPerLevel waiting, makes one in
 * the background, one level after another.
 */
export function keepReady(count: (level: Level) => number, keep: (puzzle: Puzzle) => void): void {
  const next = () => {
    const level = LEVELS.find((l) => count(l) < SUDOKU.readyPerLevel);
    if (!level) return;
    makeSoon(randomSeed(), level, (puzzle) => {
      keep(puzzle);
      next();
    });
  };
  window.setTimeout(next, READY_DELAY_MS);
}
