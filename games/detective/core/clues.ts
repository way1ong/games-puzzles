// Fair puzzles: all the evidence of a case fits exactly one suspect, and every piece is needed — without
// any one of them more than one suspect would be left (docs/detective/SPEC.md, «Чесна загадка»).
import { fits, type ClueId, type Traits } from './traits.ts';

/** Indexes of the suspects that fit every clue. */
export function fitting(suspects: readonly Traits[], clues: readonly ClueId[]): number[] {
  const out: number[] = [];
  suspects.forEach((traits, i) => {
    if (clues.every((clue) => fits(traits, clue))) out.push(i);
  });
  return out;
}

export interface Fairness {
  /** Suspects that fit all the evidence: a fair case has exactly one. */
  fit: number[];
  /** Evidence the puzzle does not need: without it the same single suspect is left. */
  needless: ClueId[];
}

export function fairness(suspects: readonly Traits[], clues: readonly ClueId[]): Fairness {
  const fit = fitting(suspects, clues);
  const needless = clues.filter((clue) => fitting(suspects, clues.filter((c) => c !== clue)).length <= 1);
  return { fit, needless };
}

export function isFair(suspects: readonly Traits[], clues: readonly ClueId[], culprit: number): boolean {
  const { fit, needless } = fairness(suspects, clues);
  return fit.length === 1 && fit[0] === culprit && needless.length === 0 && new Set(clues).size === clues.length;
}

/** The first clue (in the given order) that does not fit these traits; null — all fit. */
export function firstMismatch(traits: Traits, clues: readonly ClueId[]): ClueId | null {
  return clues.find((clue) => !fits(traits, clue)) ?? null;
}

/** For the solution: every clue with the suspects it fits. */
export function explain(suspects: readonly Traits[], clues: readonly ClueId[]): { clue: ClueId; who: number[] }[] {
  return clues.map((clue) => ({ clue, who: fitting(suspects, [clue]) }));
}
