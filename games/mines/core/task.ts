// Work that goes on in slices (the maker of fields, the hint): `run` spends at most about `steps` units of work and
// returns the result once there is one, so the screen keeps working in between. Pure.

export interface Task<T> {
  run(steps: number): T | undefined;
}

/** Runs a task to its end at once (tests, and work that is known to be short). */
export function finishTask<T>(task: Task<T>): T {
  for (;;) {
    const result = task.run(1_000_000);
    if (result !== undefined) return result;
  }
}
