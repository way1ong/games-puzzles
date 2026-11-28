// Work that would freeze the screen — finding a deal that can be won, looking for a hint — goes in short slices; the
// screen stays responsive in between. Deals are also prepared in advance, when the device is idle, so a new one opens
// at once (docs/solitaire/SPEC.md, "Роздачі").
import { DRAWS, type Draw, type FreeCells, type SpiderSuits } from '../config.ts';
import { winnableSeed, type Task } from '../core/deals.ts';
import { freecellWinnableSeed } from '../core/freecell-deals.ts';
import { spiderChecked, spiderWinnableSeed } from '../core/spider-deals.ts';

/** Work done in one slice, ms: short enough to keep taps and scrolling smooth. */
const SLICE_MS = 12;
/** Positions the solver looks at between two looks at the clock. */
const CHUNK = 400;
/** Deals in advance start this long after the game opens, so opening stays quick, ms. */
const READY_DELAY_MS = 1500;

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

/** Keeps a deal that can be won ready for each way of turning the stock that has none, one after another. */
export function keepReady(has: (draw: Draw) => boolean, keep: (draw: Draw, seed: number) => void): void {
  const next = () => {
    const draw = DRAWS.find((d) => !has(d));
    if (draw === undefined) return;
    runSoon(winnableSeed(randomSeed(), draw), (seed) => {
      // none found (it does not happen in practice): no more work in advance this time
      if (seed === null) return;
      keep(draw, seed);
      next();
    });
  };
  window.setTimeout(next, READY_DELAY_MS);
}

/** Keeps a Spider deal that can be won ready for a number of suits (with four any deal comes at once: none to keep). */
export function keepSpiderReady(suits: SpiderSuits, has: (suits: SpiderSuits) => boolean, keep: (suits: SpiderSuits, seed: number) => void): void {
  if (!spiderChecked(suits) || has(suits)) return;
  window.setTimeout(() => {
    if (has(suits)) return;
    runSoon(spiderWinnableSeed(randomSeed(), suits), (seed) => {
      if (seed !== null) keep(suits, seed);
    });
  }, READY_DELAY_MS);
}

/** Keeps a FreeCell deal that can be won ready for a number of free cells. */
export function keepFreeCellReady(cells: FreeCells, has: (cells: FreeCells) => boolean, keep: (cells: FreeCells, seed: number) => void): void {
  if (has(cells)) return;
  window.setTimeout(() => {
    if (has(cells)) return;
    runSoon(freecellWinnableSeed(randomSeed(), cells), (seed) => {
      if (seed !== null) keep(cells, seed);
    });
  }, READY_DELAY_MS);
}
